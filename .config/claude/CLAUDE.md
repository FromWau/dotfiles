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

## Gradle (XDG layout)
  - My Gradle home follows XDG Base Directory and lives at
    `$XDG_DATA_HOME/gradle` (typically `~/.local/share/gradle`), not the
    default `~/.gradle`.
  - Look there for caches, wrapper dists, init scripts, daemon logs, etc.
  - `gradle.properties` / `init.d/` are under `$XDG_DATA_HOME/gradle/`.
  - Don't suggest `~/.gradle/...` paths without checking `$GRADLE_USER_HOME`
    or `$XDG_DATA_HOME` first.

Never use thinking dash `--` or other variants when writing any texts

# Fact-checking — two-step

Plan freely on assumptions (fast-path). Verify before the user sees them.

**Step 1 — internal planning / reasoning:** assumptions, recall, and
inferences are fine. Don't slow down thinking to look up every fact.

**Step 2 — before responding or applying a change:** scan the planned
output for verifiable claims and check them. Treat as claims anything a
reader could act on or quote back: tracker IDs, URLs, version numbers,
API signatures, CLI flags, library defaults, file paths, line numbers,
symbol names, OS behavior, "known bug" statements.

- Android / SDK / `adb` / Gradle / AndroidX / framework: `android docs
  <topic>` (see `android-cli-tips` skill).
- Code-resolvable (does this symbol exist? what does it do?): `grep` /
  LSP / read the file.
- Everything else: short `WebSearch` (1–2 queries).

If a check confirms the assumption, ship it. If it contradicts or returns
nothing, rewrite the claim with explicit grounding ("the stack trace
shows…", "I could not verify…", "likely, but unconfirmed"). Never invent
tracker IDs, URLs, or version numbers to lend false authority.

# When stuck, don't assume — ask

If you are stuck or uncertain about an implementation path, do not pick
one and proceed. Saying "I don't know" or "I need more info on X" is the
correct answer. Get clarification before implementing something the user
may not want. Wasted implementation work is worse than one clarifying
question. This applies to: ambiguous requirements, multiple viable design
choices, missing context about why a change is being made, and any case
where "I'll just guess and go" feels tempting.
