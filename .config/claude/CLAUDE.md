# Claude Global Reminders

@rules/bash.md

Domain-specific guidance lives in skills (loaded on demand, not every session).
The skills below are auto-discovered from `~/.claude/skills/`.

**As soon as a session has any topic-relevance to a listed skill, load it via
the Skill tool, before responding.** The trigger is the *topic*, not the
*activity*. Coding, code review, brainstorming, planning, debugging, and
plain Q&A ("what is X", "how does X work", "when should I use X") all
qualify. If the conversation is about Android/Kotlin, load `android-kmp` and
`kotlin-formatting`. If it touches REST APIs, load `rest-api-design`. And so
on. Do not gate on "am I editing code", gate on "is this skill's domain in
scope". Skill references are the source of truth and may correct or extend
training-data recall.

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

Never use thinking dash `--` or other variants when writing any texts
