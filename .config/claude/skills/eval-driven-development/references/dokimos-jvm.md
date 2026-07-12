# EDD on the JVM: Dokimos + Spring AI / LangChain4j / Koog

The methodology lives in `SKILL.md`; this is how to implement it in Kotlin. The
concepts (eval pyramid, LLM-as-judge, golden dataset, trajectory evals) are
framework-agnostic, so the same shapes apply if you use a Python or TypeScript
eval stack instead.

**Dokimos** is a JVM-native eval framework that runs your evals **as JUnit tests**,
so they sit in your normal test suite and CI next to everything else. It is young
(around 0.13, MIT, published to Maven Central under `dev.dokimos`), so treat the
DSL specifics here as directional and confirm the current builder syntax at
<https://dokimos.dev>. The building blocks and module names are stable; some
evaluator builder names may shift between 0.x releases.

## Setup

All modules publish to Maven Central under `dev.dokimos`. Pick the core plus the
JUnit runner plus the bridge for whatever framework your agent uses.

```kotlin
// build.gradle.kts
dependencies {
    testImplementation("dev.dokimos:dokimos-core:$dokimosVersion")
    testImplementation("dev.dokimos:dokimos-kotlin:$dokimosVersion")   // Kotlin DSL
    testImplementation("dev.dokimos:dokimos-junit:$dokimosVersion")    // run evals as JUnit tests

    // one framework bridge so task { } can call your real agent:
    testImplementation("dev.dokimos:dokimos-spring-ai:$dokimosVersion")
    // or dokimos-langchain4j, dokimos-koog, dokimos-embabel (Java 21+),
    // or dokimos-spring-ai-alibaba
}
```

The core is framework-agnostic; the bridges just let a `task` invoke your agent
through Spring AI, LangChain4j, Koog, or Embabel. Any plain LLM client works too.

## The core building blocks

| Block | What it is |
| --- | --- |
| `Dataset` | Holds `Example`s (input + expected output), built with a builder. |
| `Example` | One test case. `Example.of(...)` in Java, `example { }` in the DSL. |
| `Task` | Runs your app against an example and returns a result (a `Map`). |
| `Evaluator` | Scores the task output. Built-in ones plus your own. |
| `Experiment` | Wires dataset + task + evaluators together and runs. |
| `ExperimentResult` | `passRate()`, `totalCount()`, `passCount()`, `failCount()`. |

## A basic experiment (verified DSL)

This maps to pyramid layers 2 and 3: a curated dataset (ground truth) scored by an
LLM judge.

```kotlin
val dataset = dataset {
    name = "Product Support Questions"
    example {
        input = "How do I reset my password?"
        expected = "Click 'Forgot Password' on the login page and follow the email instructions"
    }
    example {
        input = "Where can I track my order?"
        expected = "Go to your account dashboard and click on 'Order History'"
    }
}

// task calls your real agent (here through the Spring AI bridge) and returns a Map
val task = task { example ->
    val answer = supportAgent.generateAnswer(example.input())
    mapOf("output" to answer)
}

val result = experiment {
    name = "QA Evaluation"
    dataset(dataset)
    task(task)
    evaluators {
        llmJudge(judge) {
            name = "Answer Quality"
            criteria = "Is the answer helpful and accurate?"
            threshold = 0.8
        }
    }
}.run()

println("Pass rate: ${result.passRate()}")
println("Passed ${result.passCount()} / ${result.totalCount()}")
```

`judge` is an LLM client; give it a **stronger model than production** so the
grader is more trustworthy than the graded. `criteria` is the natural-language
rubric, `threshold` the score line for a pass. The judge returns a score in
`[0, 1]` plus reasoning.

Run it as JUnit: with `dokimos-junit`, wrap the above in a `@Test` and assert on
`result.passRate()`. Because scores vary run to run, assert on a **band**
(`assertThat(result.passRate()).isGreaterThan(0.8)`), never on a single exact
value.

## Evaluator catalog

Choose the lowest-cost evaluator that can decide the check (push down the pyramid).

**Ground-truth / deterministic** (layers 1 and 2):
- A **contains**-style evaluator: the expected output appears in the reply. Cheap,
  but note it is a ground-truth check, not a pure format check.
- **Precision / recall** over RAG retrieval: did the vector store return chunks
  relevant to the input.

**Judge-backed** (layer 3, built in):
- **LLM-as-judge** (`llmJudge` above) with your own `criteria` for tone,
  helpfulness, business-appropriateness, reasoning, and so on.
- **Faithfulness** and **hallucination**: is the reply true to the provided
  context (see the decomposition mechanism in `SKILL.md`).
- **Contextual relevance**: was the retrieved context relevant to the input.

**Agent / tool evaluators** (`dev.dokimos.core.evaluators.agents`, mostly
deterministic, verified class names):
`ToolCallValidityEvaluator`, `ToolCorrectnessEvaluator`, `ToolTrajectoryEvaluator`,
`ToolErrorEvaluator`, `ToolEfficiencyEvaluator`, `TaskCompletionEvaluator`,
`ToolArgumentHallucinationEvaluator`, `ToolNameReliabilityEvaluator`,
`ToolDescriptionReliabilityEvaluator`. Use these to assert the right tools were
called with the right arguments, which is a cheap deterministic check that catches
a large class of agent failures.

**Custom**: implement your own evaluator for domain rules (for example, that
proposed calendar sessions do not overlap). This is where your highest-signal,
domain-specific checks live. Extending the framework with a custom evaluator is
expected, not exotic.

You can attach **several evaluators to one interaction**: for a priced answer,
combine a `ToolCorrectness` check (right data fetched), a contextual-relevance
check (right context retrieved), and a **faithfulness** check (answer true to that
context). In the source demo, the first two passed while faithfulness failed and
caught a 700-vs-8.99 hallucination, which is exactly why you layer them.

> Confirm the exact builder names for the faithfulness / contextual-relevance /
> contains evaluators against the current docs; only `llmJudge` and the agent
> evaluator classes above are pinned here.

## Multi-turn: user simulator and trajectory evaluation

For conversation-level evals, Dokimos can simulate a user and score the whole
trajectory. Conceptually:

- A **user simulator** persona: mood, intent, and the sessions or goals it cares
  about.
- A **conversation / trajectory simulator**: a **max-turns** cap so it cannot burn
  tokens indefinitely, an initial message, and an optional programmatic stop
  condition.
- A **trajectory evaluator**: the criteria to apply across the conversation (was
  the user satisfied, was the goal completed), plus deterministic post-checks (for
  example, no overlapping sessions).

Bound the turns first; an unbounded simulator is a token bonfire. Check the current
simulator DSL on dokimos.dev, as this API is newer than the core.

## Persisting results and tracking over time

A single judge score is noise; the trend is the signal. Attach a **reporter** so
each run is written to persistent storage (Dokimos offers a server plus a basic UI
for browsing examples and their scores over time). This is what lets you see
whether you are staying within bounds across releases and catch regressions. Wire
the reporter into the `experiment { }`; confirm the exact reporter builder against
the docs.

## Observability in production

Evals prove the system before ship; observability watches it after.

- **Spring AI** auto-instruments via **micrometer**: set a few environment
  variables (keys and URLs) and traces flow out with no code changes. You get LLM
  calls, replies, tool calls (down to the vector search and its SQL), tokens, and
  latency.
- **Koog** has built-in **Langfuse** and W&B Weave support for the same purpose.
- Point the traces at **Langfuse** (or similar) so both model interactions and
  captured user feedback land in one queryable place.

Then close the loop: pull a bad trace or a thumbs-down, turn it into a failing
Dokimos test, add it to the golden dataset, and re-run. An **LLM feedback triager**
(another judge that classifies feedback into summary / failure-mode / severity and
emits an HTML report) makes the human triage step scale.

## Red teaming

Dokimos covers functional and quality evals; for adversarial security use a
dedicated red-team tool. **promptfoo** (open source, CLI, framework-agnostic so it
points at your endpoint regardless of JVM vs Python) generates adversarial inputs
across the OWASP LLM Top 10 (prompt injection, data leakage, jailbreaks, and more).
Run it before major releases and first go-live, and treat it as core, not optional.

## Pitfalls

- **Do not lean only on judges.** It is probability grading probability. Anchor
  every judge with deterministic checks below it and human calibration above it.
- **Assert on statistical bands, not single scores.** Judge output is stochastic;
  a one-run `== 0.8` assertion will flap.
- **Keep the judge model separate from and stronger than production.** A grader no
  smarter than the graded adds little confidence.
- **Bound conversation simulators** with max turns and a stop condition, or they
  burn tokens without end.
- **Pin the Dokimos version.** At 0.x the DSL can change between releases; a pinned
  version keeps your eval suite reproducible, and confirm syntax against
  dokimos.dev when you upgrade.
