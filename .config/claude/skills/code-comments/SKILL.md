---
name: code-comments
description: How to write self-documenting code and what actually earns a comment, in any language. Prefer making the code clearer — better names, smaller functions, extracted helpers, explicit types — over explaining unclear code with a comment. A comment must justify itself by explaining a WHY the code cannot carry (a non-obvious constraint, hazard, ordering requirement, external-quirk workaround, or a contract not visible locally), kept to one line. Never restate what the code does, narrate the implementation step by step, or leave feature/phase/spec/PR/history notes. Apply whenever writing a comment or doc header, deciding whether a comment is warranted, or judging comment quality in review — and when a user says comments are too verbose, leak implementation detail, or read like dev notes. Also covers doc comments on a published API (KDoc/Javadoc/docstrings a library's consumers read): how much length the external audience earns, `@param`/`@return` tags, worked examples, and keeping your own phases, ordering and type names out of them. Apply to any public/exported declaration in a library or SDK, and whenever a user says the docs should be written for external users. Also covers two places the same rules leak past comments: identifiers that encode history rather than behaviour (test names like `...IsUnchanged`, `...NoLonger...`, `...AfterTheFix`), and runtime user-facing strings — CLI help and error text, UI labels, log lines — that point readers at source comments they cannot see. Apply when naming or reviewing tests, and when auditing help/error/label text. The same rules govern standalone prose documentation — README files, module docs, guides, CONTRIBUTING, changelog entries, docs-site pages — since a README is API documentation that happens to live outside the source: apply it whenever writing or reviewing a README or any `.md` doc, when a user asks whether a section belongs in a public README, when a doc section leaks build internals or implementation mechanics a consumer cannot act on, and when prose needs tightening for length, repetition, or sentences that never end.
---

# Code Comments

Good code is self-documenting. A comment is a liability that must earn its place: it can go stale, it repeats what the code already says, and it clutters the read. **Reach for clearer code first** — a better name, a smaller function, an extracted helper, an explicit type — and write a comment only when the code genuinely cannot carry the meaning on its own. Then keep it to one line.

## What earns a comment

A comment earns its place only if it explains a **why** the code cannot: a non-obvious constraint, a subtle ordering requirement, a hazard, a workaround for an external quirk, or a contract that isn't visible at the call site. If a reader who knows the language would understand the code without the comment, there should be no comment.

- **Explain WHY, never WHAT.** `// increment i` is noise. `// dropLast(1): the API returns a trailing sentinel we must discard` is a why.
- **One line.** If a "why" needs a paragraph, that's a design smell — the code should usually be restructured, or the rationale belongs in a design doc / commit message, not inline.

The handful that genuinely earn their keep, and stay terse:

- A single line capturing a non-obvious **why**: a coroutine/thread hazard, an ordering that must not change, a magic value's meaning, a library quirk/workaround, or a wire/protocol contract not visible locally.
- A concise section divider in a long file (`// --- queries ---`) — without implementation-detail suffixes.
- A one-line note on a non-obvious test decision (e.g. why a test must use real time instead of virtual time).

When unsure whether a comment is worth it: imagine the code without it. If the code is still clear, don't write it.

## What not to write

- **Restatements** of what the adjacent code plainly does.
- **Implementation narration** — comments that walk through *how* the code works step by step. The code is the how.
- **Feature/process references** — phase numbers, stage labels, spec/issue/ticket references (`spec §5`, `Phase 3b`, `(issue #6)`, `rev 1`), "PR feedback", and any "we changed X from Y / used to / no longer / will later / deferred until" history. A comment describes the code as it is *now*, for someone reading it fresh — not a changelog, a PR description, or dev notes.
- **Bloated KDoc/docstrings** — multi-paragraph headers that re-explain the type's mechanics, list every field the signature already shows, or narrate rationale.

## Names carry history too, and a test name is the worst place for it

The "no changelog" rule applies to identifiers, not only to comments — and it costs most in a test name, because the name *is* the message when the test fails. `parserErrorExitCodeIsUnchanged` tells you nothing about the expected exit code. `aParseErrorExitsTwo` tells you what broke before you open the file.

The tell is a name that only means something to someone who saw the previous version: `...IsUnchanged`, `...NoLonger...`, `...AsBefore`, `...AfterTheFix`, `...Regression...`. Read the body and name it for the contract it actually pins.

Read before renaming, though — not every "still" is history. It is legitimate when it contrasts two things that both exist *now*: a test asserting one provider's failure leaves its sibling working, or that a builder call leaves the input object unmodified. Those describe behaviour. Rename only the names that describe a release.

## Strings your users read must not point at your source

The public-API section below is about docs a consumer reads *instead of* your source. Its mirror is text that ships at runtime — CLI help and error messages, UI labels, operator-facing log lines, API error bodies. These are written right next to the code, in the same edit as a nearby comment, and quietly pick up references to it:

```
help = "one word of the command to run (see the parity note above)"
epilogue = "Operands (documented in prose here; see the non-goal comment in the source):"
```

Your user has no "above" and no source. State what the thing does; leave the reasoning in the comment where it belongs.

This survives review because the leak reads like a comment when you scan the file top to bottom, and nobody re-reads shipped strings. Grepping user-facing string literals for `above`, `below`, `see the comment`, or your project's own marker words takes seconds and is worth doing once per release rather than per file. Check the reach before deciding it is minor: one option's `help` can surface in `--help`, the man page, generated docs, *and* shell-completion descriptions.

## Doc comments: one sentence of purpose

A doc header states what the thing *is*, in one line. Everything the signature already shows, and every paragraph of mechanics, is noise.

**Instead of**
```
/**
 * Server-side bridge: exposes the nested [Daemon] as a flat [DaemonRpc]. Every
 * method is pure delegation.
 *
 * The [sessionId] is connection-bound — the route handler allocates a unique id
 * per connection and constructs one adapter per connection. Per-session args
 * substitute this bound id for the client-supplied value... (12 more lines)
 */
```
**write**
```
/** Exposes the nested [Daemon] as the flat [DaemonRpc] wire interface. */
```
If one genuinely non-obvious behavior remains (the `sessionId` substitution above), keep a single terse line at the site where it happens — not in the header.

That one-line budget assumes a reader who can open the implementation. A published API is the exception below.

## Public API docs: written for someone who cannot read your source

On a library's public surface the reader is a consumer, not a maintainer. They cannot open the implementation, and a good doc means they never need to. That earns more than one line — but only for facts the *caller* can act on. Internal mechanics still get cut, and they are what bloat these docs in practice.

The test for every sentence: **would this still be true if the implementation were rewritten tomorrow?** If not, it is describing your internals and belongs in the code, not the API doc.

- **Keep the constraint, drop the reason it exists.** "T must be `@Serializable` for a CLI that offers `--json`" is a rule the caller obeys. "The serializer is resolved lazily on the first `--json` render rather than at construction" is your call stack.
- **Cut internal vocabulary**: your pipeline's phase names ("checked at parse time, ahead of every bind"), your builder's execution order ("it runs after `help` is applied"), your own taxonomy ("no new input kind"), internal type names. Replace each with the observable result: *what the user of the CLI/library sees happen*.
- **Cut rationale chains.** The consumer needs the restriction, not its derivation. "May not include a `.required()` option" beats a sentence explaining that a loser would have no absent form to bind.
- **First line says what it does**, never the signature in prose. Not "takes a String and returns a Connection" but "Attempts to connect to the database named by the string, returning a `Connection` or throwing `ConnectionTimeoutException`".
- **Document by example.** A four-line usage snippet outruns a paragraph, and it stays honest because it is real calling code.
- **Use `@param` / `@return` / `@throws`.** Without an explicit tag, Dokka and Javadoc generate no table entry for that parameter, so prose-only docs silently lose the per-parameter view. Tag what needs guidance; do not pad with `@param name the name`.
- **Lambda parameters need more**: when it is invoked, and what happens if it throws.
- **Address the caller.** "Your action reads each handle" lands; "the action reads each handle" describes the library to itself.

**Instead of**
```
/**
 * What this command does. Return `Ok(value)` or a typed [CliError]. The value is shown through [human],
 * or through its `toString()` when [human] is null; under `--json` it is serialized instead. That
 * serializer is resolved on the first `--json` run rather than when the command is built, so a [T] that
 * is not `@Serializable` fails there and never earlier.
 */
```
**write**
````
/**
 * Defines what this command does when it runs.
 *
 * ```kotlin
 * command("greet") {
 *     val name = argument("name")
 *     action { Ok("hello, ${name()}") }
 * }
 * ```
 *
 * @param human turns the returned value into the line printed on success; without it the value's
 *   `toString()` is printed. A `--json` run serializes the value instead of calling this, so [T] must be
 *   `@Serializable` for a CLI that offers `--json`.
 * @param block the work itself, returning `Ok(value)` or a typed [CliError] that klap renders to stderr
 *   and turns into the exit code.
 */
````

### The same test deletes whole README sections

A README is API documentation that happens to live outside the source, so it inherits every rule above — including the licence to run past one line, which is what lets it drift. Run the question over each *section*, not only each sentence: **what does a reader do differently for having read this?**

Three failure shapes recur:

- **A section documenting a mechanism the reader never sees.** A "Variance" heading explaining that `Ok(user)` has type `Result<User, Nothing>`, and that covariance is what makes it assignable where a `Result<User, CrudError>` is wanted. Perfectly true, and nobody acts on it, because the code simply works. It also names a type nobody should ever declare, which invites someone to declare it. Delete the section.
- **A requirement buried in its own derivation.** "The JVM artifacts are Java 25 bytecode, declared as `org.gradle.jvm.version` so Gradle reports an unmet requirement rather than a later `class file has wrong version` from `javac`; Android has no such attribute, so the dexer constrains it instead." One clause of that is the reader's: *this needs JDK 25*. Keep the constraint, cut the build internals, and move it beside the dependency snippet, where it is read before adding the dependency instead of after scrolling past the API.

- **A value the build already owns, restated in prose.** "The current version is `0.2.0`", sitting above `implementation("com.example:lib:0.2.0")`, while the version catalogue holds the number the build actually uses. Nothing fails when those drift. No compiler reads the README, no test compares it to the catalogue, and the commit that bumps the build file has no reason to open the docs. The reader is the one who finds out, by depending on an artifact whose API does not match the page that told them to. Point at the source instead of copying out of it: a `$libVersion` placeholder in the snippet, plus a link to wherever published versions are listed.

The tell for the first two is a heading named after your implementation ("Toolchain floor", "Internals", "Architecture") instead of the reader's task ("Add to your build", "Handle errors"). A section nobody acts on is worse than a missing one, because its presence implies it mattered.

The third is easier to spot and easier to miss: a literal in prose that also lives in a build file. It applies to any published value the build owns, not just versions, so coordinates, toolchain floors and minimum SDK levels all qualify. Docs are always the copy that rots, because they are the copy nothing verifies.

Sources: [Kotlin library-author documentation guidelines](https://kotlinlang.org/docs/api-guidelines-informative-documentation.html), [AndroidX KDoc guidelines](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-recyclerview-release/docs/kdoc_guidelines.md).

## Long sentences: split at the seams

A sentence past **~45 words** has almost always welded several claims together with `so` and `and`, and the reader has to hold every clause open until the end to find out what the point was. The word count is the cheap trigger; the real tell is those connectives, because each one marks a place the sentence could have stopped.

The fix is not trimming adjectives, which leaves one long thought slightly shorter. Find the distinct claims and give each its own sentence, so the reader takes one idea at a time and can stop once they have what they came for.

**Instead of** (47 words, three claims)
> An expected failure is a value carrying your own error type, not a thrown exception and not a message string, so a caller has to handle the failure to reach the value, and the failure survives the trip out of your data layer with its payload intact.

**write** (11, 24, 11)
> An expected failure is a value, not a thrown exception. It carries your own error type instead of a message string, so the failure leaves your data layer with its payload intact. A caller has to handle it to reach the success value.

This bites hardest in exactly the docs that earn length in the first place: public API headers and a library's README. Everywhere else the one-line budget caps the damage, but where several sentences are allowed, nobody notices that one of them never ended.

## Why this matters

Over-commenting is worse than under-commenting: stale and redundant comments actively mislead, and dense dev-narration buries the one comment that mattered. The goal is a codebase where the code speaks for itself and the few surviving comments are all signal.
