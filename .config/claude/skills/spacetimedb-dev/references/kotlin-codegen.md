# SpacetimeDB Kotlin Codegen

## Kotlin Codegen Output

```
module_bindings/
├── Types.kt               ← all user-defined types (data class, sealed interface, enum class)
├── {TableName}Table.kt    ← table name + field name constants
├── {Reducer}Reducer.kt    ← reducer args data class + name constant
├── RemoteTables.kt        ← aggregates all table accessors
├── RemoteReducers.kt      ← reducer call stubs
└── Module.kt              ← lists all tables/reducers
```

## Codegen Source Files

- `crates/codegen/src/kotlin.rs` — Kotlin `Lang` trait implementation
- `crates/codegen/src/lib.rs` — imports `pub mod kotlin` + `pub use self::kotlin::Kotlin`
- `crates/cli/src/subcommands/generate.rs` — `Language::Kotlin` enum variant + match arms

## Running Kotlin SDK Tests

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
