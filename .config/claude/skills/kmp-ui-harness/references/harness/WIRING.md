# Wiring the harness into a KMP project

This directory holds the **complete, working** harness source (16 files under
`commonMain/jvmMain/androidMain/nativeMain/`, plus an optional `jvmTest/`). Drop them into a
Compose-Multiplatform UI module and add the build glue below. The code is taken verbatim from a
working project, so it compiles as-is once you fix the package and a couple of names.

Why source, not a binary dependency: the harness reaches version-specific Compose/skiko internals
(`ComposeWindow.semanticsOwners` — experimental; `SkiaLayer.screenshot()` — skiko-version-specific;
`AndroidComposeView.getSemanticsOwner` — internal, via reflection). Built from source it tracks the
consumer's exact Compose version; a pinned binary would drift and break. Keep it in-tree.

## What goes where

Place each file under `<uiModule>/src/<sourceSet>/kotlin/<your-package-path>/debug/`:

| Source set | Files |
|---|---|
| commonMain | `Build.kt`, `Harness.kt`, `HarnessSeams.kt`, `HarnessControl.kt`, `HarnessDump.kt`, `UiNode.kt` |
| jvmMain | `HarnessSeams.jvm.kt`, `Harness.jvm.kt`, `ControlServer.kt`, `Screenshot.kt` |
| androidMain | `HarnessSeams.android.kt`, `ControlServer.kt`, `Harness.android.kt` |
| nativeMain | `Build.native.kt`, `Harness.native.kt`, `HarnessSeams.native.kt` |
| jvmTest (optional) | `UiNodeJsonTest.kt` |

The three platform seams are `harnessSemanticsRoots()`, `harnessRunOnUiThread{}`,
`harnessScreenshotPng()` (expects in `HarnessSeams.kt`; actuals per source set). All layout/input
logic is common and built only on those, so adding a target = implement the three actuals + a
control-server transport. `nativeMain` is a no-op (keeps iOS compiling).

## Per-project adaptation (the only things you must change)

1. **Package.** Every file uses `package com.fromwau.echo.shared_client.debug`. Replace
   `com.fromwau.echo.shared_client` with your UI module's package throughout (the files, and the
   path in step 4's `GenerateBuildFlags`).
2. **Gradle property name.** The release gate uses `echo.release`. Rename to `<yourapp>.release` if
   you like (update both build scripts).
3. **Desktop main class.** `runHarness` and the entrypoints reference your desktop `MainKt`.
4. **Release leak-check entry.** `assertHarnessStripped` greps for `/debug/ControlServer`; fine as-is.

## Step-by-step

### 1. Split the root composable (no business-logic change)

Rename your existing `App()` to `AppContent()` and add a thin wrapper. Entry points keep calling
`App()`, so they're untouched — every target inherits the harness.

```kotlin
@Composable
fun App() {
    if (Build.DEBUG) Harness { AppContent() } else AppContent()
}

@Composable
fun AppContent(/* ...your existing App() params/body... */) { /* unchanged */ }
```

### 2. Dependencies (UI module `build.gradle.kts`)

Add the ktor **server** (the control server) to both JVM and Android. The harness reads input via
Compose semantics and screenshots via Skiko — no extra deps for those (skiko comes with Compose
Desktop; `PixelCopy` is Android framework).

```kotlin
kotlin {
    sourceSets {
        jvmMain.dependencies {
            implementation(libs.ktor.server.core)   // io.ktor:ktor-server-core
            implementation(libs.ktor.server.cio)    // io.ktor:ktor-server-cio
        }
        androidMain.dependencies {
            implementation(libs.ktor.server.core)
            implementation(libs.ktor.server.cio)
        }
    }
}
```

Android also needs `<uses-permission android:name="android.permission.INTERNET"/>` to bind the
control socket (most apps already have it). Drive Android over `adb forward tcp:6699 tcp:6699`.

### 3. Generate `Build.DEBUG` for jvm + android

`Build.kt` (commonMain) is `expect object Build { val DEBUG }`; `Build.native.kt` is the `false`
actual. The jvm/android actuals are **generated** so release strips the harness. Use an abstract
task with `Property` inputs — a `doLast {}` closure that captures the script breaks the
configuration cache.

```kotlin
// top of build.gradle.kts
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction

// Build.DEBUG generation. Default DEBUG=true; release strips via -P<app>.release=true.
abstract class GenerateBuildFlags : DefaultTask() {
    @get:Input abstract val target: Property<String>
    @get:Input abstract val debug: Property<Boolean>
    @get:OutputDirectory abstract val outputDir: DirectoryProperty

    @TaskAction
    fun generate() {
        val t = target.get()
        // <-- adjust this package path to match your module
        val file = outputDir.get().file("com/fromwau/echo/shared_client/debug/Build.$t.kt").asFile
        file.parentFile.mkdirs()
        file.writeText(
            """
            |package com.fromwau.echo.shared_client.debug
            |
            |actual object Build {
            |    actual val DEBUG: Boolean = ${debug.get()}
            |}
            |""".trimMargin(),
        )
    }
}

val echoRelease = providers.gradleProperty("echo.release").map { it.toBoolean() }.orElse(false)

fun registerBuildFlagGen(target: String) =
    tasks.register<GenerateBuildFlags>("generate${target.replaceFirstChar { it.uppercase() }}BuildFlags") {
        this.target.set(target)
        debug.set(echoRelease.map { !it })
        outputDir.set(layout.buildDirectory.dir("generated/buildflags/$target"))
    }

kotlin.sourceSets.named("jvmMain") { kotlin.srcDir(registerBuildFlagGen("jvm")) }
kotlin.sourceSets.named("androidMain") { kotlin.srcDir(registerBuildFlagGen("android")) }
```

Because `Build.DEBUG` is a compile-time `const`, a release build (`-Pecho.release=true`) folds
`App()` to just `AppContent()`, and R8/proguard drops `Harness`/`ControlServer` + ktor-server.

### 4. `runHarness` task (desktop app `build.gradle.kts`)

Runs the desktop app against a throwaway XDG sandbox so driving never touches real user data.

```kotlin
tasks.register<JavaExec>("runHarness") {
    group = "application"
    description = "Run desktopApp against a sandboxed data dir for UI-harness driving."
    dependsOn("compileKotlin")
    mainClass.set("com.fromwau.echo.desktop_app.MainKt")   // <-- your desktop main
    classpath = sourceSets["main"].runtimeClasspath
    val sandbox = layout.buildDirectory.dir("harness-sandbox").get().asFile
    sandbox.resolve("data").mkdirs()
    sandbox.resolve("config").mkdirs()
    environment("XDG_DATA_HOME", sandbox.resolve("data").absolutePath)
    environment("XDG_CONFIG_HOME", sandbox.resolve("config").absolutePath)
    jvmArgs("--enable-native-access=ALL-UNNAMED", "-Dskiko.renderApi=SOFTWARE_FAST")
}
```

### 5. Release leak-check (optional but recommended)

Fails the build if `ControlServer` leaks into the release distributable.

```kotlin
import java.util.zip.ZipFile
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.TaskAction

abstract class AssertHarnessStripped : DefaultTask() {
    @get:Internal abstract val binariesDir: DirectoryProperty

    @TaskAction
    fun check() {
        val jars = binariesDir.get().asFile.walkTopDown().filter { it.extension == "jar" }.toList()
        val leaked = jars.filter { jar ->
            ZipFile(jar).use { z -> z.entries().asSequence().any { it.name.contains("/debug/ControlServer") } }
        }
        require(leaked.isEmpty()) { "Harness ControlServer leaked into release distributable: $leaked" }
        logger.lifecycle("Harness stripped: scanned ${jars.size} release jars, no ControlServer present.")
    }
}

tasks.register<AssertHarnessStripped>("assertHarnessStripped") {
    dependsOn("createReleaseDistributable")
    binariesDir.set(layout.buildDirectory.dir("compose/binaries"))
}
```

## Verify

1. `./gradlew :<uiModule>:compileKotlinJvm` and `:compileAndroidMain` — both green.
2. `./gradlew :<desktopApp>:runHarness` (background), then
   `curl -s --retry-connrefused --retry 120 --retry-delay 1 http://127.0.0.1:6699/layout` — returns the
   semantics tree. `POST /tap "cx,cy"` on a nav item, re-read `/layout` → new screen.
3. Release inert: `runHarness -P<app>.release=true` starts the app but no control server (port 6699
   refused, no "control server" log line).

The control API and driving loop are documented in the parent `SKILL.md`.
