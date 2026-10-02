# The standing record

A friction log is disposable. That is only safe if what outlives it has somewhere to go. This file is the
other half: the files that persist, what belongs in each, and the drift that eats them.

Three kinds of knowledge survive a pass, and each gets its own file because each is read at a different
moment:

| File | Tracked | Holds | Read when |
|---|---|---|---|
| `docs/friction/LEDGER.md` | yes | what is **settled** | before a pass, to learn what not to re-file |
| `docs/friction/YYYY-MM-DD-fixes*.md` | yes | one row per defect of **one round** | while fixing, and to prove a fix landed |
| `todo.md` at the repo root | yes | what is still **open**, as tick boxes | when picking up work, and at session end |

The friction logs themselves (`docs/friction/YYYY-MM-DD-<name>.md`) sit beside these as the evidence. A
log filed in that directory stops being the untracked, deletable kind described in the main skill: it is a
pass's raw observations, kept because the trackers cite it.

## The ledger: what is settled

Its reason for existing, in its own words: each pass had so far been told by hand what not to re-file, and
that instruction died with the prompt. Four things belong in it and nowhere else.

- **Settled: do not re-file these.** Each entry is a found, judged and deliberately kept behaviour, with
  the reason. The discipline that makes it work: report one only if you find a *consequence* that is not
  already recorded. Without that escape hatch the ledger becomes a gag rather than a filter.
- **Fixed: a recurrence is a regression.** Past fixes, grouped by the round that made them. This is the
  highest-value section for a reviewer: anything here that fails again goes to the top of their log flagged
  as a regression, which is a far stronger finding than a fresh one.
- **Where to push.** Rewritten after every pass: what came back clean, and what is still dark. Separate
  "exercised, aim elsewhere" from "never exercised", because they mean opposite things for the next pass.
- **The public surface and the promises worth attacking.** Dated, so a reader can tell whether it is current.

Keep the passes themselves as a table with one row each: pass, log file, finding count, outcome. It answers
"has anyone looked at this before" in one glance, and it is where a missing log becomes visible.

## The fix trackers: one round, one row per defect

One file per round of passes, so the ledger does not have to hold detail that stops mattering once a fix
lands. What makes a tracker trustworthy:

- **Status is the truth of the working tree, not an intention**: `open`, `fixed` (code and test landed,
  gate green), `needs a decision`, `rejected`. Say that rule at the top of the file, because a reader has
  no way to tell an aspiration from a fact otherwise.
- **Every row was reproduced before it was believed**, and every fix lands with a test that fails before it
  and passes after. Name the gate.
- **Keep the rows that did not become fixes**, in their own sections: `Rejected`, `Closed: not wanted` (an
  owner's decision, with the decision), `Closed: documented, because it cannot be typed` (with what was
  measured), `Corrected` (a finding whose detail did not survive reproduction), `Left alone deliberately`.
  A tracker that lists only fixes reads as a scoreboard; one that records the judgements is a record.
- **`Found while fixing`** is worth its own section. A fix that exposes a wider cause than the pass
  reported is the most useful thing in the round, and it has no row of its own otherwise.

## `todo.md`: open items with verdicts

The ledger says what is settled and a tracker covers one round. Neither holds "this is still to do", which
is how an item found at the end of a session dies in a chat message. `todo.md` at the repo root is that
list, and it is tracked, because losing it is the whole failure it exists to prevent.

The format, which is the part worth copying:

```markdown
- [ ] **1. The README documents a `when` branch that cannot fire.** `config/README.md:410`
  The prose says a damaged file is a `WriteFailed` whose cause is `RestoreFailed`. `asWriteError` maps
  that cause to `Damaged`, and the only other construction uses `TooLarge`, so the branch is unreachable.
  A caller who follows the sentence never learns the file was damaged.
```

and once closed, moved to a `Done` section at the foot:

```markdown
- [x] **1. The README documents a `when` branch that cannot fire.** `config/README.md:410`
  **Verdict 2026-10-02:** sentence deleted; the error table above it already documented `Damaged`. Gate
  green, 359 jvm and 349 linuxX64. The rule went to the ledger's Settled section.
```

The rules that carry their weight:

- **Numbers are never reused and never renumbered**, so an item can be named by number from a commit
  message or a QA log. Same reason friction-log entries are append-only.
- **A verdict, not a tick.** What was decided or done, how it was proved, and the date. A bare `[x]` tells
  the next reader nothing about whether the thing was fixed, refused or found to be imaginary, which is
  exactly what they need to know.
- **Keep ticked items in the file.** The verdict is the point. Delete nothing; the file is a record, and
  its length is not the cost it looks like.
- **Name the file and line.** A reader can then check a claim instead of taking it on trust, which is the
  same evidence rule the capture phase runs on.
- **Group by what the item needs**, not by severity: defects, decisions that are the owner's, candidate
  work, release blockers. Severity is already in the prose, and the grouping tells a reader which items
  they can act on alone.
- **Do not restate what the ledger owns.** Coverage gaps belong to the ledger's "where to push", which is
  rewritten after every pass; copying those rows into `todo.md` creates a second record that will disagree.
  Say in `todo.md` that they live there and why, so the omission does not read as an oversight.

An item whose outcome becomes a standing rule gets written into the ledger's Settled section as well, and
its verdict says so. That is the one legitimate duplication: the ledger holds the rule, `todo.md` holds the
history of deciding it.

## The drift, which is what actually goes wrong

In a repo running this system over 18 QA passes, every late-discovered defect was in the record rather
than the code. The pattern is always the same: something changed and the sentence describing it did not.

- **A doc outliving the code it described.** A README paragraph told callers to match an error shape that a
  later fix had made unreachable, so following the published advice produced a branch that never runs. The
  table four lines above it was already correct, which is why nobody noticed.
- **A settled ruling whose stated mechanism was false, and whose pointer dangled.** The ruling was right,
  its reason was not, and the other repo's doc it cited as evidence had since dropped the claim. A ruling
  carries "do not re-file this" authority, so a wrong reason inside one is expensive: the next pass trusts
  it instead of re-deriving it.
- **A tracker row saying "left alone deliberately" that a commit had since fixed**, because the commit
  touched the code and not the tracker.

One habit prevents all three: **a change that invalidates a written claim updates that claim in the same
commit.** The cheap audit, worth one pass per round, is to grep the record for claims about the code and
check them, exactly as `deslop` grounds a dead-code claim. A record nobody verifies is the copy that rots,
because no compiler reads it.

Two reading habits from `deslop` apply directly here and are worth re-reading before trusting an entry:
a record may have been written to describe a defect rather than to specify behaviour, and a test name or
doc sentence is not independent evidence of intent.

## When this is worth setting up

The full three-file system earns its keep when **more than one pass crosses the same surface**: repeated QA
or review rounds, a library with outside consumers, a release boundary, or a cross-repo dependency where
one side's fix changes the other's behaviour. The cost is one file to update per round, and what it buys is
a pass that spends its time on new ground.

For a single branch, `deslop`'s one clause is the whole system: open design items go in a `todo.md` for the
user's review. Add the ledger when a second pass arrives and you find yourself typing the already-known
list by hand.
