# build.gradle.kts DSL by plugin version

The godot-kotlin-jvm plugin renamed several properties between `0.14.x` and
`0.16.x`. Copy from the right column for the user's Godot fork version.

## DSL rename table

| 0.13.x / 0.14.x (Godot 4.4.x / 4.5.x) | 0.16.x (Godot 4.6.x) |
|---|---|
| `registrationFileBaseDir` | `registrationFilesDirectory` |
| `isRegistrationFileGenerationEnabled` | (removed — implicit; generation always on) |
| `isRegistrationFileHierarchyEnabled` (bool) | `registrationFilesLayoutMode` (enum: `HIERARCHICAL` / `FLAT`) |
| `isFqNameRegistrationEnabled` (bool) | `registrationNameMode` (enum: `SIMPLE_NAME` / `FQ_NAME` / `PROJECT_PREFIX`) |
| (single language, Kotlin only) | `languages.set(setOf(GodotLanguage.KOTLIN, ...))` |
| `isAndroidExportEnabled` (bool) + `d8ToolPath` + `androidCompileSdkDir` | (removed — replaced by `d8ToolPath` / `androidCompileSdkDirectory` / `androidMinApiLevel`) |
| `isGraalNativeImageExportEnabled` | `graalVmHomeDirectory` (path-based; null disables) |
| `classPrefix` / `projectName` (library mode) | `isLibrary` + `registrationNameMode` |

When in doubt, fetch the matching project-template tag:
<https://github.com/utopia-rise/godot-kotlin-project-template/tags>
(Note: only some plugin versions have a corresponding template tag — fall
back to the closest older one for DSL shape.)

## Template: plugin 0.14.3-4.5.1 (Godot fork 4.5.1)

**`gradle/libs.versions.toml`**
```toml
[versions]
godot-kotlin-jvm = "0.14.3-4.5.1"
kotlinx-datetime = "0.6.2"
jdk = "17"

[libraries]
kotlinx-datetime = { module = "org.jetbrains.kotlinx:kotlinx-datetime", version.ref = "kotlinx-datetime" }

[plugins]
godot-kotlin-jvm = { id = "com.utopia-rise.godot-kotlin-jvm", version.ref = "godot-kotlin-jvm" }
```

**`build.gradle.kts`**
```kotlin
plugins {
    alias(libs.plugins.godot.kotlin.jvm)
}

repositories {
    mavenCentral()
}

dependencies {
    // Older plugin pins Kotlin 2.0.x; use kotlinx-datetime if you need
    // Instant / Clock (kotlin.time.* was stabilized in 2.1+ and is missing).
    implementation(libs.kotlinx.datetime)
}

val jdkVersion = libs.versions.jdk.get().toInt()

kotlin {
    jvmToolchain(jdkVersion)
}

godot {
    // Where .gdj registration files are written. Convention: scripts/
    registrationFileBaseDir.set(projectDir.resolve("scripts"))

    // Required in this version (defaults vary).
    isRegistrationFileGenerationEnabled.set(true)

    // Optional: flatten output regardless of package
    // isRegistrationFileHierarchyEnabled.set(false)

    // Optional: register classes by fully-qualified name to avoid collisions
    // isFqNameRegistrationEnabled.set(false)
}

// Required for `./gradlew generateEmbeddedJre` — javaHome is a String,
// not a Property<T>, so use `=` not `.set(...)`.
val javaToolchains = extensions.getByType<JavaToolchainService>()
val jdkLauncher = javaToolchains.launcherFor {
    languageVersion.set(JavaLanguageVersion.of(jdkVersion))
}

tasks.named<godot.gradle.tasks.GenerateEmbeddedJreTask>("generateEmbeddedJre") {
    javaHome = jdkLauncher.get().metadata.installationPath.asFile.absolutePath
}
```

## Template: plugin 0.16.1-4.6.3 (Godot fork 4.6.3)

**`gradle/libs.versions.toml`**
```toml
[versions]
godot-kotlin-jvm = "0.16.1-4.6.3"
jdk = "17"

[plugins]
godot-kotlin-jvm = { id = "com.utopia-rise.godot-kotlin-jvm", version.ref = "godot-kotlin-jvm" }
```

**`build.gradle.kts`**
```kotlin
import godot.entrygenerator.settings.RegistrationFileLayoutMode
import godot.gradle.GodotLanguage

plugins {
    alias(libs.plugins.godot.kotlin.jvm)
}

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(libs.versions.jdk.get().toInt())
}

godot {
    languages.set(setOf(GodotLanguage.KOTLIN))

    registrationFilesDirectory.set(projectDir.resolve("scripts"))
    registrationFilesLayoutMode.set(RegistrationFileLayoutMode.HIERARCHICAL)

    // Optional knobs:
    // javaVersion.set(17)
    // kotlinVersion.set("2.2.0")
    // isGodotCoroutinesEnabled.set(true)
}
```

The `0.16.x` plugin removed `isRegistrationFileGenerationEnabled` — `.gdj`
generation is always on when the plugin is applied.

## `settings.gradle.kts` (any version)

```kotlin
plugins {
    // The version catalog is NOT available inside settings.gradle.kts's
    // plugins block (the catalog is *defined* during settings evaluation —
    // chicken/egg). foojay-resolver's version stays inline here. Every
    // other version goes in libs.versions.toml.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
rootProject.name = "my-game"
```

The `foojay-resolver-convention` plugin enables Gradle to auto-download a
matching JDK when `kotlin { jvmToolchain(N) }` is set, on any machine. This
is the key piece that makes the build portable — without it, `jvmToolchain`
relies on whatever JDK is already installed and discoverable.

## `gradle.properties` (any version)

```properties
kotlin.code.style=official
```

Keep it minimal. Do **not** add `org.gradle.java.home=/path/to/jdk` — that
hardcodes a developer-machine path and breaks for collaborators. Let the
toolchain mechanism handle JDK selection.

## `mise.toml` (developer convenience, optional)

```toml
[tools]
java = "temurin-17"
```

Useful so `mise install` provisions JDK 17 for the developer's shell. Note
that this only affects the CLI shell — Gradle's *internal* JDK selection
goes through the toolchain mechanism in `settings.gradle.kts`, not mise.

## Gradle wrapper version compatibility

| Plugin | Tested Gradle wrapper | Notes |
|---|---|---|
| `0.13.x` / `0.14.x` | 8.10 — 9.3 | Gradle 9 emits deprecation warnings but works |
| `0.16.x` | 8.10+ | Latest template uses Gradle 8.x; 9.x untested in template |

If `./gradlew help` fails with `Plugin requires Gradle X` or
`NoSuchMethodError: org.gradle.*`, downgrade `gradle-wrapper.properties`
`distributionUrl` to a `8.10.x` build.
