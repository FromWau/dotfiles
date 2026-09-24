# Error catalog

Symptom, cause, fix. The cause line is the useful part: it lets you recognize
variants of the same problem that word themselves differently.

## Editor and runtime

### `No loader found for resource: res://…/Player.kt (expected type: Script)`

Followed by `Parse Error: [ext_resource] referenced non-existent resource`.

**Cause.** The GDExtension has never been loaded in this project, so nothing
provides a script loader for `.kt`. Common when running the game in a checkout
that has not been opened in the editor yet, and after adding the addon.

**Fix.** Open the project in the editor once, or
`godot --headless --editor --quit`. Then `.godot/extension_list.cfg` names
`res://addons/jvm/jvm.gdextension`. If the file is still missing, the addon is
not at `addons/jvm/jvm.gdextension` or Godot is older than the manifest's
`compatibility_minimum`.

### The script is attached, but nothing happens and nothing is logged

**Cause.** The file declares more than one `@Script` class. Godot associates
the file with the **first** one, so the node silently gets a class that has no
`_ready` of its own. No error is printed, which is what makes this expensive.

**Fix.** One attachable `@Script` class per file. Move payload classes, helper
`RefCounted` types and sealed leaves into their own files.

### `NullPointerException` at a `connectLambda` line in `_ready`

**Cause.** The signal's declared payload type has no Variant converter.
`connectLambda` resolves converters eagerly at connect time, so the crash
lands on the connect line rather than on an emit. The usual culprit is a bare
interface, including a `sealed interface` whose leaves are all registered: the
build check accepts it, the runtime cannot convert it.

**Fix.** Type the signal on a registered `@Script` class, an engine class such
as `RefCounted`, or a primitive, and cast when you receive it. Or connect with
`connectMethod(target, Class::handler)`, which converts at call time instead.

### Godot uses a different JDK than the shell does

**Cause.** Resolution order is `--jvm-path`, then an embedded
`jvm/jre-<arch>-<os>`, then `JAVA_HOME`, then `java` on `PATH`. A stale
`JAVA_HOME` or a leftover embedded JRE beats the `java` you just installed.

**Fix.** Update `JAVA_HOME` rather than `PATH`, delete the embedded JRE if it
is stale, or force one run with `--jvm-path=/usr/lib/jvm/temurin-17`.

### The JVM does not start when the game is launched from the macOS Dock

**Cause.** GUI-launched macOS apps do not inherit environment variables set in
`.bashrc` or `.zshrc`, so a `JAVA_HOME` set there is invisible to them.

**Fix.** `launchctl setenv JAVA_HOME <path-to-jdk>`.

### `You really should embed a JRE in your project with jlink!`

**Cause.** No `jvm/jre-<arch>-<os>` directory. A warning, not an error: the
game runs, but an exported build would need a JDK on the player's machine.

**Fix.** `./gradlew generateEmbeddedJre`.

### Memory grows without bound, `RefCounted` instances never freed

**Cause.** `disable_gc` in `godot_jvm_configuration.json`, or
`--jvm-disable-gc`. With the binding's collector off, `RefCounted` and native
types are never collected. This is documented behavior, not a leak.

**Fix.** Re-enable it.

### Code runs but nothing appears in the editor's Output panel

**Cause.** `println` and `System.out.println` write only to the terminal that
launched Godot.

**Fix.** `godot.global.GD.print` (and `GD.printErr`, `GD.pushWarning`,
`GD.pushError`) write to both.

## Build and registration

### `Registered signal parameter cannot use unrelated JVM class X`

Failing task: `:registrarGenerationGenerateFiles`, wrapped in
`ChecksFailedException: Some checks failed`.

**Cause.** A signal parameter type Godot cannot carry, typically a `data
class` or another plain JVM type.

**Fix.** Use a primitive, a core type, an engine class, or one of your
registered `@Script` classes as the parameter type. The real message is
printed *above* the `ChecksFailedException`, so read the log rather than the
exception line.

### `ChecksFailedException` with no obvious message

**Cause.** Any registration check failed. The individual failures are logged
before the exception.

**Fix.** Scroll up to the lines above `> Task :registrarGenerationGenerateFiles
FAILED`, or rerun with `--info`.

### The build fails on duplicate registered class names

**Cause.** Two classes register under the same Godot name. Godot has no
namespaces for scripts, so package differences do not help.

**Fix.** Rename one, give one `@Script("UniqueName")`, or switch
`registration.nameMode` to `FQ_NAME` or `PROJECT_PREFIX`.

### A class, property, function or signal is missing after a successful build

**Cause.** It was not selected by the current registration mode. Check the
generated registrar to see what the build actually produced:
`build/generated/registrar-generation/main/kotlin/godot/registrar/<Class>Registrar.kt`.

Then walk the relevant list:

- **Class**: does it extend a Godot API class, is the file extension `.kt`,
  `.java` or `.scala`, is `@Script` present (Inferred and Explicit modes need
  it), does its name collide?
- **Property**: is the field or accessor public, is the type mappable to
  Godot, do field and accessors line up as one logical property, was it
  registered as a function instead because of `@Register`?
- **Function**: is it public and declared on the class rather than only
  inherited, are all parameter and return types mappable, is it non-generic,
  does it exceed 16 parameters, is it accessor-shaped and therefore treated as
  a property?
- **Signal**: is it a `SignalN` member, does it have a direct `@Emit` in
  Explicit mode, is its class registered at all?

### The IDE and the build disagree about what is registered

**Cause.** IntelliJ's **Settings | Godot-JVM | Annotation processing mode**
differs from `registration.annotationProcessingMode` in `build.gradle.kts`.

**Fix.** Make them match. Gradle is the authority; the IDE setting only drives
inspections.

### A change does not take effect after `fastBuild`

**Cause.** `fastBuild` reuses the previous registration scan and only rebuilds
`main.jar`. Structural changes are invisible to it.

**Fix.** Run `./gradlew build` after adding, removing, renaming or otherwise
changing a registered class, property, signal or Godot-callable function.

### `Could not create child process: …/gradlew`

**Cause.** `gradlew` lost its executable bit, which happens with projects
created from the IntelliJ template. Hits editor-triggered builds and the
`buildAndroid`, `buildIOS` and `buildGraalNativeImage` tasks.

**Fix.** `chmod +x gradlew`.

### The Godot editor cannot find the Gradle wrapper

**Cause.** The editor only looks inside the Godot project directory, and the
wrapper lives in a parent directory of a larger repository.

**Fix.** Set the wrapper path in Godot's project settings, and point the
plugin at the Godot root with `godotProjectDirectory.set(file(".."))`.

## Export

### An exported desktop build does not start

**Cause.** The embedded JRE does not match the target: exports copy the JRE
generated on the exporting host, and a macOS or amd64 JRE will not run
elsewhere.

**Fix.** Export each desktop platform from a host running it, after generating
a JRE there. A universal macOS build needs both an amd64 and an arm64 JRE.

### Android export fails on a missing AAR

**Cause.** `addons/jvm/libs/android/{debug,release}/godot-jvm-*.aar` is
missing; Godot pulls it from the addon during export.

**Fix.** Reinstall a complete addon release.

### The game breaks on the second launch after clearing save data

**Cause.** The exported game copies `godot-bootstrap.jar` and `main.jar` from
`res://` into `user://` on first launch (on Android, into `files/` as
`godot-bootstrap-dex.jar` and `main-dex.jar`). Code that wipes `user://`
wholesale deletes the runtime.

**Fix.** Delete only files your game created, and exclude the runtime jars
from any bulk clear, including in an uninstaller.

### A GraalVM native-image build ignores code changes

**Cause.** Native image is compiled ahead of time; reloading would mean
restarting the JVM. Documented limitation.

**Fix.** Iterate on the normal JVM and use native image only for release
builds.
