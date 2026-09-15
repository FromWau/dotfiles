---
name: gradle
description: Gradle build best practices — the official "golden path" (authored by Gradle + JetBrains + Google) for structuring and configuring Gradle builds in any Kotlin/JVM/Android/KMP project. Headline set: use the **Kotlin DSL** (`build.gradle.kts`), stay on the **latest Gradle patch**, apply plugins via the **`plugins {}` block** (never the `buildscript` classpath), don't declare the **Kotlin stdlib** dependency, centralize versions in a **version catalog** (`gradle/libs.versions.toml`), declare **repositories in `settings.gradle.kts`** with `RepositoriesMode.FAIL_ON_PROJECT_REPOS`, **modularize** the build, extract shared config into **convention plugins** in a `build-logic` included build (favour it over `buildSrc`), enable the **configuration cache + build cache**, and **validate the Gradle wrapper** in CI. Load whenever running `./gradlew` or writing, reviewing, or refactoring Gradle build files — `build.gradle.kts`, `settings.gradle.kts`, `libs.versions.toml`, `gradle.properties`, convention/precompiled-script plugins, `buildSrc`/`build-logic`, config-cache/build-cache setup, dependency/repository declarations — or when asked "is my Gradle build set up right / how should I structure this build", even when the skill isn't named. Also load for anything that gets published, such as `maven-publish` setup, POMs, release repositories, versioning, tagging and releasing a library, dependencies between the modules of a published library, and a Gradle plugin that several builds share. Companion to `android` (AGP + daemon-JDK toolchain specifics), `kotlin` (language idioms), and `kmp` (multiplatform source-set structure). For the Android Gradle Plugin toolchain and daemon-JDK setup specifically, load `android`.
---

# Gradle Best Practices

The **build-tool tier**: the official Gradle "golden path". These are not opinions — Gradle, JetBrains, and Google co-authored 30+ documented best practices; IntelliJ IDEA 2026.1 ships the first batch as inspections + quick-fixes. This skill captures the headline set with the exact config, and `references/extended-practices.md` holds the fuller catalog and authoritative links. Companions:
- **`android`** — the Android Gradle Plugin toolchain and the daemon-JDK split (`jvmToolchain` vs `updateDaemonJvm`). Load it for AGP-specific build work.
- **`kotlin`** — Kotlin-language idioms for build logic written in the Kotlin DSL.
- **`kmp`** — multiplatform source-set/target structure that these build files wire up.

When applying these to an existing build, log friction and fix incrementally — don't rewrite a working build wholesale.

## Read every warning in full

Read each warning `./gradlew` prints from its first line to its last, then either fix it or show with evidence why
it is harmless. A multi-line warning often opens with a mild headline and says what matters further down. The
`kotlin-dsl` warning starts with `Unsupported Kotlin plugin version`, and about ten lines later adds that the Kotlin
Gradle plugin `was loaded multiple times in different subprojects, which is not supported and may break the build`.
A `grep WARNING`, `head` or `tail` keeps only the headline, and the build looks clean when it is not.

- Save the whole output (`./gradlew build > build.log 2>&1`) and drop only the task progress lines with
  `grep -v '^> Task ' build.log`. Read everything that is left: warnings, `w:` compiler lines and test output.
- Add `--warning-mode all` when checking a build, since by default Gradle folds its deprecations into one summary
  line.
- `BUILD SUCCESSFUL` with warnings nobody read is not a clean build.

## The golden path

### 1. Use the Kotlin DSL
`build.gradle.kts` / `settings.gradle.kts`, not Groovy. Strict typing gives real IDE completion, navigation, and refactoring. The two dialects are close enough that migration is mechanical.

### 2. Stay on the latest Gradle patch
Update the wrapper, don't chase majors blindly:
```bash
./gradlew wrapper --gradle-version latest   # or a specific x.y.z
```
Patches carry performance, stability, and security fixes and never break within a minor — Gradle is strict about that (file an issue if a minor breaks you). Adopt a new major deliberately once its deprecation warnings are cleared.

### 3. Apply plugins with the `plugins {}` block
```kotlin
plugins {
    id("org.jetbrains.kotlin.jvm") version "2.1.0"
}
```
Never the legacy `buildscript { classpath(...) }` + `apply(plugin = ...)`. The `plugins` block lets Gradle manage plugin loading and, with the Kotlin DSL, generates type-safe extension accessors.

### 4. Don't declare the Kotlin stdlib dependency
The Kotlin Gradle Plugin adds the matching `stdlib` to every source set automatically. Declaring it yourself invites version drift. Omit it — unless you must pin a stdlib for a different Kotlin version.

### 5. Centralize versions in a version catalog
Put coordinates in `gradle/libs.versions.toml`:
```toml
[versions]
kotlin = "2.1.0"
[libraries]
kotlinx-coroutines = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "kotlin" }
```
One place for Renovate/Dependabot to bump; type-safe `libs.kotlinx.coroutines` accessors in build scripts. Prefer the single-GAV string form for inline deps: `implementation("group:artifact:1.0")`.

### 6. Declare repositories in `settings.gradle.kts`
```kotlin
dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories { mavenCentral() }
}
```
One source of truth for repositories; `FAIL_ON_PROJECT_REPOS` makes a subproject that declares its own repository fail the build, so nothing silently pulls from a stray snapshot repo. For multiple repos, add content filtering so each artifact resolves from the right one (see `references/extended-practices.md`).

### 7. Modularize the build
Split source into multiple projects (modules) from the start — API vs impl, feature/vertical slices, core vs UI. Modules unlock parallel execution and fine-grained work avoidance/incremental compilation. Hundreds of modules are normal and fine; one-or-two-class modules are counterproductive. Keep the **root project source-free** — it holds config and conventions only.

### 8. Extract shared config into convention plugins
Don't copy-paste the same `kotlin { jvmToolchain(21) }` / language-version block across every module. Put shared logic in a convention plugin inside a **`build-logic` included build** (favour it over `buildSrc` — cleaner mental model, fewer invalidations, cache-friendly):
```kotlin
// root settings.gradle.kts
includeBuild("build-logic")
```
Then `plugins { id("myproject.kotlin-conventions") }` in each module.

When the conventions bring the Kotlin Gradle plugin, also declare one of them in the root build script with
`apply false`, so `build-logic` loads once for every module. Loaded per module, the Kotlin plugin ends up in several
classloaders and warns that it was loaded multiple times, which it does not support.

### 9. Turn on the configuration cache and build cache
```properties
# gradle.properties
org.gradle.caching=true
org.gradle.configuration-cache=true
```
Build cache reuses task outputs across builds (huge with a remote cache); configuration cache skips the configuration phase entirely on reuse. Config cache is the preferred mode — Gradle aims to make it the default in Gradle 10, and `gradle init` already enables it for new projects. If a task misbehaves under the build cache, disable caching for that task rather than switching the whole thing off. Note: `afterEvaluate` is incompatible with the config cache — avoid it.

### 10. Validate the Gradle wrapper in CI
The wrapper JAR is a checked-in binary; a tampered one runs arbitrary code. Modern GitHub setup validates it automatically:
```yaml
- uses: gradle/actions/setup-gradle@v4   # validates the wrapper on every run
```
If you don't use `setup-gradle`, add `gradle/actions/wrapper-validation` explicitly. Essential for public repos; still cheap insurance for internal ones.

## Publishing

Anything that gets published follows three rules. Read **`references/publishing.md`** for the config, the checks
and the traps before touching `maven-publish`, a release, or dependencies between published modules.
- All modules share **one version, released together from one tagged commit**, with project dependencies between
  them. A guard refuses to publish unless HEAD carries the tag `v<version>` and the checkout is clean.
- **One publishing convention** in `build-logic` covers every module, so a module declares only its `description`.
- A **Gradle plugin that builds use lives in its own repo**, and every build applies its release like any other
  plugin.

## Beyond the ten

The official corpus has 30+ practices (naming the root project, single-GAV notation, repository content filtering, avoiding empty intermediate projects, setting build flags in `gradle.properties` not on the CLI, avoiding `afterEvaluate` and internal APIs, UTF-8 encoding, the `-bin` distribution). For those, the grouped catalog, and the authoritative doc links, read **`references/extended-practices.md`**.
