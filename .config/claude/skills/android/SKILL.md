---
name: android
description: Android platform + build/toolchain tier. Gradle/AGP workflow (`./gradlew build` vs `clean build`), the **JDK toolchain** split that trips people up — `jvmToolchain(N)` governs compilation but AGP artifact transforms run on the *daemon* JDK, fixed via `./gradlew updateDaemonJvm --jvm-version=N` (commit `gradle/gradle-daemon-jvm.properties`) — launching app run profiles from `.run/*.xml`, and platform persistence/permissions: DataStore Preferences with KeyStore encryption, Room, and KMP permissions via Moko (`references/persistence-and-platform.md`). Load whenever the work touches `build.gradle.kts`, `settings.gradle.kts`, AGP, `gradlew`, `jvmToolchain`, the daemon JDK, `AndroidManifest.xml`, DataStore, Room, KeyStore, or runtime permissions — even when the user doesn't name the skill. Pair with `kmp` (multiplatform source-set/target structure), `kotlin` (language idioms), `compose` (UI), and `mvi` (presentation architecture). For KMP source sets, targets, and `expect`/`actual` placement, load `kmp`; for pure Kotlin build-logic idioms, `kotlin`; for general Gradle best practices (version catalogs, convention plugins, config cache, repositories), load `gradle`.
---

# Android Platform & Build

The **platform + build tier**: the Android/Gradle toolchain and platform-capability APIs (persistence, permissions). Companions to load alongside this one:
- **`kmp`** — multiplatform project structure (source sets, targets, `expect`/`actual`) when the module is KMP.
- **`kotlin`** — Kotlin-language idioms for build logic and platform code.
- **`compose`** / **`mvi`** — the UI and presentation tiers the app is built from.
- **`gradle`** — general Gradle build best practices (Kotlin DSL, version catalogs, convention plugins, config/build cache, wrapper validation). This skill keeps only the *Android-specific* toolchain bits below; everything build-general lives there.

Launch applications: first check for `.run/*.xml` configs — these are used by Android Studio to run a profile.

## Gradle & Toolchain

- Use `./gradlew build` for normal validation — validates all targets and test compilation
- Use `./gradlew clean build` only after major refactors or big feature changes — not needed for small fixes
- **JDK toolchain**: Use `jvmToolchain(N)` on the Kotlin extension in root `build.gradle.kts` for compilation. Use `org.gradle.toolchains.foojay-resolver-convention` in `settings.gradle.kts` for auto-provisioning.
- **Daemon JDK**: `jvmToolchain()` only affects compilation tasks. AGP's `JdkImageTransform` (and other artifact transforms) run inside the Gradle daemon and use the daemon's JDK, not the toolchain. To control the daemon JDK, run `./gradlew updateDaemonJvm --jvm-version=N` — this generates `gradle/gradle-daemon-jvm.properties` with Foojay download URLs for all platforms. Commit this file. Without it, the daemon uses the system JDK, which may be incompatible with AGP.

## When to read references

- **`references/persistence-and-platform.md`** — DataStore Preferences with KeyStore encryption, Room, KMP permissions via Moko. Read when persisting data or handling permissions. (Kotlin/JVM file I/O and `inline`/`value class` live in the `kotlin` skill.)
