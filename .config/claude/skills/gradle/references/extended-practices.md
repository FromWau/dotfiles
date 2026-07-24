# Extended Gradle Best Practices

The SKILL.md golden path is the headline subset of Gradle's official, co-authored (Gradle + JetBrains + Google) best-practices corpus — 30+ practices, first batch shipped as IntelliJ IDEA 2026.1 inspections. This file groups the rest by the official documentation page they live on, with exact config.

## Authoritative sources

- General — <https://docs.gradle.org/current/userguide/best_practices_general.html>
- Dependencies — <https://docs.gradle.org/current/userguide/best_practices_dependencies.html>
- Structuring builds — <https://docs.gradle.org/current/userguide/best_practices_structuring_builds.html>
- Performance — <https://docs.gradle.org/current/userguide/best_practices_performance.html>
- Overview blog — <https://blog.gradle.org/gradle-best-practices>

Prefer these over any transcript/blog paraphrase — they are versioned with Gradle and kept current.

## General

- **Set build flags in `gradle.properties`, not on the CLI.** Permanent settings (e.g. `org.gradle.continue=true`) belong in the root `gradle.properties` so every environment and CI agent behaves identically.
- **Name your root project.** `rootProject.name = "my-project"` in `settings.gradle.kts` — otherwise the build depends on the checkout directory name.
- **Don't assume plugin application order.** Use `pluginManager.withPlugin("id") { … }` to react to another plugin instead of assuming it was applied first; order across multi-project builds is deterministic but opaque.
- **Don't use internal APIs.** Anything in an `internal` package or with an `Internal`/`Impl` suffix can break in any release, including patches.
- **Avoid `afterEvaluate`.** It defeats task-configuration avoidance and is incompatible with the configuration cache. Reach for lazy `Property<T>` / `Provider<T>` wiring and `pluginManager.withPlugin` instead.

## Dependencies

- **Single-GAV string notation.** `implementation("com.example:library:1.0")` over the named-argument form — more concise and the ecosystem norm.
- **Version-catalog naming.** Dashes separate segments; internal dashes become camelCase in accessors (`jackson-databind` → `libs.jackson.databind`; `springBootStarterWeb`).
- **Repository content filtering.** With more than one repository, pin which artifacts come from where so resolution is fast and unambiguous:
  ```kotlin
  repositories {
      google { content { includeGroupByRegex("androidx.*") } }
      mavenCentral()
  }
  ```
  Use `exclusiveContent { … }` when a repo is the *only* source for a group.
- **No redundant declarations.** Don't declare the same dependency in multiple configurations — it causes hard-to-diagnose classpath issues.
- **Apply exclusions narrowly.** Exclude a transitive on the individual dependency, not the whole configuration:
  ```kotlin
  implementation("org.example:lib:1.0") { exclude(group = "cglib") }
  ```

## Structuring builds

- **Keep the root project source-free.** It holds global config/conventions; don't apply source plugins like `java-library` to it.
- **Favour a `build-logic` included build over `buildSrc`.** Included builds behave like external dependencies: simpler mental model, fewer task invalidations, independently openable/publishable, build-cache friendly. Wire with `includeBuild("build-logic")` in root `settings.gradle.kts`.
- **Avoid empty intermediate projects.** `include(":subs:web:my-module")` silently creates empty `:subs` and `:subs:web` projects. Use a flat name + explicit dir instead:
  ```kotlin
  include(":my-module")
  project(":my-module").projectDir = file("subs/web/my-module")
  ```
- **Convention plugins over duplication.** Encapsulate shared build logic in a convention plugin (quicker to write than a typed binary plugin), place it in `build-logic`, and apply by custom plugin id. Compose several small conventions rather than one monolith.

## Performance

- **`org.gradle.caching=true`** — build cache: reuse task outputs whose inputs are unchanged. Most impactful with a remote cache shared across the team/CI.
- **`org.gradle.configuration-cache=true`** — configuration cache: reuse the configuration phase. Preferred mode; Gradle aims to default it in Gradle 10.
- **Keep the configuration phase cheap.** No file/network I/O or heavy compute at configuration time — move it into task actions so it runs only when needed.
- **`org.gradle.jvmargs=-Dfile.encoding=UTF-8`** — consistent encoding across platforms; prevents cache misses from encoding differences.
- **Prefer the `-bin` Gradle distribution** over `-all` in the wrapper — smaller download, less verification, faster CI.
