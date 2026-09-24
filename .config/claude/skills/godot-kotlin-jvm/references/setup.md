# Setup: a Godot-JVM project from scratch

Every step below was run end to end on Arch Linux with the official Godot
`4.7.2.stable` package and addon/plugin `1.0.0-dev3`. Substitute the current
version everywhere `1.0.0-dev3` appears, and keep the addon zip and the Gradle
plugin on the *same* version.

## 1. Check the prerequisites

```bash
godot --version          # must be 4.7.2 or newer, an official build
java -version            # 17+
javac -version           # 17+ (a JDK, not just a JRE)
```

Godot finds the JVM through `JAVA_HOME` first, then `java` on `PATH`. An
embedded JRE in the project beats both, and `--jvm-path=<jdk home>` on the
command line beats everything.

## 2. Install the addon

```bash
cd /path/to/godot-project
curl -LO https://github.com/utopia-rise/godot-jvm/releases/download/1.0.0-dev3/godot-jvm-addon-1.0.0-dev3.zip
unzip -q godot-jvm-addon-1.0.0-dev3.zip     # the archive already starts with addons/
```

The manifest must land at `addons/jvm/jvm.gdextension`. The zip also carries
native libraries for Linux, Windows, macOS, Android and iOS, about 36MB
unpacked. Commit them: a clone without them cannot run the game.

## 3. Let Godot register the extension

Open the project in the editor once, or headless:

```bash
godot --headless --editor --quit
```

Confirm `.godot/extension_list.cfg` now contains
`res://addons/jvm/jvm.gdextension` (the editor's
`Project > Project Settings > GDExtension` tab shows the same thing).

Skipping this step produces a misleading error later:
`No loader found for resource: res://src/main/kotlin/Player.kt (expected
type: Script)`. Nothing is wrong with the script; the extension that provides
the JVM script loader has simply never been loaded in this project.

## 4. Gradle files

`gradle/libs.versions.toml`:

```toml
[versions]
kotlin = "2.4.0"
godot-jvm = "1.0.0-dev3"

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
godot-jvm = { id = "com.utopia-rise.godot-jvm", version.ref = "godot-jvm" }
```

`settings.gradle.kts`:

```kotlin
rootProject.name = "my-game"
```

`build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.godot.jvm)
}

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(17)
}

godot {
    isGodotCoroutinesEnabled.set(true)
}
```

`gradle.properties`, the settings upstream recommends:

```properties
org.gradle.parallel=true
org.gradle.configuration-cache=true
org.gradle.caching=true
```

The configuration cache works with this plugin; a build stores an entry
normally. Then create the wrapper:

```bash
gradle wrapper --gradle-version=9.0.0
chmod +x gradlew          # the IntelliJ template is known to lose this bit
```

Declaring `kotlin("jvm")` yourself is expected here, unlike the old module
line where the binding brought Kotlin along transitively.

## 5. First script

`src/main/kotlin/Hello.kt`, one `@Script` class in the file:

```kotlin
import godot.annotation.Script
import godot.api.Node2D
import godot.global.GD

@Script
class Hello : Node2D() {
    override fun _ready() {
        GD.print("hello from kotlin")
    }
}
```

`_ready` needs no annotation: in the default Inferred mode a recognized Godot
override is selected on its own.

```bash
./gradlew build
```

This produces `jvm/main.jar` and `jvm/godot-bootstrap.jar`, and writes
`.gdignore` files into `build/` and `gradle/` so the Godot editor does not try
to import build artifacts. No `.gdj` file appears for your own classes; those
are generated only for registered classes coming from dependencies.

To confirm what was registered, read the generated registrar:

```bash
cat build/generated/registrar-generation/main/kotlin/godot/registrar/HelloRegistrar.kt
```

It lists the constructor, functions, properties and signals that Godot will
see, which is the fastest way to check whether a declaration was selected.

## 6. Attach and run

In the editor, drag the `.kt` from the FileSystem dock onto the node, or use
Inspector → Script → Load. In the scene file it is an ordinary script
resource:

```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://src/main/kotlin/Hello.kt" id="1_hello"]

[node name="Main" type="Node2D"]
script = ExtResource("1_hello")
```

Headless check, useful in a terminal-only loop:

```bash
godot --headless --path . --quit-after 120
```

Expected output:

```
Godot-JVM: You are running on desktop. VM automatically set to JVM
hello from kotlin
```

## 7. Embedded JRE

```bash
./gradlew generateEmbeddedJre
```

Writes `jvm/jre-<arch>-<os>` (about 43MB for the default
`java.base,java.logging` module set) and silences the
`You really should embed a JRE in your project with jlink!` warning. It needs
no configuration: `javaHome` defaults to `JAVA_HOME` and falls back to the JVM
running Gradle.

Customize it when you need more modules, for example remote debugging:

```kotlin
tasks.withType<GenerateEmbeddedJreTask> {
    javaHome = System.getenv("JAVA_HOME")
    arguments = arrayOf("--strip-debug", "--no-header-files", "--no-man-pages")
}
```

Add `jdk.jdwp.agent` for a remote debugger and `jdk.management.agent` for JMX.

## 8. Export

- **Desktop.** The JRE is platform specific and gets copied into the export,
  so export each desktop platform from a host running it, with a JRE generated
  there. A universal macOS build needs both an amd64 and an arm64 JRE.
- **Android and iOS** need no embedded JRE. Android uses the AARs shipped in
  the addon; a missing
  `addons/jvm/libs/android/{debug,release}/godot-jvm-*.aar` means an
  incomplete addon install.
- **GraalVM native image** compiles ahead of time, so nothing reloads while it
  is in use. Develop on the normal JVM and switch to native image for release
  builds only.
- The exported game copies `godot-bootstrap.jar` and `main.jar` from `res://`
  into `user://` on first launch. Do not let your own IO code clear `user://`
  wholesale, or the next launch breaks.

## 9. Runtime configuration

`godot_jvm_configuration.json` sits at the project root and is rewritten by
the binding when missing or outdated. Every key has a `--jvm-*` command-line
twin, and the command line wins.

```json
{
    "version": "2.0",
    "vm_type": "auto",
    "use_debug": false,
    "debug_port": 5005,
    "debug_address": "*",
    "wait_for_debugger": true,
    "jmx_port": -1,
    "max_string_size": -1,
    "disable_gc": false,
    "custom_jvm_args": []
}
```

Worth knowing:

- `vm_type` `auto` resolves to `jvm` on desktop, `art` on Android and
  `graal_native_image` on iOS.
- `use_debug` plus `wait_for_debugger` suspend startup until a debugger
  attaches on `debug_port`, which needs `jdk.jdwp.agent` in the embedded JRE.
- `disable_gc` turns off the binding's own collector, and then `RefCounted`
  and native types leak by design. Leave it alone unless you are measuring
  something specific.
- `custom_jvm_args` takes ordinary JVM flags, for example `["-Xmx4g"]`.

## 10. .gitignore

```gitignore
# Godot
.godot/
/android/

# Gradle / Kotlin
.gradle
build
.kotlin

# Godot-JVM build output: jars and the jlink'd JRE, all regenerated by the build.
# addons/jvm/ is committed on purpose, the game needs those native libs at runtime.
/jvm/
```
