---
name: delegate-to-user
description: >-
  Hand the IMPLEMENTATION to the user instead of writing it yourself or
  dispatching a subagent. You stay the navigator: investigate, design/brainstorm,
  write ONE scoped implementation brief addressed to the user (precise guidance +
  tiny snippets, but they write the real edits), then verify their work with real
  evidence. Use this whenever the user signals they want to hold the pen — "you
  guide, I'll implement", "don't write the code, brief me", "prompt me like you'd
  prompt a subagent", "I'll do the implementation, you check it", "I want to write
  it myself", "navigator mode", "just tell me what to change and I'll do it", or
  when they've said no implementation from you but still want direction and a
  verification pass. Do NOT trigger when the user wants YOU to make the edits.
---

# Delegate to User

The user wants to be the implementer — for ownership, for learning, or because
it's their codebase and their call. Your value is everything *around* the typing:
understanding the problem, shaping the design, writing a brief tight enough that
they aren't guessing, and verifying the result with real evidence. The one thing
you do **not** do is hold the pen.

This is the mirror image of `subagent-driven-development`: same idea of handing a
well-scoped task to a worker, except the worker is the human, so the brief is a
message to them and you can't peek inside their head — you verify from the outside.

## The loop

1. **Make sure a shared understanding exists.** A brief is only as good as the
   design behind it. If the path isn't settled yet, investigate or brainstorm
   first (load `superpowers:brainstorming` for design work) and converge with the
   user. Don't brief a guess.
2. **Write ONE implementation brief** (template below), addressed to the user,
   scoped to the *current* chunk only — not five phases ahead.
3. **Stop and hand off.** Do not edit files. Do not dispatch a subagent to do the
   work. Wait for the user to implement.
4. **Verify** when they say it's done — cheapest real signal first (logs, build,
   a run, a test). Report the evidence, not a vibe.
5. **On failure, diagnose then re-brief.** Find the root cause (load
   `superpowers:systematic-debugging`), then hand back a corrected next step.
   Loop from step 2.

## The brief — structure

Address it to the user. Ground every instruction in what you already discussed
("as we landed on…", "because the state machine blocks on `waitForResult()`…") so
it reads as a continuation, not a fresh spec.

```
## Goal
One sentence: what this chunk achieves.

## Where
Exact files / symbols / call sites to touch (path:line where useful).

## The change
Precise, step-by-step description of what to do. Show small snippets,
signatures, or before/after fragments where they remove ambiguity — but
NOT the full edit. The user writes the real code.

## Keep intact
Contracts, invariants, and gotchas that must survive the change
(interfaces, threading rules, the bug you just fixed, etc.).

## Done when
Concrete acceptance criteria + how we'll verify (the exact log line,
the build target, the behavior to observe).
```

## How much code goes in the brief

Aim for **precise guidance plus tiny snippets** — enough that the user knows
exactly what to write, but they still write it. The sweet spot:

- ✅ "Add a `lateinit var controller` field; move `viewModel.initialize(controller)`
   into `onCreateView` *after* `super.onCreateView`, because touching `by viewModels()`
   before the fragment is attached throws `IllegalStateException`."
- ✅ A 2–3 line signature or before/after fragment to pin down shape.
- ❌ The complete diff to paste. That turns "you implement it" into "you paste it"
   and burns the point of the mode.
- ❌ A vague nudge with no file or symbol. That makes the user guess.

## Verification is your job

You handed off the typing, not the responsibility for "is it actually done." When
the user says they're finished, confirm it the way you'd confirm your own work
(this is `superpowers:verification-before-completion`): run the build, read the
logs, exercise the behavior. Quote the evidence. "No `IllegalState` line and the
new fragment's `Changed to fragment` committed" beats "looks right."

If you can't verify it yourself (needs a physical card tap, a device action), say
so and tell the user the exact signal to look for.

## Pitfalls

- **Catching yourself reaching for Edit/Write.** Stop — emit the brief instead.
  The moment you make the edit, the mode is broken.
- **Dispatching a subagent to do the implementation.** Defeats the purpose.
  Subagents are fine for *read-only investigation that feeds the brief*, never for
  the edits themselves.
- **Briefing too far ahead.** One chunk at a time. The next brief is cheaper to
  write well once this chunk is verified and you've seen how the user works.
- **Re-litigating the design in the brief.** Decisions already made are settled —
  reference them, don't reopen them. If the user said "no design input from you,"
  honor that and stay in brief-and-verify.
- **Handing off without a real design.** A premature brief just relocates the
  guessing to the user. Investigate first.
- **Declaring success on assertion, not evidence.** Always close the loop with a
  verification pass.
