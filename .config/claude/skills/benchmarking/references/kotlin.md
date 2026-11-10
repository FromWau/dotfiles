# Benchmarking Kotlin, JVM and Kotlin Multiplatform

Worked from kotoml (a KMP TOML library and CLI, `~/Projects/kotoml`): its `benchmark/` module and
`core/src/commonTest/.../*ScalingTest.kt` are the reference implementation of everything below.

## Contents

1. JMH through Gradle (`me.champeau.jmh`)
2. Flame graphs with async-profiler
3. Profiling a CLI's JVM build directly
4. kotlinx-benchmark (when to choose it)
5. Native binaries: hyperfine
6. Scaling tests in `commonTest`
7. Pitfalls

## 1. JMH through Gradle

A separate JVM module that depends on the code under test keeps the JMH plugin out of the library's build:

```kotlin
// benchmark/build.gradle.kts
plugins {
    id("org.jetbrains.kotlin.jvm")
    alias(libs.plugins.jmh)          // me.champeau.jmh, pinned in libs.versions.toml
}

dependencies {
    jmh(project(":core"))
}

jmh {
    benchmarkMode = listOf("sample") // percentiles per operation, not just an average
    timeUnit = "ms"
    warmupIterations = 3
    warmup = "1s"
    iterations = 5
    timeOnIteration = "2s"
    fork = 1                         // a fresh JVM per benchmark
    resultFormat = "JSON"
    providers.gradleProperty("jmh.only").orNull?.let { includes = listOf(it) }
}
```

Run with `./gradlew :benchmark:jmh -Pjmh.only=StructureBenchmark.move < /dev/null`; results land in
`benchmark/build/results/jmh/results.json`. Sources go in `src/jmh/kotlin`.

A benchmark class:

```kotlin
@State(Scope.Thread)
open class StructureBenchmark {
    @Param("realistic", "cargo-lock-2k", "commented-4k")
    lateinit var input: String

    private lateinit var text: String
    private lateinit var document: TomlDocument

    @Setup
    fun setUp() {
        text = Inputs.text(input)
        parse()
        // A refused edit would time its refusal, so each one is made once before anything is measured.
        check(move() is Result.Success) { "$input: move is refused" }
    }

    @Setup(Level.Invocation)          // a fresh document per call, outside the timing
    fun parse() {
        document = checkNotNull(TomlDocument.parse(text).getOrNull())
    }

    @Benchmark
    fun move() = document.move(from, to)
}
```

- Classes and benchmark methods must be `open` (or use the `allopen` plugin), and state fields `lateinit var`.
- Return the result (or feed it to a `Blackhole`) so the JIT cannot drop the work.
- `Level.Invocation` setup is right when each call mutates its input; it adds overhead, so keep the timed operation
  well above a microsecond.
- Read the percentiles from the JSON:

```python
for r in json.load(open("benchmark/build/results/jmh/results.json")):
    p = r["primaryMetric"]["scorePercentiles"]
    print(r["benchmark"], r["params"], p["50.0"], p["90.0"], p["99.0"])
```

Pin plugin versions in the version catalog and check the release date first (Maven metadata:
`https://plugins.gradle.org/m2/me/champeau/jmh/me.champeau.jmh.gradle.plugin/maven-metadata.xml`); do not take a
release younger than two weeks.

## 2. Flame graphs with async-profiler

JMH has a built-in async-profiler integration. Wire it to a Gradle property so it is opt-in:

```kotlin
jmh {
    providers.gradleProperty("jmh.asyncProfiler").orNull?.let { library ->
        val flame = layout.buildDirectory.dir("results/jmh/flame").get().asFile
        profilers = listOf("async:libPath=$library;output=flamegraph;dir=$flame")
    }
}
```

`./gradlew :benchmark:jmh -Pjmh.asyncProfiler=/opt/async-profiler/lib/libasyncProfiler.so` writes
`flame-cpu-forward.html` and `flame-cpu-reverse.html` per benchmark and parameter. The reverse graph puts the hottest
leaf frames at the root, which is the quickest way to spot one helper eating the time. On Arch the library is at
`/opt/async-profiler/lib/libasyncProfiler.so` (package `async-profiler`; `asprof` is the attach CLI).

## 3. Profiling a CLI's JVM build directly

For a whole command rather than one operation, run the JVM build under the agent. Get the runtime classpath from
Gradle with a small init script:

```groovy
// cp.gradle
allprojects {
  tasks.register("printCp") {
    def cp = project.configurations.findByName("jvmRuntimeClasspath")
    doLast { if (cp != null) println("CP=" + cp.asPath) }
  }
}
```

```bash
./gradlew -q -I cp.gradle :app:printCp --no-configuration-cache < /dev/null | grep '^CP=' | cut -c4- > cp.txt
./gradlew -q :core:jvmJar :app:jvmJar < /dev/null      # the jars, rebuilt from the current source
CP="app/build/libs/app-jvm.jar:$(cat cp.txt)"
java -agentpath:/opt/async-profiler/lib/libasyncProfiler.so=start,event=cpu,interval=1ms,file=flame.html \
  -cp "$CP" com.example.app.MainKt <args>
```

Use `file=out.collapsed,collapsed` instead to get one line per stack with a sample count, then rank your own frames:

```python
for line in open("out.collapsed"):
    stack, n = line.rsplit(" ", 1)
    own = [f for f in stack.split(";") if "com/example" in f]
    if own: self_time[own[-1]] += int(n)        # innermost own frame = self time
```

Only count samples under the operation's own frame (for example `TomlDocument.move`) when computing shares; JVM
startup and JIT threads fill the rest of a short run. The jars from `jvmTest` runs can be stale: rebuild them with
`jvmJar` before profiling a change, and for a before/after pair, swap the one source file, rebuild, profile, restore.

## 4. kotlinx-benchmark

JetBrains' `org.jetbrains.kotlinx.benchmark` plugin wraps JMH on the JVM and adds its own harness for Kotlin/Native,
JS and Wasm, configured from a KMP source set. Choose it when the numbers that matter are native or JS ones; for a
JVM-only question, plain JMH through `me.champeau.jmh` is simpler and gives JMH's full feature set (profilers,
percentiles). Check the current version in Maven Central metadata
(`org/jetbrains/kotlinx/kotlinx-benchmark-runtime/maven-metadata.xml`); web search results lag.

## 5. Native binaries: hyperfine

A Kotlin/Native release binary is what users run, and it can be far slower or faster than the JVM. Time it with
hyperfine, with every metric, against the installed build:

```bash
hyperfine -N -w 2 -r 20 --metrics all --export-json hf.json \
  -n "old" "/usr/bin/tool move .t0 .t7999.z -f big.toml" \
  -n "new" "app/build/bin/linuxX64/releaseExecutable/tool.kexe move .t0 .t7999.z -f big.toml"
```

hyperfine 2's JSON keeps every run under `results[].measurements[]`, each metric as `{"value", "unit"}`
(`time_wall_clock`, `time_cpu`, `memory_peak_resident`, `instructions`, ...); compute median, p95 and p99 from those.
For a close call, alternate the two binaries and bootstrap a confidence interval on the ratio of medians:

```python
import random, statistics, subprocess, time

def once(cmd):
    start = time.perf_counter()
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    return time.perf_counter() - start

old, new = [], []
for _ in range(60):                                  # old, new, old, new: drift hits both alike
    old.append(once(OLD_CMD))
    new.append(once(NEW_CMD))
ratios = sorted(
    statistics.median(random.choices(new, k=len(new))) / statistics.median(random.choices(old, k=len(old)))
    for _ in range(2000)
)
print(statistics.median(new) / statistics.median(old), ratios[50], ratios[1949])   # ratio, 95% interval
```

An interval that contains 1.0 means no measurable difference.

kotoml's `benchmark/cli.py` is a PEP 723 uv script that builds real-shaped inputs (a Cargo.lock, a commented config)
and prints this table for any number of binaries side by side. Build the release binary first:
`./gradlew :app:linkReleaseExecutableLinuxX64 < /dev/null`.

## 6. Scaling tests in `commonTest`

They run on every target in the normal gate, so a quadratic step is caught on native too:

```kotlin
class MoveScalingTest {
    private fun text(count: Int) = (0 until count).joinToString("") { "[t$it]\nx = $it # c$it\n" }

    private fun timedMove(text: String, count: Int): Duration {
        val document = TomlDocument.parse(text).assertSuccess()
        return measureTime { document.move(".t0", ".t${count - 1}.moved").assertSuccess() }
    }

    @Test
    fun `a table moved among tables each with its own comment takes linear time`() {
        val small = text(SMALL)
        val large = text(LARGE)
        timedMove(small, SMALL)                 // warm up both
        timedMove(large, LARGE)
        val times = List(RUNS) { timedMove(small, SMALL) to timedMove(large, LARGE) }
        val ratio = times.minOf { it.second } / times.minOf { it.first }
        assertTrue(ratio < MAX_RATIO, "a move among $LARGE tables took $ratio times as long as among $SMALL")
    }

    private companion object {
        const val SMALL = 500
        const val LARGE = 4000                  // 8x: linear ~8, quadratic ~64
        const val RUNS = 3
        const val MAX_RATIO = 24.0
    }
}
```

See it fail on the old code before the fix (`git stash push -- <the source file>`, run the one test on
`:core:jvmTest` and `:core:linuxX64Test`, `git stash pop`). Keep the inputs big enough that the large case takes
tens of milliseconds, or timer noise decides the ratio. A parallel Gradle build on the same machine can push a
borderline ratio over the bound; rerun the test alone before blaming the code.

## 7. Pitfalls

- **A timing loop in zsh** with an unquoted `$cmd` runs nothing; check exit codes or let hyperfine run the command.
- **Stale JVM jars** when profiling: `jvmTest` does not rebuild `jvmJar`.
- **`Level.Invocation` setup** dominates sub-microsecond operations; benchmark bigger units of work.
- **A benchmark of an error path**: an edit that is refused returns fast. Check success once in `@Setup`.
- **Comparing JVM numbers with native ones**: they answer different questions; compare like with like.
- **Running benchmarks in the CI gate**: too slow and noisy. Gate on scaling-test ratios instead.
- **A Gradle daemon still busy** from a build you just ran, or a parallel agent's build: check `pgrep -fa GradleDaemon`
  and the load before a JMH or hyperfine run; `./gradlew --stop` ends your own daemons.
