---
name: eval-driven-development
description: Eval-driven development (EDD) for agentic / LLM applications: how to gain confidence in a non-deterministic AI system and keep it in bounds over time. Covers the eval pyramid (deterministic checks, ground-truth checks, LLM-as-judge, human), the LLM-as-judge pattern and its calibration, bootstrapping a golden dataset, multi-turn user/conversation simulators, red teaming, production observability, and the feedback-to-TDD loop. Load whenever the topic touches testing, evaluating, scoring, or measuring the quality of an LLM/agent/RAG/chatbot/assistant, even casually phrased: "how do I test my agent", "my chatbot is sometimes wrong", "LLM eval", "is my RAG accurate", "hallucination testing", "LLM as a judge", "red team my prompt", "how do I know the AI answer is good". JVM/Kotlin examples use Dokimos + Spring AI + Koog, but the methodology is language-agnostic and applies to any stack (Python, TypeScript, etc.).
---

# Eval-Driven Development (EDD)

How you tame a system that is right most of the time but not always. Traditional
applications are **specification-driven and deterministic**: a fixed set of code
paths (endpoint, service, DB) that you cover with tests and watch with monitoring.
When the green boxes tick, you ship. Agentic / LLM applications are
**behavior-driven and probabilistic**: the same input yields a different reply
each run, and the spread widens further when you change model versions.

The whole request pipeline is a stack of probabilities: an ambiguous
natural-language system prompt, a probabilistic model, conversational history and
loaded context, RAG (embedding model + chunking + metadata choices), tool
selection and tool arguments, MCP servers (tools, resources, prompts), other
agents, and a human user with a mood and an intent. Traditional systems have
**uncertainty at the edges** (concurrency, latency, networking, caching) which the
industry has learned to manage. Agentic systems have **uncertainty at the very
core**. That is the shift EDD exists to handle.

Guiding quote (George Box): all models are wrong, but some are useful. The goal of
EDD is to keep a model *useful* while it behaves *most of the time*, and to prove
that it stays that way.

## When to read references

- **`references/dokimos-jvm.md`** the concrete JVM/Kotlin implementation of
  everything below, using **Dokimos** (a JUnit-based eval framework) with **Spring
  AI**, **LangChain4j**, or **Koog**. Setup coordinates, the real experiment /
  dataset / task / evaluator DSL, the tool-call and judge evaluators, multi-turn
  simulators, result persistence, observability wiring (Langfuse / micrometer),
  and red teaming with promptfoo. Read it when implementing evals on the JVM. The
  methodology in this file is what to build; that file is how to build it in code.

For the Kotlin idioms and formatting used in those examples, load the `kotlin`
skill. For layering and typed-error design of the app under test, load
`software-design`.

## The core shift: pass/fail becomes a confidence score

Deterministic testing measures a **binary** outcome: does the system match the
spec, true or false. Quality is fuzzy and cannot be captured that way. EDD
measures a **probabilistic confidence score** instead, and leans on statistics: run
the same evals many times (regression), and the aggregate should stabilize and
stay within bounds. When it drifts out of bounds, that is your signal to
investigate.

The anti-pattern to name and avoid: "when it compiles, I ship it." In the agentic
age it is common to build something, poke at it a bit, and ship. That regresses
software testing to the 1950s, when the best test was production itself. EDD brings
the accumulated discipline of testing back to a domain that is tempted to forget
it.

Concretely, EDD asks you to define **measurable quality criteria** up front, hold
them with regression over time, and also control **cost and latency** alongside
quality.

## The eval pyramid

The central mental model. Like the classic testing pyramid, build a wide, cheap
base and reserve the expensive, judgment-heavy tools for the top. Bottom to top:

1. **Deterministic checks** the cheapest and most concrete, so have as many as
   possible. Schema validation, JSON-payload structure, presence and shape of a
   tool call. There is little to argue about: it passes or it does not.
2. **Ground-truth checks** you supply reference data (an expected reply, an
   expected retrieved context) and verify the model treated it correctly. A
   "contains" check (is the expected answer present in the reply) lives here, as
   do precision / recall over RAG retrieval. Still largely deterministic, but it
   needs curated references.
3. **LLM-as-judge** for everything no assertion can pin down: faithfulness /
   hallucination, contextual relevance, helpfulness, tone, business-appropriateness,
   task completion. A second model scores the output. See the pattern below.
4. **Human** the apex. Judge calibration, review of production traces, and the
   hairy or novel cases. Humans stay in the lead here and are never fully removed.

Working rule: **push every check as far down the pyramid as it will go.** Lower is
cheaper, more reliable, and more repeatable. Reach up to a judge or a human only
for what genuinely cannot be pinned down deterministically.

## The LLM-as-judge pattern

For the fuzzy middle of the pyramid, use another LLM to score the output. Yes, this
is fighting probability with probability. You do it because there is no better
tool, and statistics still yields usable confidence.

- **Use a stronger model for the judge** than the one in production, if you can
  afford it. A smarter grader is a more trustworthy grader.
- **Feed the judge context**: the whole conversation, the expected reply, the
  ground truth you provided or expected, explicit quality criteria, and tool
  traces.
- **The output shape is always the same**: a score in `[0, 1]` plus **reasoning**.
  The reasoning is not optional. When a score is surprisingly high or low, you need
  to know why, both to trust it and to fix the underlying problem.
- **Set a threshold** per criterion: the score line that counts as a pass.
- **Persist every result.** A judge score is only meaningful in aggregate.
  Individual runs vary (0.7, then 0.8, then 0.75); what matters is that the
  distribution stays within a band over time. Store results in persistent storage
  and track the trend. Drift out of the band is a regression.

### Judge internals worth understanding: faithfulness

Knowing how a judge works lets you pinpoint what failed. A faithfulness (the
inverse of hallucination) judge typically:

1. Decomposes the provided **context** into atomic **truth statements** (short
   sentences that define what is true).
2. Decomposes the **reply** into atomic **claims**.
3. Compares each claim against the truth statements to reach a verdict.

This catches dangerous, confident hallucinations. In the source demo the real
price was 700 but the model replied 8.99: tool calls were correct and the retrieved
context was relevant, yet the answer was unfaithful to it. A precision/recall or
"tool was called" check would have passed; only the faithfulness judge caught it.

### Judging the judge (calibration)

Off-the-shelf evaluators are a fine starting point, but the real world will demand
more, and a judge can be wrong. The calibration loop: a **human** labels a sample
of outputs, you **compare** the human labels against the judge scores, and you
**refine the judge prompt** where they disagree. This runs continuously. Humans are
still needed, which is the honest answer to "who judges the judge."

## Bootstrapping: the minimum viable evaluation loop and the golden dataset

Before writing evals you need data, because the agent's only interface is text and
you must feed it a lot of it. And before *that* you must answer questions that are
trivial for a deterministic app but not for an agent:

- **What is the actual goal of this application?** An agent talking to an LLM can do
  a great deal, so the intended scope is not self-evident from the code.
- **Who are the users, and what are the scenarios?** Both the happy paths and the
  rainy days.

Then bootstrap production-like data for a **minimum viable evaluation loop**:

1. Define **user profiles** (for example: first-time attendee, backend developer)
   and their goals.
2. Define **scenarios** (looking up venue info, browsing the program, building a
   schedule).
3. Let an LLM synthesize **concrete prompt inputs** for each profile-by-scenario
   combination.
4. A **human verifies** the generated set before it is trusted.

Over time, extend the set with real **production samples** and, crucially, real
**failures**. The end goal is the **golden dataset**: a curated set of real-world
behavior that includes corner cases and failure modes. It is the asset the whole
harness is built to grow.

## Multi-turn: user and conversation simulators

Single-turn evals miss failures that only emerge across a conversation. Simulate
whole dialogues:

- **User simulator**: a persona with a mood, an intent, some knowledge, and a
  language skill.
- **Conversation simulator**: bound the **max turns** so it cannot run forever
  burning tokens, give it an initial message, and optionally a programmatic stop
  condition.
- **Trajectory evaluator**: apply criteria over the entire conversation (was the
  user satisfied, was the goal completed) and add deterministic post-checks (for
  example, that the proposed calendar sessions do not overlap).

## What you can eval

Anything you have a hook for. The common catalog:

- **RAG retrieval**: contextual relevance, precision, and recall of retrieved
  chunks against the input.
- **Faithfulness / hallucination**: did the reply stay true to the provided
  context, or invent or contradict it.
- **Tool use**: were the expected tools called, with the right arguments. Mostly
  deterministic.
- **Task completion, helpfulness, tone, reasoning**: judge territory.
- **Custom domain evals**: extend the framework with your own (for example, a
  schedule-overlap check). Domain-specific checks are often your highest-signal
  ones.

## Security: red teaming belongs at the core

LLM vulnerabilities are effectively endless: prompt injection, data leakage,
jailbreaks, and more. Treat an agent like a serious application: have a specialized
team challenge it, especially before a major release or the first go-live. Automate
it with red-team tooling that generates adversarial inputs across the OWASP LLM Top
10 (for example, **promptfoo**). Red teaming is not a separate afterthought; it sits
at the core alongside functional evals. (The consequence of skipping it is real:
public incidents exist where chatbots were exploited to commit serious crimes.)

## Production: you are a babysitter now

Passing your evals and going live is not "lean back." A probabilistic system needs
continuous babysitting.

- **Observability**: log extensively and store it somewhere queryable (for example
  **Langfuse**). Capture request/responses, metadata, tokens, latency, tool calls
  with their inputs and outputs, and errors. On the JVM this is mostly free: the
  frameworks auto-instrument (micrometer / OpenTelemetry) from a few environment
  variables.
- **User feedback is a first-class signal.** Give the user a thumbs-down with a
  free-text box. Feedback is more concrete than a failure you have to deduce from
  traces: the user tells you exactly what went wrong. Missing that opportunity is a
  real loss.
- **Human random-sampling**: periodically pull random production traces and judge
  them by hand. Do not rely only on complaints to find problems.
- **Close the loop with TDD.** Convert a bad trace or a piece of feedback into a
  **failing test**, extend the regression set and the golden dataset with it, and
  use it to align your judges. This is the mechanism by which production teaches the
  harness.
- **Scale the triage.** An LLM feedback triager can classify incoming feedback
  (summary, failure mode, severity) into a human-readable report; a human makes the
  final call, then writes the failing test.

## The loop, end to end

Identify goals, users, and scenarios. Seed production-like data. Build the EDD
harness (turn-based evals plus conversation-based evals). Red-team it. Ship with
logging and monitoring. Collect traces and user feedback. Feed both back to refine
evals on every level (catch regressions, find systematic failures, tune judges),
which strengthens the harness. The payoff is magic you can actually control, so the
apprentice does not end up in the chaos of the sorcerer's flooded workshop.

---

Distilled from the KotlinConf-era talk "Eval-Driven Development" by Or Peter
(Spring AI + Dokimos demo). Tool and framework names verified against their current
docs; treat any specific version numbers as of mid-2026.
