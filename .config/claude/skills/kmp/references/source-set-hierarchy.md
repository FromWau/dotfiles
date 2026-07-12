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
