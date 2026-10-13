---
name: bug-proofing
description: >-
  Prove a bug before fixing it, in three steps: verify or refute it by reproducing it, pin the correct
  behaviour in a test you watch fail for the right reason, then fix test-first. Use this whenever you, a
  subagent, a code-review or QA pass, or the user finds, reports or merely suspects a bug: "is this a bug?",
  "verify the findings", "are you sure?", "fix this bug", "this breaks when…", a review agent's list of
  findings, a failing behaviour seen in a real run, or your own "this probably doesn't handle X". Also use it
  when a finding rests on how an external tool behaves (a shell, the OS, a library, a protocol), since those
  claims are the ones most often recalled wrong. Do not jump straight to a fix for a suspected bug; run this
  first, even when the fix looks obvious.
---

# Bug proofing

A suspected bug is a claim, not a fact. Claims come from recall, from a reviewer agent that skipped
verification, from a doc that described the code instead of the intent, or from reading code without
running it. Each source is wrong often enough that fixing on faith ships changes for bugs that do not exist,
misses the real one, and leaves nothing behind to stop it coming back.

The three steps turn the claim into evidence and the evidence into a guard:

1. **Verify or refute**: reproduce it, or show it cannot happen.
2. **Pin the correct behaviour**: a test that fails now, for the reason the bug gives.
3. **Fix test-first**: the smallest change that makes the test pass, with the suite green.

## 1. Verify or refute

Treat every finding as a candidate, including your own and especially a subagent's. Before reproducing, sort
out what the claim rests on: something read in this code, or something recalled about a tool. Mark the
recalled parts; they need their own check.

Reproduce with the smallest setup that exercises the real behaviour:

- **Prefer the real thing when the claim is about the real thing.** A claim about how fish, bash or PowerShell
  hands words to a completion needs that shell running, not a mock of it: a mock encodes your assumption,
  which is exactly what is in question. A pseudo-terminal, a throwaway stub on `PATH` that logs its
  arguments, or the tool's own non-interactive mode usually gets there in a few lines.
- **Check external behaviour at the version actually installed.** Read the tool's source or changelog at
  that tag when its docs are silent; behaviour shifts between releases (a completion API cut the command
  line in 3.x, stopped in 4.0.0, and cut it again from 4.0.6 on).
- **A probe beats a guess.** When it is unclear what the code does, print what it does: a temporary test that
  logs the values in question settles it in one run. Delete the probe afterwards.

End with a verdict for each finding:

| verdict | meaning | next |
|---|---|---|
| **Confirmed** | reproduced, with the evidence | steps 2 and 3 |
| **Refuted** | shown not to happen, with the evidence | report it; change nothing |
| **Not a bug** | real behaviour, but intended or a design choice | explain; ask the user if the design is open |
| **Can't verify here** | needs what is missing (an OS, a version, credentials) | say what is missing; fix only with the user's agreement |

A refutation is a result, not a failure. Report it with the evidence that settled it, so nobody chases the
same claim again.

## 2. Pin the correct behaviour in a test

Write the test for the behaviour that should hold, not for the bug. Name it for the contract it pins (a
`code-comments` rule: `a variadic input leaves out the word under the cursor`, not `...regression...` or
`...isFixed`). Put it next to the tests of the same kind, at the level the bug lives at: a unit test for
logic, a test against the real environment for an integration bug.

Then run it and **watch it fail, for the right reason**. Read the failure message, not just the red count.
A test fails or passes for the wrong reason more often than it seems:

- A usage-error test expecting exit 2 passes before the feature exists, because the option it uses is
  unknown and that is also exit 2. Assert the message too.
- A test typing `re` passes against a bug that only shows for the finished word `red`, because removing `re`
  from a list does not remove `red`. Use the input the bug report uses.

If the new test passes when you expected a failure, stop: either the bug is not real (go back to step 1 and
refute it) or the test does not reach the scenario. Probe what the code actually does before deciding which.

When the test needs something a machine may lack (a shell, a service), decide how it behaves there with the
user's convention in mind (skip, or pass with a note) rather than letting it fail or silently pass.

## 3. Fix test-first

Make the smallest change that turns the test green, then run the whole suite on every target the project
builds, not just the new test.

Prove the test actually guards the fix: put the old code back for a moment (`git stash push -- <file>` on
the source file), confirm the test fails, then restore it. A guard you have not seen fail is a guess.

Expect the new tests to catch the fix itself. A test that runs the real environment often finds what the fix
broke (a renamed variable colliding with one declared later in a generated script, for instance). That is
the method working; fix it and rerun.

Several findings can be handled as a batch: all reproductions first, then all tests (each seen failing),
then the fixes. What matters is that no fix lands without a test that was red before it.

## Report

Lead with a table, one row per finding:

| finding | verdict | evidence | test | fix |
|---|---|---|---|---|

Then say plainly what could not be verified and why, which tests were seen failing before the fix, and what
was left alone. Keep refuted and not-a-bug rows in the table; they are part of the result.

## Pitfalls

- **Fixing on a reviewer's word.** A review run without its verification step hands you candidates. One
  confirmed bug does not vouch for the rest of the list.
- **Trusting your own earlier verdict.** A behaviour you once filed as "consistent" can be the bug a later
  reviewer finds. Re-derive instead of quoting yourself.
- **Docs and tests that describe the bug.** A doc or test written while tracing a defect can state it as a
  rule. Check it against what a user would expect, and against the nearest sibling case that works (see the
  `deslop` skill on documentation that encodes a defect).
- **Version drift.** Source read at one release proves nothing about another; check the installed version.
- **Leftover probes.** Delete temporary probe tests and scratch scripts before reporting.
