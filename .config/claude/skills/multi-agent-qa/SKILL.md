---
name: multi-agent-qa
description: >
  Run a blind, multi-agent QA pass on a codebase: partition it into focused domains, dispatch several
  independent read-only reviewer subagents in parallel, then consolidate, ground-check, and fix the
  findings with more parallel subagents behind a single build gate. Reach for this whenever the user asks
  to "QA", "run a QA session/pass/run", "blind QA", "next QA run", "audit the codebase", "review with
  subagents", "find bugs across the project", or wants many independent perspectives on code quality
  rather than one linear read. Also use it to harden a library before release or after a large refactor.
  For a library, it also offers a black-box usability mode: subagents build a small real project against
  the public API without reading the library's source, then report how it feels to use, what is awkward,
  what is done well, bugs hit through real use, and how the API could be restructured for better
  ergonomics (for example turning a call sequence into a DSL). Trigger that for "how usable is this lib",
  "review the API ergonomics", "dogfood the library", or a "black-box" or "usability" review.
  It composes with deslop (the per-file, no-churn discipline each reviewer applies) and
  dispatching-parallel-agents (the fan-out mechanics).
---

# Multi-Agent QA

Several independent reviewer subagents audit a codebase at once, you consolidate and verify their
findings, then fix them with more parallel subagents behind a single build gate. This finds more than one
linear read because the reviewers share no priors, and it stays honest because every finding is grounded
before it reaches the user.

Companions: **deslop** (the per-file "real improvements only, no churn" discipline each reviewer applies)
and **dispatching-parallel-agents** (one agent per independent problem, disjoint scopes).

## When to reach for this

Multiple independent perspectives beat one careful read when the surface is large (a whole module or
library), when correctness matters (pre-release hardening, post-refactor), or when the user explicitly
asks for a QA session/run/pass. For a single known file or a one-line question, just read it; this
workflow is for breadth.

Two lenses are available. **White-box** reviewers read the code and find correctness bugs (the loop
below). **Black-box** reviewers use the public API WITHOUT reading the code and find a library's
usability and API-design problems (its own section further down). For a library, run both: they catch
different things.

## The loop

### 0. Baseline green first
Map the code (source and test files, rough sizes) so you can partition sensibly. Discover the project's
fast build+test gate once (a `test`/`check` task, a Makefile target, the CI invocation) and run it BEFORE
any review, so every finding is weighed against a known-green tree. A reviewer that claims "X is broken"
is then judged against a baseline you have actually seen pass. On a multi-target project (for example
KMP), the gate must compile ALL targets and tests, not just the main one (see the
kmp-refactor-verify-all-targets memory); a main-target-only build hides broken native or test source sets.

### 1. Partition into blind reviewers
Split the work into focused, balanced domains, one per reviewer. Two partitioning styles:
- **First pass, by subsystem or concern.** Group files so each reviewer owns a coherent slice (parsing,
  rendering, builders, runtime/platform, and so on), sized so no one agent is overloaded.
- **Repeat pass, rotate the lens.** Do NOT re-run the same partition; a second identical sweep re-derives
  the first. Give reviewers new angles instead: an invariant/contract audit (try to break the claims the
  code's own comments assert), adversarial input fuzzing (pathological inputs hunting crashes and
  mis-routes), a test-suite audit (untested behavior, weak assertions), or cross-cutting integration.

"Blind" means each reviewer gets light orientation (what the project is, where public vs internal lives,
the error idiom, the targets) but NOT your expectations, your suspicions, or what you just changed. Tell
them which already-known items to skip, so their effort goes to new ground.

### 2. Dispatch reviewers in parallel (read-only)
Send all reviewers in one batch so they run concurrently. Non-negotiables in each prompt:
- **Read-only, and NO builds.** Parallel build daemons contend on one project (lock errors, thrash).
  Reviewers reason statically; the orchestrator runs the one build later.
- **Ground every claim.** Trace the exact code path before asserting, and give a concrete failure
  scenario (a specific input leading to the wrong output or behavior). Never guess.
- **Behavior, correctness, and contract only.** No style, naming, formatting, or comment churn.
- **Mark CONFIRMED vs PLAUSIBLE**, and rank by severity.
- **An empty result is a respected answer.** Do not invent findings to look productive.

### 3. Consolidate and INDEPENDENTLY verify
Dedup across reviewers, then ground the strongest findings yourself (grep, read, or a targeted run)
before presenting anything. Subagents are sometimes confidently wrong, and this step is where you catch
false positives: in practice it has caught an "inconsistency" that was actually intended behavior pinned
by an existing test, and a "cross-platform divergence" whose two paths in fact converge by design.
Present a ranked triage that:
- separates production bugs from test-coverage gaps,
- gives each finding a concrete repro, and
- includes an anti-churn "checked and deliberately left alone" list (this is what makes the review
  trustworthy; it shows you considered and rejected the obvious changes, per deslop).

### 4. Fix via parallel subagents (disjoint files)
Partition the fixes so no two agents touch the same file (one source plus its test per fix); then they
run concurrently without conflict. Same build rule: agents EDIT ONLY, no builds. Give each the exact
change and the assertion to add, and tell it to derive or verify expected values from the production
source rather than guess. Match the repo's conventions (formatting, comment density, error idioms).

### 5. One gate, then report
Run the single consolidated gate across all targets once every agent has returned. This doubles as the
safety net: a wrong expected value in an added test fails here and names the test. Never report a green
you did not see. Then report tightly: what changed (with the one-line why) and what you left alone.

## Black-box usability review (for libraries)

The white-box loop above reads the code and finds correctness bugs. It cannot judge how the library FEELS
to use, because you know how it works inside. For a library, framework, or any API others depend on, add
this complementary lens: reviewers who never read the implementation build something real with it and
report the consumer's experience. This surfaces the friction the author is blind to. White-box finds
"this is wrong"; black-box finds "this is hard to use" and "this should be shaped differently".

### How it runs
1. **Give each reviewer a realistic task, not the source.** For example "build a small CLI that parses
   these flags and subcommands with this library" or "port this argparse script to it". Tell them how to
   depend on it (the import or coordinate) and point them at the public docs (README, published API docs).
2. **They must NOT read the library's source to work out how to use it.** The whole point is to experience
   the API as a real consumer does, through docs, signatures, and autocomplete. If they cannot make
   progress without opening the implementation, that is itself a finding (a docs or discoverability
   failure); they log it and only then peek.
3. **Spawn several with DIFFERENT tasks or personas** (a first-time user, someone migrating from a rival
   library, an advanced or edge use case) so the fan-out covers different parts of the surface and
   different friction points, not the same happy path three times.
4. **Same honesty discipline.** Report friction with the concrete code they actually wrote and the exact
   spot it felt wrong, not vague vibes. Distinguish a real bug from a preference. "It was smooth, here is
   what worked" is a respected and useful result.

### What each reviewer reports
- **Ergonomics.** Could they accomplish the task, and how easily? Where did they stall, backtrack, or
  guess? How much boilerplate did the common case take?
- **What felt off.** Surprising names, confusing defaults, missing affordances, unhelpful error messages,
  types that did not guide them, ceremony that should not be needed.
- **What is done well.** The parts to protect from regression in any redesign.
- **Bugs hit through real use**, with a concrete repro (these feed the fix loop like any bug).
- **Structural and usability suggestions**, the bigger picture: naming, discoverability, defaults, and
  shape. For example "these three calls should collapse into one builder", "the error type should be
  sealed so a `when` is exhaustive", or "this reads like it wants to be a DSL framework rather than a
  call sequence".

### Consolidating black-box findings
Sort the results into three buckets, because they are handled differently:
- **Bugs** feed the normal fix loop (step 4 above).
- **Ergonomic papercuts** (a rename, a smarter default, a convenience overload) are small API fixes; treat
  them like other fixes, but remember they change the PUBLIC surface, so confirm scope with the user.
- **Structural redesign** (make it a DSL, re-layer the API, collapse a builder) reshapes the public
  surface and is a design decision, not a mechanical fix. Present these to the user with the reviewers'
  reasoning; do NOT auto-apply them. The library-design reference in the software-design skill is the
  companion for weighing them.

## Pitfalls
- **Never build inside parallel subagents.** One project, many daemons, lock contention. Edit or read
  only in the agents; run the one gate in the orchestrator.
- **Overlapping file scopes corrupt each other.** Partition fixer agents onto disjoint files.
- **Relaying a finding without grounding it.** Verify the top findings yourself first; one
  confidently-wrong finding erodes trust in every other one.
- **A real gap with a wrong premise.** A finding can point at a genuine hole yet propose a fix that does
  not compile or misstates the mechanism. Keep the gap, correct the premise (for example a "reverse-order
  chain" that does not type-check, where the guard it targets is still reachable another way).
- **Re-running the same partition on a repeat pass.** Rotate the lens so a second pass finds new things.
- **Main-target-only gate on a multi-target project.** Compile all targets and tests.
- **Letting a black-box usability reviewer read the source.** It destroys the consumer's-eye view that is
  the whole point; keep them to docs, signatures, and autocomplete, and treat "had to read the impl" as a
  finding.
- **Auto-applying a structural redesign.** An ergonomic papercut is a small fix; "make it a DSL" or
  re-layering the public API is the user's call, so present it with the reasoning rather than just doing it.

## Reviewer prompt skeleton
```
BLIND QA on <project>: <one-line orientation: what it is, public vs internal, error idiom, targets>.
YOUR DOMAIN/ANGLE: <files or lens>. Cross-check <the tests for this area>.
HUNT FOR: <the specific defect classes for this slice>.
DISCIPLINE: read-only; do NOT run the build (parallel agents share it); ground every claim by tracing
exact lines; behavior/correctness/contract defects only, no style churn; empty result is valid; mark
CONFIRMED vs PLAUSIBLE. Do NOT re-report: <already-known items>.
OUTPUT per finding: severity + confidence; file:line; one-sentence defect; concrete failure scenario
(exact input leading to the wrong behavior).
```

## Fixer prompt skeleton
```
Apply one surgical fix in <project>. Repo root: <path>.
THE FIX: <exact change> in <source file>. THE TEST: <exact assertion> in <test file>; derive expected
values from <production source>, do not guess.
CONSTRAINTS: match repo style; do NOT run the build (a single consolidated gate runs afterward); touch
ONLY <the disjoint file set>. Report the diff.
```

## Usability reviewer prompt skeleton (black-box)
```
BLACK-BOX USABILITY REVIEW of <library>. How to depend on it: <coordinate or import>. Docs: <README / API docs>.
YOUR TASK: build a small real project that <concrete goal>. You are a <persona: first-timer / migrator /
advanced user>.
RULES: use it as a consumer would, through the public docs, signatures, and autocomplete. Do NOT read the
library's implementation to work out how to use it; if you cannot proceed without it, log that as a
discoverability failure and only then peek.
REPORT: ergonomics (where you stalled, how much boilerplate); what felt off (names, defaults, errors,
ceremony); what is done well; bugs hit (with a concrete repro); structural and usability suggestions
(naming, defaults, shape, for example "this wants to be a DSL"). Show the actual code you wrote and the
exact spots that felt wrong.
```
