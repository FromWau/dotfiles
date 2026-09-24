# Publishing libraries and plugins

Rules for builds that publish artifacts, worked out on a multi-module KMP library and the Gradle plugin its builds
use. Each rule closes one way of shipping something a consumer cannot reproduce.

## One version, one commit, one release

Version every module of a library together and publish them together. A consumer pins one number, and every module
in a release depends on its siblings at that same version. Between modules, use project dependencies:

```kotlin
// io/build.gradle.kts, or commonMain.dependencies { } in a KMP module
dependencies { api(project(":core")) }
```

The POM and the Gradle module metadata then record `core` at the build's version, which is exactly the `core` that
`:io` was compiled against, since both come from the same commit in the same run.

That holds only while a version names one commit. Publish `io` 0.2.0 after `core` 0.2.0 was released from an older
commit, and `io` ships built against code no consumer can resolve. They get the released `core` under the same
version, with different code. The break surfaces later, in the consumer, as a `NoSuchMethodError` or a quiet
behaviour change. So the publish tasks refuse to run unless HEAD carries the release tag and nothing is uncommitted:

```kotlin
// in the publishing convention
val releaseTag = "v$version"
val headTags = providers.exec {
    commandLine("git", "tag", "--points-at", "HEAD")
    isIgnoreExitValue = true
}.standardOutput.asText
val uncommitted = providers.exec {
    commandLine("git", "status", "--porcelain")
    isIgnoreExitValue = true
}.standardOutput.asText

tasks.withType<PublishToMavenRepository>().configureEach {
    // Copied into the task: a doFirst reading these from the script holds a script reference, which the
    // configuration cache cannot serialize.
    val tag = releaseTag
    val tags = headTags
    val dirty = uncommitted

    doFirst {
        require(tag in tags.get().lines()) { "Publishing $tag needs HEAD tagged $tag." }
        require(dirty.get().isBlank()) { "Publishing needs a clean checkout. Commit or stash everything first." }
    }
}
```

A release is then: bump the version, commit, tag `v<version>`, run `./gradlew publish`. A tag names one commit, so
publishing the same version again, whole or in part, builds the same code. Publishing to the local Maven repository
is a different task type and stays unguarded.

A module added later starts at the current version, the way kotlinx.coroutines and Ktor add modules. The number
says which release a module belongs to, not how old the module is.

Two ways out of project dependencies both fail. Pinning siblings to their last release (`api("com.example:core:0.2.0")`)
breaks the lockstep, since `io` 0.3.0 then depends on `core` 0.2.0. Depending on `com.example:core:$version` from the
repository cannot even compile during development, since `core` 0.3.0 does not exist until it is released.

## One publishing convention for every module

Coordinates, POM, license, publishing repository, credentials and the tag guard live in one convention plugin in
`build-logic`, say `<project>-publish`. Every published module applies it, directly or through a platform
convention such as `<project>-module` (the KMP targets plus `<project>-publish`). A module then declares only its
`description`.

**Group names.** A project that publishes one artifact takes the flat group: `com.example:mytool`. A project that
publishes a family of modules takes a group of its own, `com.example.mylib:core`, because module names inside a
family are generic. `com.example:core` reads wrong and collides with the next project that needs a core. Both
shapes share one repository, so a content filter over them has to include subgroups, and so does the plugin
marker's group (see the plugin section below). Coordinates are permanent once published, so this is worth settling
before the first release rather than stranding versions under an abandoned group later.

When a build mixes kinds of modules, wire what differs with `pluginManager.withPlugin`, so the convention does not
depend on plugin order:

```kotlin
pluginManager.withPlugin("org.jetbrains.kotlin.multiplatform") {
    extensions.configure<KotlinMultiplatformExtension> {
        sourceSets.commonMain { resources.srcDir(licenseResources) }
    }
}
```

Before a release, `./gradlew publish --dry-run` lists one `publish<Publication>PublicationTo<Repo>Repository` task
per publication. Every module has to appear in it.

**Explicit credentials switch the configuration cache off.** A repository configured with
`credentials { username = ...; password = ... }` makes every run that includes its publish task skip the
configuration cache, reported as `Explicit credentials are unsupported with the Configuration Cache`. Gradle's own
lookup, `credentials(PasswordCredentials::class)`, keeps the cache, but it reads only the Gradle properties
`<repo>Username` and `<repo>Password`, never a `.env`. Keeping credentials in `.env` therefore costs one uncached
configuration per release, while every other build keeps the cache.

That blocker also hides every other configuration-cache problem in those tasks, since Gradle stops at the first
one. Check them separately, by removing the `credentials` block in a clone and running the publish task with
`--dry-run`: whatever it reports then is what a later switch to Gradle's credential lookup would have to fix
first, because Gradle 9 fails the build on configuration-cache problems rather than warning.

## A Gradle plugin that builds use lives in its own repo

A build cannot apply a plugin that one of its own modules builds, because plugins resolve before any project
compiles. Every way around that inside one repo costs something:

- An `includeBuild` of the plugin is invisible to the root's `build` and `publish`, so it needs publishing code and
  root hooks of its own.
- A plugin module applied from its last release needs a version outside the lockstep, a local copy before its first
  release, and hand-set Kotlin settings, since `kotlin-dsl` warns when the build's Kotlin Gradle plugin is newer
  than Gradle's own.

A plugin that several repos use, such as one that reads `.env` for their credentials, gets a repo of its own:

- It builds with plain `kotlin-dsl`, where Gradle's Kotlin is the only one around, and versions on its own.
- Every other build applies its release like any third-party plugin, with the version in the catalog next to AGP
  and Kotlin.
- Its own build cannot apply the version it compiles. Its first release reads what it needs, such as its
  publishing credentials, by hand. From then on the build applies its own last release, pinned in its catalog,
  with the release repository in `pluginManagement` under `includeGroupAndSubgroups`, because applying by id
  resolves the plugin marker, whose group is the plugin id (`com.example.myplugin`), not the artifact's group.
- `publishToMavenLocal` works there, so a change can be tried in a consuming build before the release.

Applied from a convention plugin, the plugin's repository has to be declared twice:

- In `build-logic/settings.gradle.kts`, under `dependencyResolutionManagement`, to compile the conventions.
- In the root `settings.gradle.kts`, under `pluginManagement.repositories`. Every project's buildscript classpath
  pulls `build-logic`'s external dependencies from there. Without it, configuration fails with
  `Could not find com.example:myplugin:0.1.0` and `Required by: buildscript of project ':io' > project ':build-logic'`.

**Trying an unreleased plugin.** A consuming build cannot configure until the plugin version it names exists. Keep
`mavenLocal()` out of its committed settings: it holds whatever was last published locally under a version, the
same-version-different-code problem the tag guard prevents. Bridge with an init script instead. Run
`./gradlew publishToMavenLocal -Dmaven.repo.local=/tmp/m2` in the plugin's repo, then build the consumer with
`--init-script bootstrap.init.gradle.kts -Dmaven.repo.local=/tmp/m2`:

```kotlin
// bootstrap.init.gradle.kts
beforeSettings {
    // A build that declares no plugin repositories gets the portal by default; adding one here would remove it.
    pluginManagement.repositories.gradlePluginPortal()
    pluginManagement.repositories.mavenLocal()
    dependencyResolutionManagement.repositories.mavenLocal()
}
```

**Load `build-logic` once, in the root project.** Otherwise each module that applies a convention plugin loads
`build-logic`, and the Kotlin Gradle plugin it carries, into a classloader of its own. The Kotlin plugin then warns
that it `was loaded multiple times in different subprojects, which is not supported and may break the build`. Its
own advice is to load it in the root project with `apply false`, and any one of the conventions does that for the
whole `build-logic` classpath:

```kotlin
// root build.gradle.kts
plugins {
    id("<project>-publish") apply false
}
```

**If a plugin module has to stay inside a build with a newer Kotlin plugin**, build it with the Kotlin JVM plugin
and `java-gradle-plugin` instead of `kotlin-dsl`, and set the two things it needs from `kotlin-dsl` by hand:
classes compiled for Gradle's Kotlin level, and no Kotlin standard library in its published metadata, since Gradle
supplies its own.

```kotlin
// myplugin/build.gradle.kts
plugins {
    id("org.jetbrains.kotlin.jvm")   // no version: the root project already loaded it
    `java-gradle-plugin`
}

kotlin {
    // Gradle loads plugins with its own Kotlin, so compile for the level kotlin-dsl targets under Gradle 9.
    compilerOptions {
        apiVersion = KotlinVersion.KOTLIN_2_2
        languageVersion = KotlinVersion.KOTLIN_2_2
    }
}

dependencies {
    compileOnly(kotlin("stdlib"))
}
```

```properties
# myplugin/gradle.properties, which applies to this module only
kotlin.stdlib.default.dependency=false
```

`build/publications/pluginMaven/module.json` then lists no dependencies, and `javap -v` on a plugin class shows
`mv=[2,2,0]`, the same as `kotlin-dsl` produces.
