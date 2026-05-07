# SpacetimeDB Kotlin SDK Benchmarking

## JMH Microbenchmarks (BSATN, TableCache, Index)

```bash
cd ~/Projects/SpacetimeDB/sdks/kotlin
./gradlew :benchmarks:jmh --no-daemon
```
Results: `benchmarks/build/reports/jmh/results.json`

## Performance Constraint Tests (CI regression guards)

Hardware-independent scaling tests — verify O(1)/O(n)/O(n log n) at 100K vs 800K rows.

```bash
./gradlew :spacetimedb-sdk:jvmTest --tests "*.PerformanceConstraintTest" --no-daemon
```
Also runs via smoketests: `cargo ci smoketests` (inside `test_kotlin_sdk_unit_tests`).

## Keynote-2 TPS Benchmark (end-to-end throughput)

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

## Known Performance Characteristics

- OkHttp engine is fastest (~60K TPS) — CIO and Java are slower
- Main CPU bottleneck: `BigInteger` in Identity/ConnectionId decode (80% of CPU samples)
- Persistent collections (atomic+PersistentHashMap): only ~2% of CPU — not a bottleneck
- Callback lists use write-rarely/read-often pattern — CAS contention is minimal
