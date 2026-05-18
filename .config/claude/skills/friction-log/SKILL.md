---
name: friction-log
description: Capture development friction (confusing names, misleading structure, tramp data, dead code, build/dep footguns, comment/code mismatches, "wait why is this here" moments) into a branch-scoped log AS IT HAPPENS during any feature implementation or debugging — then replay, re-validate, and turn it into concrete cleanup actions when preparing the branch for PR/review. Use this whenever implementing or debugging a non-trivial change (log friction continuously, even if the user didn't ask), and whenever the user says things like "clean up", "make it PR ready", "prep for review", "we're done with the feature", or "tidy the branch".
---

# Friction Log

## Why this exists

The cheapest, highest-signal source of "what should we refactor" is the friction a developer hits *while building something on top of the code*. That signal is perishable: by the time the feature works, you've adapted to the bad parts and forgotten what cost you twenty minutes. Reconstructing it at the end is lossy and rationalized ("eh, it was fine").

So: **capture friction raw and immediately during development; act on it deliberately during cleanup.** The two phases are intentionally separated because the judgement needed is different — capture is fast and uncritical, cleanup is skeptical and selective.

## Where the log lives

One markdown file per branch, outside the repo (no `.gitignore` churn, no accidental commits, survives across sessions):

```
~/.claude/friction/<repo>/<branch>.md
```

Derive the path:
- `repo` = basename of `git rev-parse --show-toplevel`
- `branch` = `git rev-parse --abbrev-ref HEAD`, with `/` replaced by `-`

Create the directory if missing. If not in a git repo, fall back to `~/.claude/friction/_no-repo/<cwd-basename>.md`.

## Mode 1 — Capture (during implementation / debugging)

While building or debugging, when you hit friction, append an entry **right then**. Do not batch at the end. Do not let it interrupt the actual work for more than ~30 seconds.

### What counts as friction (log it)

- A name that says X but the thing does Y (class/function/param/file/use-case).
- You had to grep/read 3+ places to answer "where does this value come from / go".
- Tramp data: a dependency threaded through a call chain just so one leaf can use it.
- Dead/vestigial code or state you had to *prove* was dead before touching it.
- Build/dependency/codegen footguns: stale generated code, publish-loop indirection, env/toolchain surprises.
- A comment that contradicts the code, or a doc that lies about behavior.
- A god-object / multi-responsibility type that forced you to read the whole file to trust it.
- Duplicated source-of-truth: the same fact represented/written in N places.
- A control-flow shape that took real effort to convince yourself was correct.
- Any genuine "wait, why is this here / why does this work" moment.

### What is NOT friction (don't log it)

- Pure style nits a formatter/linter would catch.
- "I'd have done it differently" with no concrete cost.
- Your own transient unfamiliarity that resolved itself in a minute (note it only if it would also bite the next person).

### Entry format

Append using this template. Keep each entry tight — facts, not essays.

```
## <ISO date> · <phase: implementing|debugging>
**Where:** <file:symbol or area>
**Friction:** <what was confusing/misleading/blocking, concretely>
**Cost:** <what it actually cost — time, a wrong turn, an aborted approach>
**Severity:** <low|med|high>  (high = nearly derailed the change / hid a bug)
**Hypothesis:** <a possible cleanup, tagged: rename|extract|simplify|rewire|delete-dead|document|investigate>
**Confidence:** <low|med|high>  (low = might just be me not knowing the codebase yet)
```

Write the hypothesis as a *guess to be re-checked later*, never a commitment. Low-confidence entries are still worth logging — cleanup will filter them.

Start the file (if new) with a one-line header: `# Friction — <branch>` and the feature/goal in a sentence.

## Mode 2 — Replay & act (cleanup / PR-prep)

Triggered when the feature works and the user wants the branch review-ready. Read the branch's friction file. If it doesn't exist or is empty, say so and proceed with normal cleanup — don't fabricate findings.

### Step 1: Re-validate every entry against the FINAL code

This is the most important step and the reason capture and action are separated. For each entry, check it against the code as it stands now:

- **Still true?** The thing may have changed during development (your own work may have already fixed or moved it).
- **Would it confuse someone who isn't you-at-that-moment?** Distinguish *"confusing because I hadn't learned the codebase yet"* (drop it) from *"misleading for anyone, including the original author"* (keep it). Be honest — a lot of capture-time friction is just ramp-up.
- **Was the hypothesis even right?** You understand the code far better now than when you logged it. Some hypotheses will be naive; some friction will turn out to be load-bearing and correct as-is.

Mark each entry: `confirmed`, `stale` (no longer applies), `was-just-me` (transient unfamiliarity), or `wrong` (hypothesis didn't survive understanding).

### Step 2: Turn confirmed findings into a cleanup plan

For confirmed findings, categorize the action: `rename`, `extract`, `simplify`, `rewire`, `delete-dead`, `document`, or `out-of-scope` (real but too big / risky for this PR — capture as a follow-up note instead).

Prioritize by **(how often it confused × blast radius × inverse fix cost)**. A misleading name used everywhere with a one-line fix beats a deep rewire that touches the payment path.

### Step 3: Propose, don't auto-apply

Present the validated findings and proposed cleanups to the user as a short plan, grouped by category, cheapest-highest-value first. Structural changes (rewire/extract across files, signature changes) need explicit sign-off — they have blast radius and the user owns that tradeoff. Renames, dead-code deletion, doc fixes, and local simplifications can usually proceed once the plan is acknowledged.

Explicitly list the `out-of-scope` items as suggested follow-ups so they aren't lost — that's the repo's refactor backlog, earned honestly.

### Step 4: Close out

After the cleanup is applied (or consciously deferred), archive the file: move it to `~/.claude/friction/<repo>/_archive/<branch>-<date>.md`. A merged branch's friction is done; a fresh branch starts a fresh log. Carrying `out-of-scope` items forward into a new branch's log is fine if work continues.

## Operating principles

- **Capture is cheap and generous; action is skeptical and selective.** Logging a maybe-wrong observation costs ~30s; re-validation is the filter, not self-censorship at capture time.
- **The log serves the cleanup, not the feature.** Never let logging slow or reshape the implementation. It's a side-channel.
- **Honesty over ego in re-validation.** "This confused me only because I didn't know the codebase" is the most common and most important verdict — saying it keeps the cleanup plan trustworthy.
- **The user can correct capture-time claims.** If they say "that's wrong, we actually do X", update or drop the entry — captured friction is a hypothesis, not a verdict.
