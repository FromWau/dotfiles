---
name: software-design
description: Language-agnostic software design and architecture principles — single source of truth (resolve layered config/env/CLI inputs once into one computed value instead of re-deciding precedence everywhere), clean-architecture layering and dependency direction, when an abstraction earns its keep, use cases vs. repositories, model/mapper boundaries, composition over inheritance, and typed-error handling philosophy. Load this whenever a task involves a structure or architecture decision in ANY language — where a piece of code belongs, how to resolve config/flag/precedence into one source of truth, whether to introduce an interface/base class, how to slice layers or packages, how to model errors, how to shape data crossing a boundary, or whether to act on vs. suppress a linter/static-analysis finding. Applies during design, code review, refactoring, responding to a lint or complexity warning, and "where should this go?" questions, even when no framework is named. For the Kotlin expression of these ideas load `kotlin`; for Android/KMP framework specifics load `android-kmp`.
---

# Software Design

These are altitude-independent principles — they hold in Kotlin, Rust, Python, TypeScript, GDScript. Examples are written in Kotlin/Android because that is the primary codebase here, but the *reasoning* is what transfers; don't read the example's language as a constraint on where the rule applies.

Two companion skills sit below this one:
- **`kotlin`** — the Kotlin-language expression of these ideas (the `Result<D, E>` sealed idiom, mappers as extension functions, ranked domain types, coroutines).
- **`android-kmp`** — the Android/KMP framework layer (MVI/Compose/ViewModel, Koin, Gradle).

## Single Source of Truth

Prefer this by default. Every piece of state or configuration has exactly one authoritative owner; everything else *derives* from it or *observes* it, never a second copy that can drift. Duplicated truth is where "works here, wrong over there" bugs come from.

- **Runtime state — one owner, everyone else observes.** In a synced app the local database is the source of truth: server data flows in through sync, the UI observes the local store, never the network directly.
- **Layered inputs — resolve once, then freeze.** When a value can arrive from several sources with a precedence — e.g. `CLI args > environment > config file > defaults` — compute the winner **once**, at startup, into a single immutable resolved object the whole session reads. The precedence rule then lives in exactly one place. Don't scatter the check across call sites: if twenty of them each re-ask "in args? no, env? no, config?…", that decision logic is duplicated twenty times and they *will* disagree the day someone edits one. Resolve → freeze → read the computed value everywhere.

## Layering & Dependency Direction

- **Separate the layers by responsibility**:
  - **Domain** — what the concepts *are*: models, repository interfaces, error types. The core of the app.
  - **Data** — how they're fetched/stored: repository implementations, DAOs, network clients, mappers.
  - **Presentation** — how they're shown/driven: view-state, user intents, the object that orchestrates them (e.g. a ViewModel).
- **Dependency direction points inward**: Data → Domain ← Presentation. The domain is the innermost layer and **depends on nothing** — not on data, not on presentation, not on any framework or platform SDK. A change in the data or presentation layer must never force a change in the domain. If you find the domain importing a database or UI type, the arrow is backwards.

## Package by Layer, Not a `util` Dustbin

- **Never create a top-level `util` package** alongside your layers — it becomes an undefined extra layer with no access rules, and everything slowly leaks into it. Every helper belongs to exactly one layer:
  - display/date/string formatting for the UI → `presentation/util`
  - a generic `Result` wrapper, domain-level helpers → `domain/util`
  - HTTP status parsing, API error mapping → `data/util`
- Create `util` sub-packages *within* each layer, not as a feature-level sibling. The layer a helper lives in is a claim about what it's allowed to depend on — a floating `util` package makes no such claim, so it becomes a magnet for coupling.

## Abstractions — Only When You Have Two Implementations

- Introduce an interface/abstraction **only if you have, or concretely plan to have, at least two implementations**. Valid reasons:
  1. swapping the underlying library (one HTTP client vs. another),
  2. test doubles (a fake implementation for unit tests).
- **Over-abstraction is a real cost**, not a neutral "clean" default. Clicking through five files to understand what a single button does is a failure mode. An interface with one implementation adds indirection and buys nothing.
- Don't abstract mappers or use cases just because it *feels* tidy. If there will only ever be one implementation, the interface is noise.
- If you don't write tests and don't plan to, there is almost never a reason for an abstraction beyond a repository interface (which exists to hide the data source from the domain).

## Linters Are Nudges, Not Verdicts

Static-analysis findings (a lint, a complexity/`too-many-methods` checker, a style rule) are heuristics: a signal that something *might* be a smell or *could* read better. They are not correctness rules and not orders — treat each as a question to answer, not a command to obey.

- **The honest test before "fixing" one:** *would I make this change if the tool weren't complaining?* If no, you are silencing the tool, not improving the code — and a silencing change usually costs more than the finding it hides.
- **Don't let a fix break an invariant.** Flattening, extracting, or reordering to satisfy a rule can violate a single source of truth, cross a typed-error boundary, or split single-owner state that must stay together. A green check never beats correctness.
- **Don't add a needless abstraction to score points.** A delegate, wrapper, or layer introduced only to drop under a threshold is exactly the over-abstraction the rule above warns against: the reader now hops through indirection that exists to please a tool, not to model anything.
- **Inconsistency is the tell.** If you change one unit to get it under a threshold but leave its identical sibling alone, the change is threshold-driven, not design-driven. Either it is a real improvement worth doing everywhere the shape occurs, or it is not worth doing at all.
- **Some findings are false positives for legitimate shapes.** A `too-many-methods` warning on a class whose surface is dictated by a wide interface it must implement (an RPC facade, a driver/adapter over a broad API) flags a count that is externally imposed, not accidental complexity — the class still has one responsibility. Accept it honestly: suppress or baseline it with a one-line rationale, applied consistently across the siblings that share the shape, rather than contorting the code to trick the counter. An honest suppression reads better than a clever dodge.

## Use Cases — Higher-Level Business Logic Only

- A use case captures **something the user is consciously doing** — registering, saving a note, making a purchase, exporting data. It earns its place when it **combines multiple sources** (local store + remote API + scheduler) or **orchestrates meaningful side effects** (save + fire analytics + schedule a retry).
- **Not every isolated function is business logic.** A `DeleteDigitUseCase` that just calls `pin.dropLast(1)` is a utility masquerading as a use case. Drop it.
- **Use cases vs. repositories is either/or.** A rich repository that already orchestrates + a use case that just forwards to it = pointless overhead. Pick one home for the orchestration and delete the empty layer.
- **Scale the decision to project size.** Even done right, many use cases end up as empty forwarders (`GetNotesUseCase` just calls the repo). For small/medium projects, lean toward *no* use cases — keep orchestration in the repository or the presentation orchestrator. The pattern pays off in **larger** projects, where bundling steps behind one call (`LogoutUseCase` = clear session + clear cart + revoke token) saves re-deriving what an operation entails every time.
- **One use case = one public operation.** Multiple public entry points means multiple use cases.
- Formatting/display logic is presentation, not business logic — it belongs in UI mappers, never in a use case.

## Models & Mappers — One Shape Per Boundary

Give each boundary the data shape that boundary wants, and map between them:

- **Domain model** — what the concept *is* in your app. Rich, convenient types. Lives in the domain layer.
- **Storage entity** — optimized for the database: primitive/serializable fields. Data layer.
- **Transport DTO** — matches the wire format (JSON fields, etc.). Data layer.
- **UI model** — pre-formatted for display (`"1.34 km"`, `"05:45"`). Presentation layer. **Optional** — only when the UI needs heavily transformed values; simple screens use the domain model directly.
- **Keep entities/DTOs separate even when the fields currently match the domain model.** Their field names are implicitly coupled to a schema you don't control (the DB migration, the server's JSON) — coupling that to your domain model means a wire rename ripples into your core.
- **Where each mapper lives follows the dependency arrow**: data↔domain mappers in the **data** layer; domain→UI mappers in the **presentation** layer. **Never put a mapper in the domain layer** — it would drag data/presentation types inward and break the direction rule. (The *language-level* form of a mapper — e.g. an extension function in a separate file — is a `kotlin`-skill concern.)

## No Base Classes — Compose, Don't Inherit

- **Don't create `Base*` classes** (`BaseViewModel`, `BaseController`, `BaseService`). They violate single responsibility, hide coupling behind a supertype, and accumulate one-off workarounds until every subclass drags along things it doesn't use.
- **Inheritance is not a code-sharing tool.** That's not what it's for. To share behavior:
  - inject a collaborator (pass an `AnalyticsTracker` in the constructor instead of calling `trackScreenView()` from a base `init` block),
  - share utilities via free/extension functions or small focused classes,
  - use **delegation** when you genuinely need polymorphic behavior without a class hierarchy.
- If inheritance is truly needed to *enforce* an architecture, name it for what it enforces (e.g. `MviViewModel`, never `BaseViewModel`) and keep it minimal — no bundled utilities, no shared side effects.

## Error Handling — Type Your Errors, Decide Strings at the Edge

The philosophy is transferable; the concrete `Result<D, E>` type and string-resource wrapper are `kotlin`/`android-kmp` concerns.

- **Don't throw exceptions for expected failures** (no network, validation failed, disk full). Those are ordinary outcomes — model them as data with a typed error, and make the caller handle them explicitly. Reserve exceptions for genuinely exceptional/programmer-error cases.
- **Never pass human-readable error strings out of the data or domain layer.** Return a **typed error** (an enum/sealed set). Which string — and which language — the user sees is a *presentation* decision; deciding it deep in the stack hard-codes UI policy into your core and makes localization impossible.
- **Map failures to typed errors at the boundary where they occur** (e.g. HTTP status → error enum in the data layer). Then map typed error → display string in the presentation layer, at the last moment.
- A root error type with per-domain refinements keeps `when` handling exhaustive: adding a new failure becomes a compile error at every call site that must react to it, instead of a silent fall-through.
