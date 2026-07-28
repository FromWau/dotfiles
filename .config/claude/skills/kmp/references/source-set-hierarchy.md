# KMP Source Sets: Hierarchy, Naming & Scoping

Read when adding a native target, splitting `nativeMain`, or deciding which source set an `actual`
belongs in.

## Flat dirs, logical hierarchy

Source sets are **flat sibling directories** under `src/` — not nested. The parent/child graph
(`nativeMain` ⊃ `appleMain` ⊃ `iosMain`) is a logical dependency the plugin wires via the default
hierarchy template (auto-applied since Kotlin 1.9.20). There is **no** `src/nativeMain/appleMain/`.
Use the reserved template names exactly (`nativeMain`, `appleMain`, `iosMain`, `linuxMain`,
`mingwMain`, `macosMain`, …); inventing intermediate names needs a custom hierarchy.

## Name by the breadth of targets THIS CODE serves (per file, not per module)

| Code applies to… | Source set | Suffix |
| --- | --- | --- |
| everything incl. JVM/Android | `commonMain` | `.kt` (expect) |
| all native (apple + linux + mingw) | `nativeMain` | `.native.kt` |
| apple family only | `appleMain` | `.apple.kt` |
| ios only | `iosMain` | `.ios.kt` |
| linux only | `linuxMain` | `.linux.kt` |
| windows only | `mingwMain` | `.mingw.kt` |

A module targeting apple + linux uses `appleMain`, `linuxMain`, **and** `nativeMain` at once — choose
per file. An apple-only module still puts Apple code in `appleMain`, not `nativeMain`: that keeps
`nativeMain` reserved for genuinely cross-native code, so adding a linux/mingw target later breaks
nothing. Keep the file suffix in step with the source set.

## Each target compiles the UNION of its path

```
linuxX64  →  commonMain + nativeMain + linuxMain
iosArm64  →  commonMain + nativeMain + appleMain + iosMain
```

So `nativeMain/Env.native.kt` compiles into every native target, while `linuxMain/File.linux.kt` hits
only linux — a linux target gets **both** its `linuxMain` and the shared `nativeMain` code.

**One-actual rule:** provide each `expect`'s `actual` in exactly one source set on a given target's
path. Split per-platform (`File` → `appleMain` + `linuxMain`, disjoint ✅) **or** share it
(`Env` → `nativeMain` ✅) — never both, or a target sees two actuals → "expect has multiple actuals".

## `@JvmName` in `commonMain` beats an expect/actual split for JVM overload clashes

A tempting-but-wrong reason to reach for `expect`/`actual`: overloaded top-level functions that differ
only in generic type arguments (receiver/parameter nullability, or `List<Int>` vs `List<Long>`) collide
on the JVM after type erasure (the "platform declaration clash"). `@JvmName` gives them distinct JVM
names and fixes it. Assuming `@JvmName` is JVM-source-set-only, you might declare each overload `expect`
in `commonMain` with an `actual` in every platform set (the JVM one carrying `@JvmName`, the rest plain):
one expect plus N actuals plus extra files, per overload. That whole split is unnecessary.

`@JvmName` is resolvable in `commonMain`. Annotate the plain common function directly: it takes effect on
the JVM and is inert on other backends, so a single function replaces the split.

```kotlin
// commonMain, no expect/actual
import kotlin.jvm.JvmName

fun <T : Any> Opt<T?>.default(value: T): Opt<T> { … }        // JVM name: default

@JvmName("defaultNullable")
fun <T : Any> Opt<T?>.default(value: T?): Opt<T?> { … }      // same JVM descriptor after erasure; @JvmName disambiguates
```

**Availability is per-annotation, so check before assuming.** `@JvmName` is in the common stdlib
(verified on Kotlin 2.x). `@JvmInline`, by contrast, is **not** available in common and needs a
per-platform no-op stub (kotlinx.coroutines #4671). Rule of thumb: reserve `expect`/`actual` for
genuinely divergent *implementations*; for a JVM-only name or metadata annotation, try it in `commonMain`
first and split only if the compiler actually rejects it.

## Adding a custom intermediate source set (jvm + android, etc.)

The default template only creates the **standard** groups (`nativeMain`, `appleMain`, `iosMain`, …). A
pair like **jvm + android** has no template group, so to share one `actual` between just those two
(their JDK-backed `File` / `SystemEnv` / `PathStatus` are often identical) you create the intermediate
yourself:

```kotlin
kotlin {
    // declare targets first (jvm(), your android target, linuxX64(), …)

    applyDefaultHierarchyTemplate()   // REQUIRED once you add any manual dependsOn (see below)

    sourceSets {
        val jvmAndroidMain by creating { dependsOn(commonMain.get()) }
        jvmMain.get().dependsOn(jvmAndroidMain)
        androidMain.get().dependsOn(jvmAndroidMain)
    }
}
```

**The trap:** the moment you write **any** manual `dependsOn()`, KGP stops auto-applying the default
template. It is all-or-nothing (one manual edge and KGP assumes you have taken over the whole hierarchy,
so it backs off entirely), which silently un-wires `nativeMain` / `appleMain` / `linuxMain` from
`commonMain`. The native targets then fail with `Expected <x> has no actual declaration for Native` on
**every** commonMain `expect`, including ones you never touched, plus a `Default Kotlin Hierarchy
Template was not applied` warning. The error lands far from the cause (a jvm+android edit breaks the
linux compile), which is what makes it baffling.

**Fix:** call `applyDefaultHierarchyTemplate()` explicitly, then add your manual edges. The template
rebuilds the standard groups and your custom edge layers on top (a source set may `dependsOn` several
parents, so the `commonMain` and `jvmAndroidMain` edges coexist).

Custom sets are not reserved names, so pick a clear one and keep the file suffix in step
(`jvmAndroidMain` → `*.jvmAndroid.kt`). A test source set is only compiled by a target that owns that
test compilation, so a shared `jvmAndroidTest` needs android host tests enabled (`withHostTest {}`) or
android feeds it nothing. The declarative alternative (define your own group so KGP auto-creates and
wires it, no manual edges) needs the custom-hierarchy-template API (`applyHierarchyTemplate {}`), which
JetBrains still labels in-development and subject to change: until it stabilises, the explicit-call +
manual-edges pattern above is the stable way.

## Adding a native target to an apple-only module

Its `nativeMain` must now compile for the new target too, so Foundation/Darwin code there breaks.
Don't blanket-rename — **split**, letting the compiler point out what:

1. Add the target (`linuxX64()`); run `compileKotlin<Target>`. Every unresolved reference is a file
   that must leave `nativeMain`.
2. Foundation/Darwin files (`NSFileManager`, `NSLog`, `ktor-client-darwin`) → `appleMain` (move the
   Apple-only deps too). POSIX / truly cross-native files (`platform.posix.*`, `Room.databaseBuilder`)
   stay in `nativeMain`. Platform actuals → `linuxMain` / `mingwMain`.

Gotcha: native `runDebugExecutable<Target>` has no `--args` (that's a `JavaExec` option) — run the
`.kexe` directly, or use the JVM target's `jvmRun --args`.
