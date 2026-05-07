---
name: spacetimedb-dev
description: Use when working on SpacetimeDB — covers building CLI binaries (`spacetimedb-cli`, `spacetimedb-standalone`), creating apps from templates, generating client bindings (Kotlin, C#, TypeScript, Rust, Unreal C++), Kotlin SDK structure (Types.kt / RemoteTables.kt / RemoteReducers.kt / Module.kt), local-project test workflow, and benchmarking (JMH, perf constraint tests, Keynote-2 TPS). Apply whenever the user is working under `~/Projects/SpacetimeDB/` or `~/Projects/SpacetimeDb-Testing/`, mentions SpacetimeDB, codegen for SDKs, the Kotlin/C#/TS/Rust SDKs, smoketests, or `spacetimedb-cli`. Read references for benchmarking (`benchmarking.md`) and Kotlin codegen internals (`kotlin-codegen.md`).
---

# SpacetimeDB — Build & Codegen

## Project Location

`~/Projects/SpacetimeDB/`

## When to read references

- **`references/benchmarking.md`** — JMH microbenchmarks, perf constraint tests, Keynote-2 TPS benchmark across Kotlin/Rust/TypeScript SDKs, JFR profiling, known performance characteristics. Read when the user asks about benchmarks or perf regressions.
- **`references/kotlin-codegen.md`** — Kotlin codegen output structure, codegen source files, and Kotlin SDK testing/regeneration commands. Read when modifying Kotlin codegen or testing SDK generation.

## Building CLI Binaries

```bash
cd ~/Projects/SpacetimeDB
cargo build --release -p spacetimedb-cli -p spacetimedb-standalone
```

Binaries output to:
- `target/release/spacetimedb-cli`
- `target/release/spacetimedb-standalone`

## Creating a New SpacetimeDB App

```bash
~/Projects/SpacetimeDB/target/release/spacetimedb-cli init \
    --template <template-id> \
    --project-path ~/Projects/<app-name>/ \
    --non-interactive \
    <app-name>
```
- `spacetimedb-cli init` is non-interactive with `--non-interactive`
- `spacetimedb-cli dev` and `spacetimedb-cli dev generate` require an interactive terminal (cannot run from non-TTY)

## Generating Client Bindings

Requires `--module-path` pointing to the `spacetimedb/` subdirectory inside the app.

```bash
# C#
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate \
    --lang csharp \
    --out-dir ~/Projects/<app-name>/src/module_bindings/cs/ \
    --module-path ~/Projects/<app-name>/spacetimedb

# Kotlin
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate \
    --lang kotlin \
    --out-dir ~/Projects/<app-name>/src/module_bindings/kt/ \
    --module-path ~/Projects/<app-name>/spacetimedb

# TypeScript
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate \
    --lang typescript \
    --out-dir ~/Projects/<app-name>/src/module_bindings/ts/ \
    --module-path ~/Projects/<app-name>/spacetimedb

# Rust
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate \
    --lang rust \
    --out-dir ~/Projects/<app-name>/src/module_bindings/rs/ \
    --module-path ~/Projects/<app-name>/spacetimedb
```

### Supported `--lang` Values

| Flag | Aliases |
|------|---------|
| `csharp` | `c#`, `cs` |
| `kotlin` | `kt`, `KT` |
| `typescript` | `ts`, `TS` |
| `rust` | `rs`, `RS` |
| `unrealcpp` | `uecpp`, `ue5cpp`, `unreal` |

## Testing with a Local Project

**Test repo:** `~/Projects/SpacetimeDb-Testing/basic-kt/`

**Structure:**
```
basic-kt/
├── spacetime.json            ← project config (database name, module-path)
├── spacetimedb/              ← Rust server module (lib.rs + Cargo.toml)
│   ├── Cargo.toml
│   └── src/lib.rs
└── src/                      ← Kotlin client (Gradle project)
    ├── build.gradle.kts
    ├── settings.gradle.kts   ← has includeBuild pointing to SDK
    ├── gradle/libs.versions.toml
    └── src/main/kotlin/
        ├── main.kt
        └── module_bindings/  ← generated Kotlin bindings
```

**Step 1: Create project from template:**
```bash
~/Projects/SpacetimeDB/target/release/spacetimedb-cli init --template <template> --project-path ~/Projects/SpacetimeDb-Testing/<name>/ --non-interactive <name>
```

**Step 1.5: Local SDK setup** (required until SDK is on Maven Central):

In `settings.gradle.kts`, add:
```kotlin
includeBuild("/home/fromml/Projects/SpacetimeDB/sdks/kotlin")
```

In the subproject's `build.gradle.kts` `spacetimedb { }` block, add:
```kotlin
cli.set(file("/home/fromml/Projects/SpacetimeDB/target/release/spacetimedb-cli"))
```

**Step 2: Compile client** (validates codegen + SDK):
```bash
cd ~/Projects/SpacetimeDb-Testing/<name> && ./gradlew compileKotlin
```

**Step 2.5: Fix database name in `spacetime.local.json`:**
The template generates a random suffix (e.g. `basic-kt-9278t`). The client code defaults to the bare name (e.g. `basic-kt`). Update `spacetime.local.json` to match:
```json
{ "database": "<name>" }
```
This ensures `spacetimedb-cli publish` uses the correct name.

**Step 3: Start the local server** (requires interactive terminal):
```bash
# Tell the user to run this in a separate terminal:
cd ~/Projects/SpacetimeDb-Testing/<name> && ~/Projects/SpacetimeDB/target/release/spacetimedb-cli start
```
- `spacetimedb-cli start` wraps `spacetimedb-standalone` — no need to use standalone directly
- No `--data-dir` needed — defaults to `~/.local/share/spacetime/data`
- Verify the server is reachable by running `spacetimedb-cli logs <name> --server local` — a "database not found" error confirms the server is up (just not published yet); a connection refused means it's not running

**Step 4: Publish the module:**
```bash
cd ~/Projects/SpacetimeDb-Testing/<name> && ~/Projects/SpacetimeDB/target/release/spacetimedb-cli publish --server local --module-path spacetimedb -y <name>
```

**Step 5: Run client:**
```bash
cd ~/Projects/SpacetimeDb-Testing/<name> && ./gradlew run
```

**Step 6: Check server logs:**
```bash
~/Projects/SpacetimeDB/target/release/spacetimedb-cli logs <name> --server local
```

**Notes:**
- Templates are embedded in the `spacetimedb-cli` binary at build time — after editing template source files, you MUST rebuild the CLI (`cargo build --release -p spacetimedb-cli`) before `spacetimedb-cli init` will use the changes
- The Kotlin Gradle plugin auto-generates bindings on compile — no manual `spacetimedb-cli generate` needed
- `spacetimedb-cli dev` requires an interactive terminal (cannot run from non-TTY)
- Do NOT have a root `Cargo.toml` in `basic-kt/` — it interferes with the module build in `spacetimedb/`
- Server binds `0.0.0.0:3000` — use `ws://127.0.0.1:3000` if `localhost` resolves to IPv6
