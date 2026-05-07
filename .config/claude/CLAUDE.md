# Claude Global Reminders

@rules/bash.md

Domain-specific guidance lives in skills (loaded on demand, not every session).
The skills below are auto-discovered from `~/.claude/skills/` — invoke them via
the Skill tool when working in the relevant context:

- `kotlin-formatting` — Kotlin file formatting conventions
- `android-kmp` — Android / Kotlin Multiplatform architecture and patterns
- `android-cli-tips` — curated tips for the `android` CLI tool
- `rest-api-design` — REST API design principles
- `uiux-design` — UI/UX design principles
- `titanfall-northstar` — Titanfall 2 / Northstar mod development
- `rrplug-northstar` — Rust native plugins for Northstar
- `spacetimedb-dev` — SpacetimeDB build, codegen, and SDK testing

# Default Preferences

## Python Projects
  - Always use `uv` for Python package management and virtual environments
  - Use `uv pip install` instead of `pip install`
  - Create virtual environments with `uv venv`

Never use thinking dash `--` or other vairants when writing any texts
