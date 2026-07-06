---
name: android-cli-tips
description: Curated tips for the `android` CLI tool — UI inspection, doc lookup, AVD/SDK management, and when to prefer it over `adb` or `gradle`.
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

## `android studio` — IDE-bridge commands (version-gated)

`android studio` bridges into a *running* Android Studio instance: `check`, `find-declaration`, `find-usages`, `open-file`, `analyze-file`, `render-compose-preview` (renders a `@Preview` composable to PNG, `--print-semantics` for the semantics tree as JSON), `version-lookup`.

- Always run `android studio check` first — it lists PID, Studio version, and open projects with READY state.
- **The RPC endpoints beyond `check` require Android Studio Quail 2 Canary 1 or newer AND Gemini in Android Studio enabled + signed in** (per developer.android.com/tools/agents/android-cli). Either one missing → every command beyond `check` fails with `Error: <n> not implemented` even when the project shows READY. This is a live gate: disabling Gemini later re-breaks the endpoints immediately. For Gemini-free headless preview rendering, use the Compose Preview Screenshot Testing Gradle plugin instead (renders ALL multipreview configs, works in CI). That error is a server-side gate, not a CLI problem — `android update` won't fix it. The Gemini sign-in is interactive in the IDE; hand it to the user.
- `render-compose-preview` usage: `android studio render-compose-preview --output-image-file=out.png <file.kt> <PreviewComposableName>`. Private composables are fine; run from inside the project dir to auto-select the project.
- With multipreview annotations (custom annotations bundling several `@Preview` device specs), the CLI renders only ONE configuration per call — you cannot pick which device spec. Indeterminate progress spinners render at animation-time zero (a tiny stroke-cap dot), not as a full arc.
- **Stale-classpath trap**: `render-compose-preview` loads module classes from the IDE's own *last-build* snapshot. External `./gradlew` builds (compileDebugKotlin, assembleDebug, even `build`) NEVER refresh it — verified by bytecode-diffing the on-disk jar (fresh) against rendered output (stale). Waiting, window focus, `open-file`, `touch`, and whitespace-editing the preview file don't help either (the last one forces a classloader rebuild, but from the same stale snapshot). Symptoms: renders silently show old code, or `NoClassDefFoundError` for classes added since the IDE's last build. The ONLY fix: an IDE-triggered build (Ctrl+F9 / Build & Refresh hammer) per iteration. Fast Preview does compile the *preview file itself* on the fly, so new/edited preview functions work without a build — it's sibling files that stay stale. For iterative visual tuning without a human clicking Build each round, use the Compose Preview Screenshot Testing Gradle plugin instead.

## Gotchas

- Shipped `references/interact.md` documents `screen resolve --screen <path>`; the actual flag is `--screenshot <path>`. Use `--screenshot`.
- First `android docs search` downloads the Knowledge Base zip (a few seconds). Subsequent calls are instant.
- Every invocation prints `Picked up _JAVA_OPTIONS: ...` and JVM `WARNING:` lines about restricted methods. Harmless. Filter with `2>/dev/null` if it muddles parsing.
- `android` skills land under `~/.claude/skills/` as raw files but are not necessarily exposed via the Claude Code Skill tool. If a skill name isn't in the available-skills list, `Read` its `SKILL.md` directly.
- `android init` writes to `~/.claude/`, `~/.gemini/`, `~/.copilot/` unconditionally. Re-running is idempotent and the way to refresh skills after `android update`.
