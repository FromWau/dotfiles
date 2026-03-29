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
~/Projects/SpacetimeDB/target/release/spacetimedb-cli dev generate \
    --skip-publish \
    --client-lang csharp \
    --project-path ~/Projects/<app-name>/
```

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

**Step 1: Generate server module** (run interactively — needs terminal):
```bash
spacetimedb-cli dev generate --skip-publish --project-path ~/Projects/SpacetimeDb-Testing/basic-kt/ --template basic-rs
```

**Step 2: Generate Kotlin bindings:**
```bash
~/Projects/SpacetimeDB/target/release/spacetimedb-cli generate --lang kotlin --out-dir ~/Projects/SpacetimeDb-Testing/basic-kt/src/src/main/kotlin/module_bindings/ --module-path ~/Projects/SpacetimeDb-Testing/basic-kt/spacetimedb
```

**Step 3: Compile client** (validates codegen matches SDK):
```bash
cd ~/Projects/SpacetimeDb-Testing/basic-kt/src && ./gradlew compileKotlin
```

**Step 4: Start dev server** (run interactively — needs terminal):
```bash
cd ~/Projects/SpacetimeDb-Testing/basic-kt && spacetimedb-cli dev --skip-publish --project-path .
```

**Step 5: Run client:**
```bash
cd ~/Projects/SpacetimeDb-Testing/basic-kt/src && ./gradlew run
```

**Step 6: Check server logs:**
```bash
spacetime logs generate --server local
```

**Notes:**
- The Kotlin client at `src/settings.gradle.kts` uses `includeBuild` to resolve the SDK from the local SpacetimeDB repo — no publishing needed
- `dev generate` and `dev` commands require an interactive terminal (cannot run from non-TTY)
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
