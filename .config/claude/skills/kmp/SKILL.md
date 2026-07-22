---
name: kmp
description: Kotlin Multiplatform **project-structure** tier — how a KMP module is laid out and where platform code goes. Source-set hierarchy (flat dirs, the logical `commonMain`/`androidMain`/`iosMain`/`appleMain`/`nativeMain`/`linuxMain`/`mingwMain` tree), the naming-by-target-breadth convention, union compilation + the one-`actual`-per-path rule, and how to split `nativeMain` when adding a native target (`references/source-set-hierarchy.md`). Load whenever the work involves KMP targets or source sets — adding a `linuxX64`/`mingwX64`/`macos*` target, splitting `nativeMain`, deciding which source set an `expect`/`actual` belongs in, or "where does this platform implementation go" — even when the user doesn't name the skill. Pair with `android` (Android/Gradle build + platform APIs), `kotlin` (language idioms, including `expect`/`actual` mechanics), and `compose` (Compose Multiplatform UI). For the Gradle/AGP toolchain and Android platform APIs, load `android`; for building the shared UI, `compose`.
---

# Kotlin Multiplatform Structure

The **project-structure tier**: how a KMP module's source sets and targets are organised, and where each platform's code lives. Companions to load alongside this one:
- **`android`** — the Gradle/AGP toolchain and Android platform APIs the `androidMain` set builds against.
- **`kotlin`** — Kotlin-language idioms, including `expect`/`actual` mechanics and the `Result<D, E>` type.
- **`compose`** — Compose Multiplatform UI that lives in `commonMain`.

## When to read references

- **`references/source-set-hierarchy.md`** — KMP source-set layout (flat dirs, logical hierarchy), the naming-by-target-breadth convention, union-compilation + the one-`actual`-per-path rule, how to split `nativeMain` when adding a native target, and how to add a custom intermediate source set (e.g. a `jvmAndroidMain` sharing an `actual` across jvm+android) without the manual-`dependsOn` trap that disables the default hierarchy template. Read when adding a native target, splitting `nativeMain`, creating a custom intermediate/shared source set, or deciding which source set a platform `actual` goes in.

## Source sets & targets

- KMP source sets form a **logical hierarchy** by target breadth: `commonMain` → intermediate sets (`appleMain`, `nativeMain`) → leaf targets (`androidMain`, `iosMain`, `linuxMain`, `mingwMain`). An `expect` declared in a broader set is satisfied by an `actual` in each narrower set that compiles it.
- **One `actual` per compilation path**: union compilation means a given target sees exactly one `actual` for each `expect`. Placing an `actual` too high (in a set more targets compile) collides; placing it too low leaves an `expect` unsatisfied. Put each `actual` in the *broadest* source set that is correct for all targets under it.
- **Adding a native target** (e.g. `linuxX64`, `mingwX64`, `macosArm64`) often means introducing or splitting an intermediate set like `nativeMain` so shared native code has a home. See `references/source-set-hierarchy.md` for the split recipe.
