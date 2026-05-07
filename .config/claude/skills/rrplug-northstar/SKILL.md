---
name: rrplug-northstar
description: Use when building Rust native plugins for R2Northstar (Titanfall 2) via the rrplug framework — covers Linux→Windows cross-compilation setup (mingw-w64, .cargo/config.toml), Cargo.toml configuration, the basic plugin template (`Plugin` trait, `register_sq_functions`, `entry!` macro), and `cargo build`/install pipeline. Apply when the user mentions rrplug, native Northstar plugins, Cargo.toml depends on `rrplug`, or files match `**/.cargo/config.toml` with a Northstar plugin context. Most Northstar tasks can be done in Squirrel alone — this skill is for protected ConVars, engine-level hooks, performance-critical ops, or low-level memory access.
---

# Rust Plugins with rrplug (Northstar)

## Overview

[rrplug](https://github.com/R2NorthstarTools/rrplug) is a Rust framework for creating native plugins for R2Northstar (Titanfall 2).

**Official Docs:** https://docs.rs/rrplug/

## When You Actually Need a Plugin

**Most tasks can be done in Squirrel alone!** Test with `SetConVarInt()`, `GetConVarInt()`, `SetConVarFloat()`, `GetConVarFloat()` before building a plugin.

**DO create a plugin for:** protected ConVars, engine-level hooks not in Squirrel, performance-critical ops, low-level memory access.

## Cross-Compilation Setup (Linux → Windows)

```bash
rustup target add x86_64-pc-windows-gnu
sudo pacman -S mingw-w64-gcc
```

**.cargo/config.toml:**
```toml
[build]
target = "x86_64-pc-windows-gnu"

[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-ar"
```

**Cargo.toml:**
```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
rrplug = "0.4"
log = "0.4"
```

## Basic Plugin Template

```rust
use rrplug::prelude::*;

#[derive(Debug)]
pub struct MyPlugin;

impl Plugin for MyPlugin {
    const PLUGIN_INFO: PluginInfo = PluginInfo::new(
        c"My Plugin",
        c"MYPLUGIN",
        c"MY_PLUGIN",
        PluginContext::CLIENT,
    );

    fn new(reloaded: bool) -> Self {
        register_sq_functions(my_squirrel_function);
        Self
    }
}

#[rrplug::sqfunction(VM = "CLIENT", ExportName = "MySquirrelFunction")]
fn my_squirrel_function(message: String) -> Result<String, String> {
    Ok(format!("Received: {}", message))
}

entry!(MyPlugin);
```

## Building & Installation

```bash
cargo build --release
# Output: target/x86_64-pc-windows-gnu/release/my_northstar_plugin.dll

cp target/x86_64-pc-windows-gnu/release/my_northstar_plugin.dll \
   ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/plugins/
```
