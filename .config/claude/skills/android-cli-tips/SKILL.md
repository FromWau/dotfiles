---
name: android-cli-tips
description: Use alongside the auto-generated `android-cli` skill — adds curated guidance on when to reach for the `android` CLI over adb/gradle/WebSearch, including UI inspection via `android layout`, doc lookup via `android docs search`, and known gotchas (e.g. flag mismatches in shipped docs). Apply when working with Android development tools, inspecting a running app's UI, looking up Android API/Jetpack/Compose docs, or whenever the user mentions the `android` CLI, `adb`, or Android SDK/AVD management.
---

# Google `android` CLI Tool — Curated Tips

A local CLI from Google for Android dev: docs lookup, UI introspection, project scaffolding, SDK/AVD/APK management, and a first-party skill registry. Installed at `/usr/bin/android`. Check version with `android -V`.

Update: `android update`. Reset/refresh skill files: `android init` (writes `~/.claude/skills/android-cli/`, plus Gemini and Copilot equivalents). Cwd resets after `init`, do not chain commands assuming the working directory persists.

## When to reach for `android` over the usual tools

- **Android API / Jetpack / Compose / AndroidX questions** → `android docs search "<keywords>"` then `android docs fetch kb://...`. Beats WebSearch: queries Google's curated Knowledge Base (4800+ articles), returns full article text, no rate limits, cached after a one-time download on first call. Use this BEFORE WebSearch for anything Android-specific.
- **Inspect a running app's UI** → `android layout --pretty` (or `--diff` to keep context small). Returns a flat JSON list with `text`, `resourceId`, `contentDesc`, `bounds`, `center`, `interactions`, `state`, `off-screen`. Faster and cheaper than a screenshot for most UI questions.
- **Tap / type / swipe** → still `adb shell input ...`, but resolve coordinates from `android layout` (use the `center` field). Pattern: `adb shell input tap $(android layout | jq -r '.[] | select(.resourceId == "...") | .center | gsub("[\\[\\]]"; "")')`.
- **WebView / animation / element missing from layout dump** → fall back to `android screen capture --annotate -o /tmp/s.png`, visually inspect, then `android screen resolve --screenshot /tmp/s.png --string "tap #34"` to convert label `#34` into coordinates. Pipeline: `adb shell input $(android screen resolve --screenshot /tmp/s.png --string "tap #34")`.
- **Big Android-specific migrations or topics** → `android skills find <topic>` first. Currently shipped: `navigation-3`, `edge-to-edge`, `agp-9-upgrade`, `migrate-xml-views-to-jetpack-compose`, `r8-analyzer`, `play-billing-library-version-upgrade`, `display-ai-glasses-with-jetpack-compose-glimmer`. Each is a structured walkthrough with steps and gotchas. Read the installed SKILL.md directly: `/home/fromml/.claude/skills/<skill-name>/SKILL.md`.
- **SDK/AVD management** → `android sdk install platforms/android-34`, `android sdk list --all`, `android emulator create|start|stop|list|remove`. Avoids the legacy `sdkmanager` / `avdmanager` UX.
- **New project scaffolding** → `android create empty-activity --name="My App" --output=./my-app` (only template available right now is `empty-activity`).

## Stick with the existing tooling for

- Build / lint / test of an existing project → `./gradlew` (the `android run` command is APK deploy, not a Gradle replacement).
- Connected device list, logcat, file push/pull, package install/uninstall → `adb` (no `android` equivalent).

## Gotchas

- Shipped `references/interact.md` documents `screen resolve --screen <path>`; the actual flag is `--screenshot <path>`. Use `--screenshot`.
- First `android docs search` downloads the Knowledge Base zip (a few seconds). Subsequent calls are instant.
- Every invocation prints `Picked up _JAVA_OPTIONS: ...` and JVM `WARNING:` lines about restricted methods. Harmless. Filter with `2>/dev/null` if it muddles parsing.
- `android` skills land under `~/.claude/skills/` as raw files but are not necessarily exposed via the Claude Code Skill tool. If a skill name isn't in the available-skills list, `Read` its `SKILL.md` directly.
- `android init` writes to `~/.claude/`, `~/.gemini/`, `~/.copilot/` unconditionally. Re-running is idempotent and the way to refresh skills after `android update`.
