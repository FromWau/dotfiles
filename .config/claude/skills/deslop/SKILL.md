---
name: deslop
description: >-
  A disciplined, file-by-file review-and-cleanup loop for hardening an existing codebase without churn.
  Use it whenever the user points at a file or a specific construct and pokes at it critically: "deslop
  this", "next Foo.kt", "is this a smell?", "can we do X better?", "this feels hacky", "is X dead / still
  needed?", "can we fold/simplify Y?", "why is it done this way?", "clean up this file", or is walking a
  codebase concern-by-concern tidying it. The loop's job is to separate genuine improvements from surface
  churn: it opens with a cheap scan of the file's shape (length, nesting depth, oversized comments) to aim
  the read, then grounds every dead/unused/needed claim in grep + tests + compile before asserting it,
  applies doc/code fixes while flagging design changes, keeps only earned why-comments, verifies green
  after each change, and reports what was deliberately left unchanged and why. Reach for it even when the user
  never says "review" or "refactor" — if they're skeptically improving existing code one piece at a time,
  this is the skill. Pairs with the software-design and code-comments skills, which hold the principles it
  applies.
---

# Deslop

A file-by-file loop for hardening an existing codebase: real improvements only, no churn.

This is a **process** skill. The principles it applies live in companions — load **`software-design`**
(layering, abstractions, typed errors, when NOT to abstract) and **`code-comments`** (what earns a
comment) alongside it, plus the relevant language tier (e.g. `kotlin`). Deslop is the loop that puts
them to work under review pressure.

## The one idea

Most "cleanups" make code worse by trading real clarity for surface tidiness: a DRY helper harder to
read than the three lines it replaced, an abstraction with one caller, a comment restating the code.
The entire discipline is **separating genuine improvement from churn**, and being willing to change
nothing.

The honest test before any change: *would I make this if a linter or a nagging voice weren't
complaining?* If no, you're silencing a tool, not improving code — stop.

## Phase 1 — Scan for hard facts first

The user points at one thing — "next Foo.kt", "is this a smell?", "this feels hacky", "is X dead?",
"can we fold Y?". Before reading for *meaning*, gather cheap, objective signals about the file's *shape*.
You're not judging the logic yet — you're finding where the problems most likely are, so the close read
is aimed, not spread evenly over code that's fine.

- **Total length.** `wc -l`, or just note it. A very long file is usually doing too much — a split
  candidate, and a cue to watch for mixed concerns.
- **Deepest indentation.** Which lines sit deepest? Deep indentation is deep nesting is tangled control
  flow — the prime candidate for early returns, extraction, or flattening. Cheap to spot: scan for the
  lines carrying 4+ or 5+ levels of leading whitespace and start there.
- **What reads complex at a glance.** Dense one-liners, long call chains, long parameter lists, big
  `when`/`if` ladders, a function too tall for the screen. Flag these *before* you understand them — a
  first impression of "ugh, what is this" is data about readability, which is the whole point.
- **Oversized comments.** A comment that needs a paragraph is itself a signal: it usually means the code
  under it is too complex or poorly structured to speak for itself. Flag it — the fix is often to
  restructure the code until the comment shrinks, not to polish the prose. (A genuine hazard-*why* that
  truly needs the length is the exception; `code-comments` tells the two apart.)

The output is a short **"here's where to look" map** — the two or three spots the shape flags. It names
suspects; it does not convict them. A long file or a deep nest is a *prompt to look*, not a defect on its
own — plenty are perfectly fine, and Phase 2 is what decides. Don't let the scan become the review.

## Phase 2 — The critical pass (per file or concern)

Aim these steps at the spots Phase 1 flagged, plus the specific construct the user asked about:

### 1. Read the whole thing, freshly
Read the current file top to bottom. **Re-read if it may have changed under you** — linters reformat and
users edit files mid-session, so an edit built on a stale read will fail or clobber. If a tool reports
"file changed since read," re-read before editing rather than forcing the old text.

### 2. Hunt for genuine wins, and name the non-wins
Look for changes that make the code *read better to the next person*, not just satisfy a rule. Apply the
honest test to each candidate.

One win the Phase 1 scan can't point you at is **duplication**: a helper that reimplements another helper,
the parser, or a sibling that already exists. Shape signals (length, nesting, comment size) are blind to
it, because each function reads fine on its own; it only surfaces here, on the semantic read. So when you
touch a helper, ask "does this already exist?" before polishing it in place.

Equally important: **decide what to leave alone, and say so.** Resisting a tempting-but-harmful change is
a first-class result, not a non-action. Things worth stating out loud:
- A repeated 3-line shape you did NOT extract, because the generic helper needs variance/callback
  gymnastics that read worse than the honest repetition.
- A long doc comment you KEPT, because it documents a non-obvious hazard the code can't carry.
- A `@Suppress` you removed because the warning it hid can't actually fire.

### 3. Ground every claim in evidence *before* you assert it
Never call something "dead", "unused", "safe to remove", "still needed", or "equivalent" from memory.
Recall about your own codebase is unreliable and confidently wrong. Check first:
- **"Is X used / dead?"** → `grep` the call sites across source AND tests; a hit inside a test *name* or
  a comment is not a real use, so read the matches, don't just count them.
- **"Does this symbol do what I think?"** → read it or use the LSP; don't recall its behavior.
- **"Is this change behavior-preserving?"** → find the tests that pin it; if none exist, say so.
- **"Will this compile?"** → for anything non-trivial, compile before claiming it works.

This is where you earn trust: pushing back with evidence ("it's live in these two spots, here's exactly
what breaks if it's removed") is far more valuable than agreeing. Being wrong about "dead code" is
expensive and erodes the user's confidence in every other claim you make.

### 4. Apply fixes; escalate design changes
Doc fixes and clear code fixes: just do them. **Design changes** — new files, moved responsibilities, a
changed public/binary surface, anything reshaping structure — get written to a `todo.md` for the user's
review, or presented as a plan first. Don't reshape architecture unprompted. (If the user has their own
standing rule for this split, follow theirs.)

### 5. Comments: earn or delete
Apply `code-comments`. In short: keep or write a comment only for a *why* the code cannot carry — a
hazard, an ordering constraint, a workaround for an external quirk, a non-local contract. Delete
restatements and step-by-step narration. Doc headers are one line of purpose.

A real hazard earns a comment, not unlimited length. "Earned" and "how long" are separate axes: that a
subtlety deserves *a* comment says nothing about how much it deserves. Compress even a hazard comment to
the hazard itself (what breaks, and why), and let the code below carry the mechanics. Narrating a
generated script or an algorithm line-by-line is bloat even when the thing it describes is genuinely
arcane. If you catch yourself defending a comment's length with "but it's subtle," that justifies a
comment, never a wall of text. When you keep a longer one, say why in the report so it reads as a
deliberate choice, not an oversight.

The comment you are most likely to *miss* is not the long one you compress but a restatement sitting on a
*short, obvious* body. Attention gravitates to the walls of text, so a one-line doc over a five-line `when`
that mirrors its own branches sails through untouched while you polish prose three functions down. Apply the
plain test: if reading the code is faster than reading the comment, the comment is negative value, so delete
it (a trivial body needs no doc header at all). Then check its siblings the same way you would a code change:
identical trivial factories all keep the comment or all lose it, never a split.

### 6. Verify green
After each change, run the project's fast build+test command and confirm it passes before reporting
done. Discover that command once per project (a `test`/`build` task, a `Makefile` target, the CI
invocation) and reuse it every iteration. Tail the result and read it — never report a green you didn't
actually see.

### 7. Report tightly
Two parts, every time:
- **What changed** — the key snippet and its one-line *why*.
- **What you deliberately left alone and why** — the anti-churn discipline made visible. This is what
  makes the review trustworthy: it shows you considered and *rejected* the obvious "improvements,"
  rather than just not noticing them.

Keep it short. Don't narrate the search or list every grep — the conclusion is the product.

**Report shape (real example):**
> **Changed** `command()` — the no-help overload is now a surface-level delegate
> (`fun command(name, block) = command(name, help = "", block)`), dropping the identical `override` in
> the impl. "No inline help means empty help" is a contract fact, not a per-impl choice, so it belongs
> once on the API surface.
> **Left alone** — `argument`/`option`/`flag` have no KDoc while `command`/`group` do. That's the *right*
> asymmetry (the documented ones have non-obvious behavior; the others are self-evident from name +
> return type), not a gap to paper over.

## Bigger design changes

When the right fix is structural (splitting a file, deleting a pattern, changing how a subsystem works):

1. **Map the blast radius first.** `grep` every consumer; read the callers, renderers, and tests that
   depend on the thing. Know what breaks before you propose anything.
2. **Present a plan**: what gets deleted, what gets added, which tests change. Concrete numbers help
   ("~7 files, deletes more than it adds").
3. **Push back honestly.** If the user's proposed fix is worse than the status quo — it spreads
   knowledge across more places, reintroduces a cast, widens a published API surface — say so with the
   *specific* cost, and offer the alternative you'd actually pick. A cleaner-looking change that is
   worse is still worse.
4. **Confirm before a multi-file rewrite.** Wasted implementation work costs more than one clarifying
   question. Once confirmed, execute fully and verify green.
5. **Expect to discover a snag mid-flight** (a renderer needs the very thing you were deleting).
   Re-scope honestly and tell the user, rather than forcing the original plan to completion.

## You're doing it wrong if...
- You changed one unit to satisfy a threshold but left its identical sibling untouched — the change is
  tool-driven, not design-driven, so it's either worth doing everywhere or not at all.
- You asserted "this is dead / unused / equivalent" without grepping or compiling.
- You extracted a helper used once, or DRY'd two things into a coupling they shouldn't share.
- You restructured a block but didn't re-read the result against the language's formatting conventions
  (no semicolons, blank-line grouping into logical phases, line length, trailing commas, call chains past
  two calls broken one-per-line). A fresh rewrite
  is where your attention is on logic, so it's exactly where those mechanical rules slip — catch them right
  then, not when someone points at one. (These live in the language skill, e.g. `kotlin`; deslop's job is
  to make you re-check after every rewrite.)
- Your report lists what you changed but not what you left — the reader can't tell judgment from churn.
- You said "done" without running the tests.
