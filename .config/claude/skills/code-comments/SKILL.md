---
name: code-comments
description: How to write self-documenting code and what actually earns a comment, in any language. Prefer making the code clearer — better names, smaller functions, extracted helpers, explicit types — over explaining unclear code with a comment. A comment must justify itself by explaining a WHY the code cannot carry (a non-obvious constraint, hazard, ordering requirement, external-quirk workaround, or a contract not visible locally), kept to one line. Never restate what the code does, narrate the implementation step by step, or leave feature/phase/spec/PR/history notes. Apply whenever writing a comment or doc header, deciding whether a comment is warranted, or judging comment quality in review — and when a user says comments are too verbose, leak implementation detail, or read like dev notes.
---

# Code Comments

Good code is self-documenting. A comment is a liability that must earn its place: it can go stale, it repeats what the code already says, and it clutters the read. **Reach for clearer code first** — a better name, a smaller function, an extracted helper, an explicit type — and write a comment only when the code genuinely cannot carry the meaning on its own. Then keep it to one line.

## What earns a comment

A comment earns its place only if it explains a **why** the code cannot: a non-obvious constraint, a subtle ordering requirement, a hazard, a workaround for an external quirk, or a contract that isn't visible at the call site. If a reader who knows the language would understand the code without the comment, there should be no comment.

- **Explain WHY, never WHAT.** `// increment i` is noise. `// dropLast(1): the API returns a trailing sentinel we must discard` is a why.
- **One line.** If a "why" needs a paragraph, that's a design smell — the code should usually be restructured, or the rationale belongs in a design doc / commit message, not inline.

The handful that genuinely earn their keep, and stay terse:

- A single line capturing a non-obvious **why**: a coroutine/thread hazard, an ordering that must not change, a magic value's meaning, a library quirk/workaround, or a wire/protocol contract not visible locally.
- A concise section divider in a long file (`// --- queries ---`) — without implementation-detail suffixes.
- A one-line note on a non-obvious test decision (e.g. why a test must use real time instead of virtual time).

When unsure whether a comment is worth it: imagine the code without it. If the code is still clear, don't write it.

## What not to write

- **Restatements** of what the adjacent code plainly does.
- **Implementation narration** — comments that walk through *how* the code works step by step. The code is the how.
- **Feature/process references** — phase numbers, stage labels, spec/issue/ticket references (`spec §5`, `Phase 3b`, `(issue #6)`, `rev 1`), "PR feedback", and any "we changed X from Y / used to / no longer / will later / deferred until" history. A comment describes the code as it is *now*, for someone reading it fresh — not a changelog, a PR description, or dev notes.
- **Bloated KDoc/docstrings** — multi-paragraph headers that re-explain the type's mechanics, list every field the signature already shows, or narrate rationale.

## Doc comments: one sentence of purpose

A doc header states what the thing *is*, in one line. Everything the signature already shows, and every paragraph of mechanics, is noise.

**Instead of**
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
**write**
```
/** Exposes the nested [Daemon] as the flat [DaemonRpc] wire interface. */
```
If one genuinely non-obvious behavior remains (the `sessionId` substitution above), keep a single terse line at the site where it happens — not in the header.

## Why this matters

Over-commenting is worse than under-commenting: stale and redundant comments actively mislead, and dense dev-narration buries the one comment that mattered. The goal is a codebase where the code speaks for itself and the few surviving comments are all signal.
