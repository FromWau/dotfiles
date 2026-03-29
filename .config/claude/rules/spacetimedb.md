## SpacetimeDB — Build & Codegen

### Project Location
`~/Projects/SpacetimeDB/`

### Building CLI Binaries
```bash
cd ~/Projects/SpacetimeDB
cargo build --release -p spacetimedb-cli -p spacetimedb-standalone
```

Binaries output to:
- `target/release/spacetimedb-cli`
- `target/release/spacetimedb-standalone`

### Creating a New SpacetimeDB App
```bash
~/Projects/SpacetimeDB/target/release/spacetimedb-cli init \
    --template <template-id> \
    --project-path ~/Projects/<app-name>/ \
    --non-interactive \
    <app-name>
```
- `spacetimedb-cli init` is non-interactive with `--non-interactive`
- `spacetimedb-cli dev` and `spacetimedb-cli dev generate` require an interactive terminal (cannot run from non-TTY)

### Generating Client Bindings
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

### Kotlin Codegen Output
```
module_bindings/
├── Types.kt               ← all user-defined types (data class, sealed interface, enum class)
├── {TableName}Table.kt    ← table name + field name constants
├── {Reducer}Reducer.kt    ← reducer args data class + name constant
├── RemoteTables.kt        ← aggregates all table accessors
├── RemoteReducers.kt      ← reducer call stubs
└── Module.kt              ← lists all tables/reducers
```

### Codegen Source Files
- `crates/codegen/src/kotlin.rs` — Kotlin `Lang` trait implementation
- `crates/codegen/src/lib.rs` — imports `pub mod kotlin` + `pub use self::kotlin::Kotlin`
- `crates/cli/src/subcommands/generate.rs` — `Language::Kotlin` enum variant + match arms

### Testing with a Local Project

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

---

### Kotlin SDK Benchmarking

#### JMH Microbenchmarks (BSATN, TableCache, Index)
```bash
cd ~/Projects/SpacetimeDB/sdks/kotlin
./gradlew :benchmarks:jmh --no-daemon
```
Results: `benchmarks/build/reports/jmh/results.json`

#### Performance Constraint Tests (CI regression guards)
Hardware-independent scaling tests — verify O(1)/O(n)/O(n log n) at 100K vs 800K rows.
```bash
./gradlew :spacetimedb-sdk:jvmTest --tests "*.PerformanceConstraintTest" --no-daemon
```
Also runs via smoketests: `cargo ci smoketests` (inside `test_kotlin_sdk_unit_tests`).

#### Keynote-2 TPS Benchmark (end-to-end throughput)

**Setup (once):**
```bash
# Build + start server
cargo build --release -p spacetimedb-cli -p spacetimedb-standalone
target/release/spacetimedb-cli start

# Publish benchmark module + seed
target/release/spacetimedb-cli publish --server http://localhost:3000 \
  --module-path templates/keynote-2/rust_module --no-config -y sim
cd templates/keynote-2/spacetimedb-rust-client
cargo run --release -- seed -s http://localhost:3000 -m sim
```

**Kotlin SDK:**
```bash
cd templates/keynote-2/spacetimedb-kotlin-client
./gradlew run --args="bench --server http://localhost:3000 --module sim --duration 10s --connections 10" --no-daemon
# Engine options: --engine okhttp (default, fastest), --engine cio, --engine java
```

**Rust raw-WebSocket baseline:**
```bash
cd templates/keynote-2/spacetimedb-rust-client
cargo run --release -- bench -s http://localhost:3000 -m sim -d 10s -c 10
```

**TypeScript SDK comparison:**
```bash
# First time: pnpm install (from repo root) && cd sdks/typescript && pnpm run build
cd templates/keynote-2
npx tsx src/cli.ts test-1 --seconds 10 --concurrency 10 --alpha 1.5 \
  --connectors spacetimedb --bench-pipelined --max-inflight-per-worker 16384
```
Note: use `npx tsx` directly — `pnpm run bench --` double-escapes args.

**JFR profiling (benchmark window only):**
```bash
cd templates/keynote-2/spacetimedb-kotlin-client
./gradlew installDist --no-daemon
JFR_OUTPUT=/tmp/kotlin-bench.jfr \
  build/install/spacetimedb-kotlin-tps-bench/bin/spacetimedb-kotlin-tps-bench \
  bench --server http://localhost:3000 --module sim --duration 10s --connections 10
# Analyze: jfr print --json --events jdk.ExecutionSample /tmp/kotlin-bench.jfr
```

#### Known Performance Characteristics
- OkHttp engine is fastest (~60K TPS) — CIO and Java are slower
- Main CPU bottleneck: `BigInteger` in Identity/ConnectionId decode (80% of CPU samples)
- Persistent collections (atomic+PersistentHashMap): only ~2% of CPU — not a bottleneck
- Callback lists use write-rarely/read-often pattern — CAS contention is minimal
### Running Kotlin SDK Tests

All Kotlin tests live in smoketests. Run everything with:
```bash
cargo test -p spacetimedb-smoketests --test integration kotlin
```

This runs three tests (source: `crates/smoketests/tests/smoketests/kotlin_sdk.rs`):
- `test_kotlin_sdk_unit_tests` — SDK unit tests via Gradle (BSATN, types, query builder, callbacks)
- `test_build_kotlin_client` — generates bindings, verifies they compile
- `test_kotlin_integration` — starts server, publishes module, runs Kotlin client end-to-end

**Template smoketests** (includes basic-kt and compose-kt):
```bash
cargo test -p spacetimedb-smoketests --test integration test_all_templates
```

**Codegen snapshot tests** (separate crate):
```bash
cargo test -p spacetimedb-codegen
# To accept snapshot changes:
cargo insta test --accept -p spacetimedb-codegen
```

**Regenerate integration test bindings** (after codegen changes):
```bash
cargo build --release -p spacetimedb-cli
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate \
    --lang kotlin \
    --out-dir sdks/kotlin/integration-tests/src/test/kotlin/module_bindings/ \
    --module-path sdks/kotlin/integration-tests/spacetimedb
```
