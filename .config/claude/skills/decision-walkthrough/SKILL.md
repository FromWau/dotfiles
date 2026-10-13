---
name: decision-walkthrough
description: >-
  How to put decisions to the user one at a time in a fixed message format: a Before example, the Change
  with its why and evidence, an After example, and lettered options with one marked (Recommended); or, to
  define a behaviour, the input, the call, and one full result per option to pick from. Use it whenever the
  user has to validate, accept, drop or choose between things: proposed rows or test cases, review findings,
  design options, a list of agent proposals, what an API call or edit should produce ("what should
  doc.set do here?"), "let's go through these", "step through them one by one", "I want to validate the
  added cases", "show me before and after", "give me options", or any time you would otherwise reach for a
  multiple-choice question tool. Prefer it over a selection TUI.
---

# Decision walkthrough

The user decides; you prepare each decision so it can be made in one glance and answered with one letter.
They read examples faster than prose, so the decision is carried by a concrete Before and After, not by a
description of one.

## The rules

- **One decision per message, then stop and wait.** A batch hides the one item that needed thought, and an
  answer to a batch is ambiguous. Ask the next one only after the answer arrives.
- **Plain message, not a selection tool.** Don't use AskUserQuestion or any TUI picker for these: the
  user wants the examples in the message and answers with a letter.
- **Verify before you present.** Every claim the user would act on (what a tool does, what the code does, a
  version, a count) is checked first: run it safely, grep it, read it. Quote the command and its output in
  the message. If you could not check something, say so in the message, plainly.
- **Say when this changes an earlier decision.** If the evidence for this item contradicts something the user
  already accepted, name it ("This changes K21, which you already accepted") and fold the fix into the options.
- **Record each answer at once**, in the log the work uses (a `decisions.md`, `todo.md`, or the file being
  built), with the evidence. Decisions that live only in chat are lost at the next compaction, and an agent
  you later hand the work to cannot read the chat.

## Two shapes

Pick the shape by what is being decided:

- **A change to accept** (a proposed row, a fix, a finding): the options are verdicts on one change, so the
  message shows Before, the Change and one After. Template below.
- **A behaviour to define** (what an API call, a command or an edit should produce): the options *are* the
  possible results. Show the input Before, the call, then one block per option holding the whole result, so the
  user picks the output they want rather than reading a description of it. 

## The message (a change to accept)

```
**<ID>: <short name of the thing being decided>**

<one or two sentences of context, only if needed>

Before: <one sentence on what exists today>
<a fenced example of today's state, in the language of the domain>

Change: <what is added, changed or removed>
- **Why:** <the reason, in one or two sentences>
- **Evidence:** <the command you ran and what it printed, or the file and line>

After:
<a fenced example of the result, each line commented with what it shows>

- **A (Recommended):** <the option and its consequence, one line>
- **B:** <...>
- **C:** <...>
```

Use the code fence that fits the examples (`bash` for command lines, `kotlin` for API shapes), and put a short
comment on each line of the After block saying what that line demonstrates. Two to four options; the
recommended one first, each option one line naming its consequence, never a bare "Yes"/"No". Drop the
Before block when nothing exists yet and say "Before: no row" or similar.

## The message (a behaviour to define)

```
**<ID>: <the behaviour in question>**

Before: <one sentence on the input>
<a fenced block with the whole input: the file, the document, the line>

Run:
<a fenced block with the exact call or command>

- **A (Recommended):** <one line: what this result does and why it is the pick>
  <a fenced block with the whole result>
- **B:** <one line>
  <a fenced block with the whole result>
- **C:** <one line, often "refuse with an error", and the error kind as the block>
```

Show each result in full, not a diff: a result is judged by how the whole output reads, and a diff hides the
spacing, comments and ordering that usually decide it. When the options differ in one spot only, keep the input
short enough that the full blocks stay easy to compare. Once the user picks, the chosen result is the expected
value of the test that pins the behaviour.

## When the user steps outside the format

- **A question or a design tangent** ("what if we declared shorts and longs separately?"): answer it properly,
  with code examples of today and of the idea, what it gains, and what must be decided. End with options again,
  usually "file it in `todo.md` and carry on" as the recommendation. Then resume the walkthrough.
- **"Add them all" / "accept the rest"**: stop asking. Apply every remaining item as proposed, keep what was
  already decided, and record that the rest went in by that instruction.
- **A correction to the format itself**: follow it from the next message on, and patch this skill.

## Examples

Read `references/examples.md` before writing the first message of a walkthrough: one worked message per
shape, a klap matrix row (a change to accept) and a kotoml `remove` call (a behaviour to define).
