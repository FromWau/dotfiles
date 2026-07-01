---
name: how-to-write-comments
description: How to write and clean up code comments in any language — keep code self-documenting, comments never bloated, no implementation-detail leaks, no feature/phase/spec/PR narration, brief one-liners only for genuinely non-obvious logic. Apply whenever writing or reviewing comments, when a user says comments are too verbose / detailed / leak details / read like dev notes / reference the feature work, when doing a comment-cleanup pass on a file, module, or feature branch, or before finishing/merging a branch. For a repo- or branch-wide cleanup, fan out parallel subagents scoped by module.
---

# How to Write Comments

Good code is self-documenting. A comment is a liability that must earn its place: it can go stale, it repeats what the code already says, and it clutters the read. Prefer making the code clearer (better names, smaller functions, extracted helpers, explicit types) over explaining unclear code with a comment.

Write the comment only when the code genuinely cannot carry the meaning on its own — and then keep it to one line.

## The bar

A comment earns its place only if it explains a **why** the code cannot: a non-obvious constraint, a subtle ordering requirement, a hazard, a workaround for an external quirk, or a contract that isn't visible at the call site. If a reader who knows the language would understand the code without the comment, delete the comment.

- **Explain WHY, never WHAT.** `// increment i` is noise. `// dropLast(1): the API returns a trailing sentinel we must discard` is a why.
- **One line.** If a "why" needs a paragraph, that's a design smell — usually the code should be restructured or the rationale belongs in a design doc / commit message, not inline.
- **No history, no process talk.** Comments describe the code as it is *now*, for someone reading it fresh. They are not a changelog, a PR description, or dev notes.

## Delete on sight

- **Restatements** of what the adjacent code plainly does.
- **Multi-line implementation narration** — comments that walk through *how* the code works step by step. The code is the how.
- **Feature/process references** — phase numbers, stage labels, spec/issue/ticket references (`spec §5`, `Phase 3b`, `(issue #6)`, `rev 1`), "PR feedback", and any "we changed X from Y / used to / no longer / will later / deferred until" history.
- **Stale comments** — anything referencing removed or renamed symbols, or behavior that no longer matches the code.
- **Bloated KDoc/docstrings** — multi-paragraph headers that re-explain the type's mechanics, list every field the signature already shows, or narrate rationale.

## Keep (rarely, and terse)

- A single line capturing a genuinely non-obvious **why**: a coroutine/thread hazard, an ordering that must not change, a magic value's meaning, a library quirk/workaround, or a wire/protocol contract not visible locally.
- A concise section divider in a long file (`// --- queries ---`) — but strip implementation-detail suffixes.
- A one-line note on a non-obvious test decision (e.g. why a test must use real time instead of virtual time).

When unsure whether a comment is worth keeping: try deleting it and re-reading the code. If the code is still clear, it stays deleted.

## Collapse, don't just delete

For a verbose doc header that has a kernel of value, collapse it to one sentence of purpose rather than removing it wholesale:

**Before**
```
/**
 * Server-side bridge: exposes the nested [Daemon] as a flat [DaemonRpc]. Every
 * method is pure delegation.
 *
 * The [sessionId] is connection-bound — the route handler allocates a unique id
 * per connection and constructs one adapter per connection. Per-session args
 * substitute this bound id for the client-supplied value... (12 more lines)
 */
```
**After**
```
/** Exposes the nested [Daemon] as the flat [DaemonRpc] wire interface. */
```
(Keep one terse inline line at the substitution site if that behavior is non-obvious there.)

**Before**
```
// Single, ordered, run-once teardown. The steps run in a fixed order so shutdown
// stays clean (no "Job was cancelled"):
//  1. server.stop()   closes connections so no in-flight RPC races the release.
//  2. daemon.release() persists state — MUST run while the DB is still open.
//  ... (15 more lines)
```
**After**
```
// Ordered, run-once teardown: stop server, persist state, then release the instance.
```

## Never touch (when cleaning up)

Edit comment text only. Do not change code, control flow, string literals, annotations, imports, package/license headers. Do not leave empty `/** */` blocks or dangling `//`. Every doc-comment block must remain syntactically valid.

## Cleanup pass — fan out parallel subagents by module

When the task is to clean comments across a codebase, a module, or a feature branch, parallelize. Comment edits in different files are independent, so this is safe and fast.

1. **Scope the files.** For a feature-branch cleanup, target the files the branch changed (`git diff --name-only <base>...HEAD -- '*.<ext>'`), evaluating *every* comment in them (pre-existing stale ones count, not just newly added). For a general pass, take the module's source tree. Group the files by module/package.

2. **Dispatch one subagent per group, all in a single message** so they run in parallel. Give each a disjoint file list — never let two agents touch the same file. Each subagent gets: the file list, the philosophy above (delete / collapse / keep, with the calibration examples), and the guardrails.

3. **Subagent rules:** evaluate every comment; comment-only edits; never touch code/strings/annotations/imports; do **not** run git; do **not** run the build (parallel builds contend on the build-system lock — the controller verifies once at the end). Report per file what was trimmed and list any comment deliberately kept with a one-phrase why (so the controller can sanity-check judgment).

4. **Controller (you):** after all agents finish, diff-review each change to confirm it is comment-only (no code drift), then compile/test **once** for the whole set to catch any broken doc-comment block, then commit. Balance the split so no agent gets an oversized share; a large module can be split into "production" and "platform + tests" groups.

## Why this matters

Over-commenting is worse than under-commenting: stale and redundant comments actively mislead, and dense dev-narration buries the one comment that mattered. The goal is a codebase where the code speaks for itself and the few surviving comments are all signal.
