# Context Parameters vs. Receivers — the Spotlight Principle

Context parameters are stable as of Kotlin 2.4. This doc is about the design
question they force on you: when a value needs to be threaded through your
code, should it be a **context parameter**, a **receiver**, or a plain value
parameter? Getting this wrong is the difference between code that reads clearly
and code that hides what it is actually doing.

## The mechanics (just enough to reason about the choice)

A context parameter is a parameter the compiler passes for you, matched by
type rather than written at every call site.

```kotlin
context(users: UserService)
fun summarize(user: User): Summary {
    val friends = getFriends(user)   // UserService is threaded automatically
    // ...
}

context(users: UserService)
fun getFriends(user: User): List<User> = users.findFriendsById(user.id)
```

`summarize` calls `getFriends` without passing `UserService`: the compiler
resolves it by type from the surrounding context and threads it. You still
refer to a context parameter by name (`users.findFriendsById(...)`) when you
actually use it. It is invisible in the *call*, not in the *use*.

You seed the context with the `context(value) { }` function, similar to `with`:

```kotlin
context(DbUserService()) {
    summarize(user)   // DbUserService is a subtype of UserService, so it flows in
}
```

Because a context value is just a value, you can **refine** it for a section by
providing a changed copy in a nested block:

```kotlin
context(logger: Logger)
fun handle(user: User) {
    userService.save(user)   // logs at the normal level

    context(logger.copy(minLevel = LogLevel.Critical)) {
        sendAnalytics(user)  // this non-critical work only logs on critical events
    }
}
```

## The spotlight principle

Think of a scene of code as a movie scene. It has **main characters** (the
thing the scene is about) and **secondary characters** (needed, but they move
scene to scene and should go unnoticed). The whole decision reduces to: who
gets the spotlight here?

- **Receiver = main character.** The subject of the scene. In a `buildList { }`
  block the scene is *building a list*, so the list gets the spotlight.
- **Context parameter = secondary character.** Required, threaded through, but
  not what this code is about. A `UserService` inside `summarize` is a
  dependency: you need it, but the scene is about the user's friends, not the
  service.

Kotlin gives you exactly **one** receiver slot, so the choice is a genuine
ranking, not a free-for-all. Below are the three patterns that come up, each
resolved by asking who the main character is.

## Pattern 1 — Injection (dependency threading) → context parameter

You want to move a dependency from an entry point down to where it is used,
isolating the code in between from how it was provided. That dependency is a
textbook secondary character: unnoticed, only summoned where needed. This is
the main reason context parameters exist.

Multiple dependencies are fine. They are parameters, so just declare several,
and be explicit in each function about only what it needs. Explicit, minimal
dependency lists let the compiler help you.

```kotlin
context(users: UserService, orders: OrderService, logger: Logger)
fun checkout(cart: Cart) { /* ... */ }
```

**Detecting the pattern:** a value whose type ends in `Service`, `Repository`,
`Client`, or reads like configuration is usually a context-parameter candidate.

**The cascade problem:** add a new dependency deep in the call tree and every
caller up the chain now lacks that context value, so signatures go red all the
way up. That cost is real, but do not "solve" it by packing everything into one
god-object context. That throws away the single-responsibility information (the
leaf no longer states what it actually depends on) and is no better than
passing one opaque bag around.

**Advanced (use sparingly): the holder pattern.** You can decouple *what* a
dependency is from *how* it is provided by splitting responsibilities into
small interfaces, then having one aggregate implement them all via delegation.
The Kotlin compiler threads through the indirection for you.

```kotlin
interface UserServiceHolder { val userService: UserService }
interface GroupServiceHolder { val groupService: GroupService }

context(holder: UserServiceHolder)
val userService: UserService get() = holder.userService

// one aggregate implements every holder, delegating to a lower-level bundle
class DbDependencies(
    db: Db,
) : UserServiceHolder by db,
    GroupServiceHolder by db
```

This works especially well as a tree of contexts (leaf services aggregate into
`DbDependencies`, which aggregates with a logger into something bigger). It is
heavy though: the Kotlin team applied it inside the compiler and found it
costly. Think twice before reaching for it.

**Practical advice:** start with plain context parameters. Add the holder
machinery only if the cascade actually hurts.

## Context parameters vs. a DI framework

Because Pattern 1 *is* dependency injection, the natural question is whether
context parameters replace Koin/Dagger/Hilt. They don't, and the reason is that
"DI" is really two jobs, and context parameters only take over one of them.

**The job they take over: threading.** Moving a dependency from where it is
provided to where it is used, checked by the compiler, with no service locator
and no passing it by hand through every function. This is a main reason the
feature exists, and for pure-Kotlin libraries (and the Kotlin compiler itself)
it is genuinely used as compile-time DI with no framework. The holder pattern
above is the Kotlin team pushing to see how far compile-time-checked DI can go.

**The job they leave to a framework: graph construction and lifecycle.** A DI
container does more than thread values:

- builds the object graph (wire `A` from `B` from `C`)
- owns scoping and lifetimes (app singleton, request scope, and on Android the
  ViewModel/Activity scopes the *platform* owns)
- lazy instantiation, qualifiers, multibindings

Context parameters do none of that. They are lexical and compile-time; they do
not manage lifetimes or construct graphs. On Android especially, the platform
owns the ViewModel and Activity lifecycles, so Koin/Hilt keep earning their
place there.

**The dividing line for app code:**

- A dependency with its own identity and lifecycle (a repository pulled from
  Koin, a ViewModel) stays a constructor-injected class field. The container
  manages it.
- A cross-cutting value that would otherwise thread through many signatures and
  is never the main character (logger, request-scoped clock, transaction, a
  scoped capability) is a good context parameter.

The tell that this is a complement rather than a replacement is in the talk
itself: the team built the holder pattern to approximate framework-style
aggregation, then called it heavy and said to think twice. A feature that
already replaced DI frameworks would not need that. So: keep constructor
injection via your container as the default, and reach for context parameters
for the threaded, cross-cutting values it handles more cleanly. For a small
pure-Kotlin service you could plausibly do all your DI with context parameters
and skip the framework entirely; for an app already on Koin + MVI, they coexist.

## Pattern 2 — Invisible context / effects → rare, and mostly to *consume*

Sometimes the context parameter marks a *scope* or *capability*: something is
now available, like water to a fish. Test-assertion DSLs are the classic
example. You never name the scope; you just want its API to exist inside the
block. That is what an anonymous (`_`) context parameter signals.

```kotlin
context(_: TestScope)
fun <T> T.shouldBe(expected: T) = shouldBeTrue(this == expected)
```

Defining these is where the work is, via the **bridge pattern**: put the core
capability in a small interface, re-expose each method as a context-parameter
function, then build the larger API on top and drop the interface from the
public surface.

```kotlin
// core capability as an interface
interface TestScope {
    fun assertTrue(value: Boolean)
}

// bridge: re-expose the interface method as a context-parameter API
context(scope: TestScope)
fun shouldBeTrue(value: Boolean) = scope.assertTrue(value)

// higher-level API built on shouldBeTrue; callers never see TestScope
context(_: TestScope)
fun <T> T.shouldBe(expected: T) = shouldBeTrue(this == expected)
```

**Practical advice: do not do this.** Consuming an invisible context (writing
tests, using an effect scope) is common; *defining* one is rare and usually
belongs to library authors. If you find yourself wanting an `_` in a context
parameter, stop and reconsider. A **named** context parameter is almost always
better: it documents intent, lets you refine it, and lets you talk about it
explicitly. The effect-heavy style was the main use case for the older *context
receivers*, and it is now largely an anti-pattern.

## Pattern 3 — Builders and nesting → receiver

If the scene is *about* the value, it is a main character, so make it the
receiver. `buildList`, `sequence`, `flow`, and tree-shaped DSLs (HTML, JSON,
database transactions) all fit: inside the block, the thing being built is the
subject.

```kotlin
val list = buildList {
    add(1)   // `this` is the MutableList; `add` resolves to it
    add(2)
}
```

Nesting is the strong signal. In a `kotlinx.html` builder, each tag introduces
a new receiver that **shadows** the enclosing one, and that shadowing is
load-bearing: it is how the structure is tracked, and `@DslMarker` builds on it
to keep scopes from bleeding. When *which* receiver you are calling matters to
the meaning of the code, you want a receiver, because expressing that with
context parameters gets hairier.

**Scope pollution — why not make everything a receiver.** If every dependency
is a receiver, autocomplete inside a deeply nested block offers every method
from every enclosing receiver at once. If everybody is a main character, nobody
is. This is exactly why the Kotlin team moved from context *receivers* to
context *parameters*. Named context parameters also disambiguate: `users.get`
vs. `groups.get` is clear, where two receiver `get`s would collide.

## Choosing, in one table

| Signal in the code | Use |
|---|---|
| Threaded dependency, unnoticed, used in a few leaf calls | context parameter |
| Several dependencies at once | multiple context parameters |
| A scope/capability you only consume (test DSL, effect) | context parameter (consume it) |
| Defining such a scope | bridge pattern — rare, library authors |
| The value is the subject of the block; nesting/shadowing matters | receiver |
| The call site genuinely needs to see what is passed | plain value parameter |

That last row matters: reducing noise is the whole point, but if hiding a value
would leave a reader unsure what is being passed, a plain parameter is the
honest choice. Forcing it into the context there adds confusion instead of
removing it.

## Migration and gotchas

- **Receiver -> context parameter is well supported; not the reverse.** You can
  call a context-parameter function when you have the value as a receiver, so
  starting with a receiver and later demoting it to a context parameter is a
  supported path. Plan in that direction.
- **One receiver slot.** When several values feel central, you still pick one
  receiver and push the rest into context parameters. Real libraries whose
  pieces work together hit this and have to make the call.
- **No optional/nullable-driven resolution.** There is no "use the logger if one
  is in scope, else null" context parameter, and you cannot overload on
  presence/absence of a context value (that is a resolution ambiguity). If you
  want optionality, make the type nullable and provide it explicitly:
  `context(null as Logger?) { ... }`. This is deliberate: Kotlin keeps context
  resolution simple and traceable rather than a Scala/Haskell-style implicit
  search.
- **Not the same as `CoroutineContext`.** Context parameters reflect the
  *lexical* structure of your functions; a coroutine context reflects the
  parent/child structure of coroutines. They often coincide but are unrelated
  mechanisms.

## Sources

- [Context parameters — Kotlin Documentation](https://kotlinlang.org/docs/context-parameters.html)
- [KEEP: context-parameters proposal](https://github.com/Kotlin/KEEP/blob/master/proposals/context-parameters.md)
- [Update on Context Parameters — JetBrains Blog](https://blog.jetbrains.com/kotlin/2025/04/update-on-context-parameters/)
