---
name: benchmarking
description: How to measure performance honestly and find where time goes, in any language: whole-program timing with hyperfine (wall and CPU time, peak memory, instructions, percentiles), sampling profilers and flame graphs for hot paths, microbenchmark harnesses for scoped sections (JMH and the like), and scaling tests that catch a quadratic step in CI. Use it whenever the user asks "is this slow", "why is X slow", "benchmark this", "profile", "flame graph", "hot path", "p95/p99", "percentiles", "JMH", "hyperfine", "quadratic", "does this scale", "speed it up", or wants to compare two builds, prove a speedup, or decide whether a speedup is worth doing, even when they never say "benchmark". Read references/kotlin.md for Kotlin, JVM and Kotlin Multiplatform projects (JMH through Gradle, async-profiler, kotlinx-benchmark, native binaries, scaling tests in commonTest).
---

# Benchmarking

A performance claim is a measurement, and most wrong ones come from measuring the wrong thing: a command that
never ran, a single noisy run, a cold JIT, a contrived input. This skill is the order of work that keeps the
numbers honest and points the effort at what real users would feel.

## The three instruments

Each answers a different question. Reach for the one that matches the question, not the one already open.

| question | instrument | gives |
|---|---|---|
| How long does the program take, end to end, and what does it cost the machine? | **hyperfine** | wall and CPU time, peak RSS, instructions, cache misses, every run as JSON |
| Where does the time go? | **sampling profiler** (async-profiler, perf, py-spy, pprof) | flame graphs, the hottest frames |
| How long does this one operation take, isolated? | **microbenchmark harness** (JMH, criterion, pytest-benchmark, Go `testing.B`) | per-operation percentiles after warmup, in a fresh process |
| Does it stay linear as the input grows? | **scaling test** in the normal test suite | a pass or fail in CI, on every target |

The usual flow is: hyperfine shows something is slow, the profiler names the frame, a scoped benchmark or a scaling
test pins it, the fix lands behind that test, and hyperfine shows the user-visible gain.

## Measure honestly

- **Check the machine is idle first, and record that it was.** A benchmark taken while something else is busy says
  nothing: a game, a video call, an IDE indexing, a Gradle or compiler daemon building, another agent running its own
  build or benchmark, a backup or package update. Before measuring, look at the load and the top CPU users:

  ```bash
  cat /proc/loadavg                                  # 1/5/15 min load; well under the core count (nproc)
  ps -eo pcpu,pmem,comm --sort=-pcpu | head -8       # nothing heavy besides the shell
  pgrep -fa 'GradleDaemon|kotlin-daemon|java|hyperfine|cargo|rustc' | head
  ```

  If anything heavy runs, wait for it, stop it if it is yours, or tell the user and do not report numbers as clean.
  Never benchmark while you or your own subagents run builds, tests or other benchmarks in parallel: run
  measurements one at a time, after the parallel work is done. Put the machine state in the report (load before and
  after, the core count, what else was running), and mark any number taken on a busy machine as dirty. A scaling-test
  failure seen during a parallel build is a reason to rerun it alone, not a finding.
- **Check that the command actually ran.** Timing a command that failed in 10 ms looks like a great result. Check the
  exit code and look at one output before trusting any timing loop. Shells differ here: zsh does not split an
  unquoted `$cmd` into words, so a loop over `"$cmd -f file"` runs a command that does not exist. Pass the words as
  an array, or let hyperfine run the command (`hyperfine -N` runs it without a shell).
- **Repeat, warm up, and report spread.** One run is an anecdote. Use warmup runs (disk cache, JIT), at least 10 to
  20 measured runs, and report the median with p95/p99 or min..max, not the mean alone. With 20 runs, p99 is
  effectively the slowest run: say so rather than implying precision.
- **Compare like with like.** Both builds on the same machine, the same input files, back to back in one
  hyperfine call, release builds only. A debug build or a JVM without warmup measures something else.
- **Count instructions when timing is noisy.** `instructions` from hyperfine's `--metrics all` (perf counters) barely
  moves between runs, so a 77 G to 3.5 G drop is a clearer sign than a wall-clock delta on a busy laptop.
- **Look at memory too.** A speedup that doubles peak RSS is a trade, not a win; report both.
- **Settle a close call with interleaved runs and an interval.** When old and new differ by a few percent, a
  difference that size is within run-to-run noise. Run them alternately (old, new, old, new, ...), 30 to 60 pairs, so
  drifting background load hits both alike, then give the new/old ratio of the medians with a 95% confidence interval
  (bootstrap the pairs, or a Welch t-test on the times). Only an interval that excludes 1.0 is a real change; say
  "no measurable difference" otherwise. hyperfine runs each command's runs in one block, so script the alternation.
- **Use real input shapes, and real files first.** Benchmark the files users have (a lock file, a large config, a
  log), sized as they are in the wild. Before generating one, look for a real file of that shape on the machine
  (`find ~ -name Cargo.lock -size +20k`, the project's own fixtures) and use it beside any generated one: a real file
  carries the irregularities a generator leaves out. A contrived shape (a 20-deep nesting, 200k tables nobody
  writes) can show a slowdown nobody will ever feel, so a fix aimed only at it is rarely worth a rewrite. Build both
  the real shape and the worst case, and say which one a result is for.

## Find the hot path before changing code

Profile first, then read the code the profile names. Guessing at the slow part is how a micro-optimisation lands in
code that was 2% of the time.

- Sample at a fine interval (1 ms) on an input large enough that the slow part dominates startup.
- Read the deepest frames of your own code: the share of samples whose innermost own frame is X is X's self time.
  A helper at 80% of an operation is the whole story; one at 8% is not worth touching alone.
- A quadratic step usually looks like a per-item scan inside a per-item loop: `list.count { }`, `filter`, `indexOf`,
  `any { }` or `in list` called once per element. The fix is almost always a single grouping or a hash set built
  once, which keeps the code the same size and the semantics identical. If the fix needs a cache, a global, or a
  special case for the benchmark's input, it is a hack: stop and ask.
- Produce a flame graph before and after; the after graph should show no single frame dominating.

## Pin it with a test that fails

A speedup without a guard regresses quietly. Write a scaling test before the fix and see it fail:

- Time the operation on a small and a large input (8x apart), each the fastest of a few runs after a warmup.
- Assert the ratio stays under a bound between linear and quadratic (for 8x: linear is about 8, quadratic about
  64; a bound of 24 leaves room for a busy CI machine).
- Run it on every target the project ships; native and JVM can differ by an order of magnitude.

Ratios are robust where absolute times are not, so these tests can live in the normal suite.

## Scoped benchmarks

Keep them out of the CI gate (they are slow and noisy) and run them on demand:

- One benchmark per operation a user performs, on each real input shape, with the setup (parsing, building the
  input) outside the timed part.
- Make each benchmark check once, before measuring, that the operation succeeds: a refused edit or an error path is
  fast, and timing it looks like a speedup.
- Prefer a sample-time mode that reports percentiles (p50, p90, p99) over an average, so a slow tail shows.

## Report

Lead with a table: case, median, p95, p99, CPU, peak RSS, and instructions when available, old and new side by side.
Then the one frame that explains the change (from the profiler), the test that guards it, the machine state while
measuring (idle or not, load, cores), and what the numbers do not cover (run count, input shape). If an earlier
number you gave turns out wrong, say so plainly and correct it.

## Language references

- Kotlin, JVM and Kotlin Multiplatform: `references/kotlin.md` (JMH via Gradle, async-profiler, kotlinx-benchmark,
  native binaries, scaling tests in `commonTest`, a hyperfine driver script).
