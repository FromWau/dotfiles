---
name: tier-qa-loop
description: >-
  Polish an API, a library, a CLI, a UI or a UX flow in rounds until blind reviewers rate it high A or S
  tier. 3 to 5 subagents, each with its own realistic task (build a small app, port a script, wire up a
  screen), work blind: they may read only the docs (README, guides, published docs) and any snippet the
  orchestrator hands them, never the source. Each returns a tier (F, D, C, B, A, S), what in the docs or the
  API pulled the rating down, and what would bump it, with before/after sketches. The user steps through the
  findings one by one and accepts or refuses each; accepted ones are fixed test-first, a deslop and review
  pass follows, and the same agents re-run their apps against the new version and rate again. Use it
  whenever the user wants "blind feedback", "QA agents", "rate this API/UI/UX", "what tier is this", "is it
  S tier", "make it S tier", "polish until it is great", "dogfood with subagents", "ask the agents again",
  "another QA round", or a review that also validates the docs. For a one-off black-box usability pass with
  no rating or loop, multi-agent-qa's black-box section is enough; for white-box correctness bugs, use
  multi-agent-qa.
---

# Tier QA loop

Blind reviewers use the thing the way a newcomer would, through its docs alone, and rate it. The rating is
the loop's progress bar; the "why not S" lists are its work queue. Because reviewers see only the docs,
every round tests the docs as hard as the API: a missing package name, a wrong example or an undocumented
trap shows up as friction, so the docs get polished along with the code.

Companions:
- **decision-walkthrough**: the format for stepping the user through findings, one decision per message.
- **bug-proofing**: every bug a reviewer reports is reproduced, pinned in a failing test, then fixed.
- **deslop** and **code-comments**: the cleanup pass after each round's fixes.
- **multi-agent-qa**: its white-box loop is the "review" half of "deslop + review" on a large diff.

## The round

```
1. Scope + personas ──> 2. Blind QA (parallel) ──> 3. Verify + consolidate
        ^                                                    │
        │                                                    v
8. Re-QA, same agents <── 7. Commit <── 6. Deslop + review <── 5. Fix test-first <── 4. Step through with user
```

Stop when every reviewer rates A with an overall score of 8.5 or more, or S, when the user says stop, or when a round's findings are all
things the user already declined (see "Stopping" below).

### 1. Scope and personas

Settle what is under review (one module, the whole library, a screen, a flow) and which docs are in bounds.
Then pick 3 to 5 personas, scaled to the surface: 3 for one module, 5 for a whole product. More than 5
costs a lot and mostly repeats; at 10 or more, warn the user about usage limits first.

Each persona gets a **different realistic task** that exercises a different part of the surface. Three
agents on the same happy path find the same friction three times. Good spreads:
- **API or library**: a backend service, a mobile app with coroutines or async, a library author building on
  top of it, someone migrating from a rival library.
- **CLI**: a first-time user, a script author piping its output, someone automating it in CI.
- **UI or UX**: a first-time user on a phone, a power user doing the task repeatedly, a user with a screen
  reader or keyboard only.

Write the task so it hits the risky parts you know about (errors, cancellation, concurrency, edge cases),
without telling the agent what you suspect.

### 2. Blind QA, in parallel

Give each agent its own isolated workspace so they cannot clobber each other or the user's tree, and so
parallel builds do not fight over one project. For a git repo, use a detached worktree per agent next to
the repo. Uncommitted work needs care: see "Workspaces" below.

The brief is in `references/briefs.md` (first round, later rounds, and the "is it S tier" question). The
rules every brief carries:
- **Blind**: read only the named docs and any snippet you give them. No source, no library build files, no
  caches or jars, no notes files. If they cannot proceed without the source, that is a docs finding: log it
  and stop guessing there.
- **Compiler or runtime errors are evidence**: quote them verbatim.
- **Build something real** in their own module, with tests, and try to break the parts in scope.
- **No commits**, never touch the user's checkout.
- **A structured report** (below), under a word budget, blunt.

Send all briefs in one message so they run at once. Run them in the background and tell the user what each
persona is doing while they work.

### 3. Verify and consolidate

Reviewers are sometimes confidently wrong: they report a doc gap that was fixed after they started, propose
a design that cannot compile, or misread a rule. Before anything reaches the user:
- **Check each claim against the code**: grep the symbol, read the signature, or compile a tiny probe in a
  scratch file you delete afterwards. A probe settles "does this compile" faster than reasoning.
- **Dedup across reviewers**, count how many hit each point ("3/3"), and rank by severity first, agreement
  second: with deliberately different tasks most real findings come out 1/3, and a verified wrong doc sentence
  outranks a 3/3 nice-to-have.
- **Sort** into: bugs (feed the fix loop), doc gaps (usually no decision needed), API papercuts, and
  structural redesigns (always the user's decision).
- **Separate "already decided"**: anything the user declined in an earlier round goes in its own list, so
  it is visible but not re-litigated.

Present one summary table: each reviewer's tier and score next to earlier rounds (kept in the project's notes or
decisions file, with the round number and whether the panel was fresh or resumed), what they confirmed fixed,
then the ranked findings with how many reviewers hit each.

### 4. Step through with the user

Use **decision-walkthrough**: one finding per message, Before / Change (why, evidence) / After, lettered
options with one marked Recommended. Doc fixes and clear bugs can go as one batch ("these need no decision,
I will just fix them"); API changes and redesigns go one by one.

Rules that keep it honest:
- **Verify before you recommend.** If a probe compile shows your option A cannot work, say so and reopen
  rather than ship it; if new evidence changes a decision the user already made, name that decision.
- **Say when an option reverses an earlier decision**, and record the reversal.
- **Record every answer at once** in the project's notes or decisions file, with the evidence. Decisions
  that live only in chat are lost at the next compaction.
- **When the user steps outside the format** (a question, "why not X?"), answer it properly with examples,
  then resume.

### 5. Fix test-first

Accepted bugs and behaviour changes go through **bug-proofing**: a test seen failing for the right reason,
then the fix, then the suite green on every target. For a concurrency claim, a stress test that counts
failures before and after the fix beats a single run. Mutation-check the important rules: break the fix on
purpose and confirm a test catches it; a test that passes with the fix removed guards nothing.

A batch of fixes can go to one TDD subagent working in place (or several on disjoint files). Give it the
exact findings, the tests to write, the style rules, and the verify commands; then verify its report
yourself, including reading the key code.

### 6. Deslop and review

Before re-QA, run **deslop** over the round's diff, docs and build files included, and a review: read-only
reviewer subagents split by area for a large diff (they report, they do not edit), or yourself for a small
one. Reviewers find what testers do not: tests that cannot fail, races, stale docs, dropped exceptions.
Fix what holds up, test-first, and check that "no warnings" is real: a build tool may skip up-to-date tasks
and their warnings, so force a fresh compile for that claim.

### 7. Commit

Commit when the user asks. If the user wants all of one feature in one commit, fold each round into it with
an amend while it is unpushed, and keep the message current. Leave untracked notes files out.

### 8. Re-QA with the same agents

Resume the same agents (send them a message rather than spawning new ones): they keep their app and their
earlier findings, so they can check item by item what got fixed and port their code to the new API. Point
each at a fresh workspace with the new version, and tell them what changed so they verify rather than trust.

The trade-off: resumed agents remember the old docs, so they test fixes well but are no longer blind
newcomers. Every few rounds, or before calling it done, consider one fresh agent with the original brief to
check the docs from zero.

## The report each reviewer returns

Ask for exactly this shape, so rounds compare:
1. **What they built**: the code that uses the thing under review, trimmed.
2. **Friction log**, most important first: what they expected, what was true, how they found out, with the
   compiler error or the doc sentence quoted. This is "what in the code or docs pulled the rating down".
3. **What felt good**: the parts to protect in any redesign.
4. **Unsafe, confusing or surprising**: traps a newcomer would fall into, each with the code that hit it.
5. **Doc fixes**: concrete sentences missing or wrong.
6. **Tier and scores**: F, D, C, B, A or S, plus 1 to 10 for discoverability, docs, naming, safety and
   overall, next to earlier rounds.
7. **Why not S**: what keeps it from S, ranked, and **what would bump it**: before/after sketches (what they
   write today, what they would like to write), each marked "must for S" or "nice-to-have".

On later rounds, add item 0: each earlier finding marked fixed, not fixed, or made worse, with evidence.

### Tiers

| tier | meaning |
|---|---|
| S | Would pick it over the best alternative for their task; nothing left that blocks shipping on it |
| A | Solid; a few rough edges or doc gaps, none that cause bugs |
| B | Usable, but real friction: guessing, workarounds, a trap or two |
| C | Gets the task done with significant pain or unclear docs |
| D | Barely usable; major gaps or misleading docs |
| F | Could not complete the task |

## Workspaces

- **Committed state**: `git worktree add --detach ../<name>-trial-<n> HEAD` per agent.
- **Uncommitted state**: create the worktree at HEAD, then apply `git diff HEAD --binary` (not plain
  `git diff`, which misses staged changes such as a rename) and copy the untracked files listed by
  `git ls-files -o --exclude-standard`. Check each worktree's status count matches the user's tree.
- Copy the ignored local config (`local.properties`, `.env` and the like) into each worktree, and compile a
  one-line probe against the setup the brief describes before sending any brief: a setup error found by three
  agents costs three rounds of their time.
- Make one extra worktree for your own probes in step 3, so they never build in an agent's tree.
- Remove the worktrees when the round's reports are in (`git worktree remove --force`, then `prune`).
- An agent that stops on a network or API error has not failed the task: resume it with a short message to
  continue where it left off.

## Stopping

Stop and report when one of these holds:
- every reviewer rates A with an overall score of 8.5 or more, or S, and their remaining items are nice-to-haves;
- a fresh panel sets its own baseline: compare it with the last fresh round, not with resumed agents, who remember the fixes and rate higher, and stop on a fresh panel only when it meets the rule above itself;
- the user says stop;
- the remaining items are all things the user already declined, or things no change to this project can
  fix (a limit of the language or platform; propose separate tooling, such as a lint rule, instead).

Final report: the tier and score table across all rounds, what changed per round, what was declined and why,
what stays open, and what was never run on some platform or device.

## Pitfalls

- **Presenting a reviewer's claim unverified.** Their sketches are wishes; some cannot compile. Probe first.
- **Reviewers re-raising declined items** every round. Keep a declined list in the notes and give it to them
  as "already decided, do not re-raise unless you have new evidence".
- **Fixing your own overclaims last.** Reviewers often find that a doc sentence you wrote promises more than
  the code does; that is a top-priority doc fix, not a nit.
- **Parallel builds in one tree.** Agents that build need their own worktree; read-only reviewers must not
  build at all.
- **Quiet builds hide warnings.** A `-q` (quiet) build hides compiler warnings; probe warning claims without it.
- **Stale or skipped warnings.** A green build with cached tasks says nothing about warnings in unchanged
  modules; force a fresh compile before claiming none.
- **Misreading what the user asked for.** "Ask the agents again" means the QA personas, not a code review;
  when a request names agents, check which set they mean.
