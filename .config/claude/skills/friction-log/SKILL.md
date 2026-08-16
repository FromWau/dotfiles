---
name: friction-log
description: Keep a FRICTION_LOG.md at the repo root capturing implementation and usage feedback AS IT HAPPENS — bad or wrong docs, dead paths walked, misleading errors, missing API surface, build/dep footguns, confusing names, "wait why is this here" moments — then replay it into upstream feedback or local cleanup. Use this continuously (even unasked) whenever adopting or migrating onto a library/framework/tool, porting code between APIs, evaluating a dependency, or implementing/debugging anything non-trivial, and whenever the user says "friction log", "log that", "append to the log", "clean up", "make it PR ready", "prep for review", or "we're done with the feature".
---

# Friction Log

## Why this exists

The highest-signal feedback about a library, tool or codebase is the friction hit
*while building something on top of it*. That signal is perishable: once the thing
works you have adapted to the bad parts and forgotten what cost you twenty minutes.
Reconstructing it later is lossy and self-rationalising ("eh, it was fine").

So: **capture raw and immediately; act on it deliberately later.** The two phases are
separate because the judgement differs — capture is fast and generous, replay is
skeptical and selective.

The log's most valuable output is usually **feedback the author of the thing can act
on**. When adopting your own or a colleague's library, entries convert almost directly
into issues, spec feedback, or doc fixes. Write them so they can.

## Where the log lives

**`FRICTION_LOG.md` at the repo root.** One file per repo, not per branch: a migration
outlives branches, and the file being right there is what makes "append as it happens"
actually happen.

**It is never committed, and never ignored either.** Leave it untracked, so `git status`
reports it on every command:

```
$ git status --short
?? FRICTION_LOG.md
```

That line is the point. The log is disposable and only useful while its findings are
open, so the real risk is not that it gets committed by accident — it is that a finished
one sits in the repo for months with nobody aware it is there. An untracked file nags
until someone deals with it; an ignored one is invisible, and invisible is how a stale
log survives.

So do **not** add it to `.gitignore` (a tracked file, so the entry would reach every
collaborator) and do **not** add it to `.git/info/exclude` (hides it locally, which is
the failure above). The discipline is simply never to `git add` it.

If the user asks for the log somewhere else, follow them; the root is the default, not
a rule.

## Mode 1 — Capture (during implementation / debugging)

When you hit friction, append an entry **right then**, before continuing. Do not batch
at the end of a session; batching is how the details are lost. Keep it to well under a
minute so it never reshapes the actual work.

### What counts as friction (log it)

- **Docs that are wrong, missing, or aimed at the wrong reader** — a quick-start that
  does not compile, an import that does not exist, a section that answers the adjacent
  question but not yours.
- **A dead path walked.** You reached for the mechanism that looked right and it was
  not. Log the mechanism, the reason it looked right, and why it was not.
- **A misleading error message** — one naming a token, file, or symbol that is not in
  what the user wrote or did.
- **Missing surface**: the library cannot express a shape your program genuinely has.
  Record the shape, not just the wish.
- Build/dependency/codegen/toolchain footguns: stale generated output, publish-loop
  indirection, version-identity traps, resolution order surprises.
- A name that says X but the thing does Y; a comment that contradicts the code.
- Having to grep 3+ places to answer "where does this value come from".
- Duplicated source-of-truth; tramp data; dead code you had to *prove* was dead.
- Any genuine "wait, why does this work" moment.

### What is NOT friction (skip it)

- Style nits a formatter or linter would catch.
- "I would have done it differently" with no concrete cost.
- Your own transient unfamiliarity that resolved in a minute — unless it would bite
  the next person too.

### File header

Start a new file with the goal, the scope decision, and the legend, so an entry read in
six months still parses:

```markdown
# Friction log: <what is being built or migrated>

Append-only. Entries are never rewritten, even when a later entry proves one wrong; a
correction is its own entry that references the earlier one. Written while the context
is fresh, not at the end of a session.

Target: <the concrete goal, with links>

Scope decided: <the one or two decisions everything else follows from>

Each entry: **Wanted / Got / Severity / Doing / For <upstream>.**

Severity scale: `paper cut` (seconds lost) / `detour` (minutes, wrong path walked) /
`blocker` (cannot proceed without a decision or an upstream change).
```

Group entries under `## Phase N: <name>` headings as the work moves through stages.

### Entry format

```markdown
### <N>. <YYYY-MM-DD HH:MM> - <one-line title, the finding not the topic>

**Wanted:** what you were trying to do, and why.

**Got:** what actually happened. Paste the real output — compiler error, test
result, stack trace, command output. Evidence beats description.

**Severity:** paper cut | detour | blocker, plus what it actually cost.

**Doing:** the workaround or decision taken, and anything deliberately NOT done.

**For <upstream>:** the actionable feedback for whoever owns the thing. Omit when
the friction is your own error, and say so.
```

Number entries sequentially and never renumber. Titles should state the finding
("`numericAlias` looked like the answer; it is not"), not the area ("about aliases").

### Capture discipline

These are the rules that make the log worth reading later:

- **Append only.** Never edit an existing entry, even when it turns out wrong. A
  correction is a new entry that names the one it corrects ("RESOLVES entry 4",
  "corrects the framing entry 2 used"). The record of what was believed when is part
  of the value, and silently fixing it destroys it.
- **Timestamp from the clock**, not from memory. Run `date` if unsure.
- **Mark unverified claims in the entry itself**, in caps: `NOT YET VERIFIED:`. Then
  either verify before it leaves the log, or carry the marker outward. A friction log
  that launders guesses into confident feedback is worse than no log.
- **Log green results too**, when they close a question the log opened. A log that
  captures only failures misreports the project, and "the risky thing worked" is
  exactly what the next person needs.
- **Log your own mistakes.** Misread output, wrong grep, bad assumption. They are the
  entries that stop the same hour being lost twice, and they cost nothing but ego.
- **Separate measured from reasoned.** "Compiled it: <output>" and "follows from rules
  1 and 3" are different confidence levels and should read that way.

## Mode 2 — Replay & route

Triggered when the work lands, or when the user wants the branch review-ready, or when
it is time to report back to a library's author.

### Step 1: Re-validate every entry against the final state

For each entry: is it **still true**? Would it confuse **someone who is not you at that
moment**? Was the hypothesis right, now that you understand the thing far better?

Mark each: `confirmed`, `stale` (no longer applies), `was-just-me` (transient
unfamiliarity), `wrong` (the hypothesis did not survive understanding). Being honest
here is what keeps the output trustworthy; "this confused me only because I had not
read the code yet" is the most common and most valuable verdict.

### Step 2: Route each confirmed finding

Every confirmed entry goes somewhere:

- **Upstream feedback** — a docs fix, an issue, or a section appended to the owner's
  design spec. The `For <upstream>` fields are already most of this. Lead with what was
  measured, name what was inferred, and propose the smallest change that closes it.
- **Local cleanup** — `rename`, `extract`, `simplify`, `rewire`, `delete-dead`,
  `document`. Prioritise by (how often it confused x blast radius x inverse fix cost).
- **Out of scope** — real, but too big for now. Say so explicitly so it is not lost.
- **Drop** — stale, was-just-me, or wrong.

### Step 3: Propose, do not auto-apply

Present the routed findings as a short plan, cheapest-highest-value first. Structural
changes need explicit sign-off. Renames, dead-code deletion and doc fixes can usually
proceed once acknowledged.

When writing feedback into someone's document, **append a clearly marked feedback
section** rather than editing their prose. Same reason capture is append-only: the
reader needs to see what changed and why, and an argued diff is more useful than a
silent rewrite.

### Step 4: Close out

The log is disposable by design. Once its findings are acted on or filed upstream, it
can simply be deleted — that is the signal the work landed. If the work continues,
carry the still-open items forward into a fresh file. Never commit it on the way out.

Deleting it is the step that gets skipped, which is why the file stays untracked: the
`?? FRICTION_LOG.md` in every `git status` is the reminder. Treat a log still sitting
there after its findings shipped as the leftover it is.

## Operating principles

- **Capture is cheap and generous; replay is skeptical and selective.** Logging a
  maybe-wrong observation costs seconds; re-validation is the filter, not
  self-censorship at capture time.
- **The log serves the feedback, not the feature.** Never let logging slow or reshape
  the implementation. It is a side-channel.
- **Write for a reader who was not there.** Enough context to act, no reconstruction
  required.
- **The user can correct capture-time claims.** If they say "that is wrong, we do X",
  append the correction as its own entry rather than rewriting history.
