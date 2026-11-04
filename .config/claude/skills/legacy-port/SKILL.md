---
name: legacy-port
description: >-
  Faithful, scope-by-scope porting of legacy code into a new architecture, e.g. legacy Android Fragments,
  XML layouts, Java ViewModels and adapters into Compose + MVI ViewModels, or any old module rewritten into a
  new stack. Bisects the legacy feature into scopes (flows, screens, fragments, view models, base classes,
  adapters, helpers), ports one scope at a time while keeping the old structure and method names, maps every
  legacy behaviour 1:1 with line references so nothing is dropped, writes a test matrix for each port as it
  goes, walks the fresh port through a review with the user, and deletes the legacy source only as the very
  last step. Use it whenever the user says "port", "migrate", "rewrite in Compose", "move to V2", "feature
  parity", "map what the old fragment does", "compare legacy vs new", "did we drop anything", "walk through
  the old code with me", "next fragment", or is replacing old screens with new ones step by step, even when
  they never say "port". Pair with `mvi`, `compose`, `kotlin` and the project's domain skill.
---

# Legacy port

Porting is not rewriting. The goal is the same behaviour on a new structure, verified line by line, so
the user can trust that nothing the old code did got lost. The legacy code is usually spaghetti: one
screen's behaviour is spread over a fragment, its view model, two adapter base classes and a base
fragment. That is exactly why a port drops things silently, and why this skill exists.

**Dropping a behaviour is a bug**, even one that looks irrelevant. A deliberate difference is fine, but
only when the user decided it; it is then recorded as such (in the code, in the test matrix, in the report).

## The loop

### 1. Bisect into scopes

Map the feature before touching code: the flow (which unit leads to which, under which condition), and
for every unit the files that carry its behaviour. A "unit" is what one new screen/view model will own:
usually one legacy fragment **plus** its view model, its base classes (`BaseFragment`, `FullscreenBaseFragment`…),
its adapters (and their base adapters), and the helpers only it calls. Routing logic that picks the next
unit belongs to the unit that decides, not the target.

Present the map, then **stop**: the user picks the first scope. Do one scope at a time and walk it
together; a big-bang map-and-port of everything is how things get dropped.

When the new design merges or splits legacy units (two legacy fragments become one page, one fragment
becomes two routes), say so up front and keep each legacy unit traceable to exactly one new owner.
Merging is fine when it is a UI decision and no behaviour is lost; it goes wrong when the merged units
had their own lifecycle work (timers, LEDs, cleanup) that now needs hand-wiring on step changes.

### 2. Map the scope 1:1

Read every file of the scope top to bottom (not just the fragment). Produce one table:

| # | Legacy behaviour | Where (file:line / method) | New code today |
|---|---|---|---|

Status per row: ✅ ported, ❌ missing, ⚠️ different, ➖ nothing to port (with evidence). Include lifecycle
work (LEDs, side menus, listeners, timers), guards and early returns, locks (`block()`, `isBlocked()`,
`Consumable`), error handling, debug/analytics events, profiler markers and log lines, cleanup in `onDestroyView`, and what happens on
language change or screen rotation.

**Ground "dead" claims before marking ➖.** Legacy code is full of contracts nothing calls anymore
(an `isAllowed()` whose only caller was removed years ago) and catches for exceptions the path cannot
throw. Grep the whole repo for callers and throwers, and `git log -S` when a caller vanished, then cite
the evidence in the table. Never port something just because it is there, and never drop it on a hunch.

Collect the open decisions (behaviour the new design might deliberately change) as short lettered
questions with a recommendation, and let the user answer before porting.

### 3. Port faithfully

- **Keep the legacy shape.** Same method names (`onCreateView`, `onViewCreated`, `refreshUI`,
  `onTaskEvent`, `onBackPressed`, `proceedToConfirmation`…) as private functions in the new view model, in
  roughly the same order, so the user can validate side by side. Public entry points stay the new
  architecture's fixed hooks (e.g. `RouteLifecycle.onEnter/onStart/onStop/onLeave`, see `mvi`); the hooks
  call the legacy-named methods.
- **Map lifecycle by when it ran, not by name.** View-creation work runs again when the page is shown
  again but not after a screen lock; visibility work runs on every start/stop. See
  `references/android-fragment-to-mvi.md` for the mapping table.
- **Translate mechanisms, keep behaviour.** Legacy `block()`/`Consumable` becomes the exclusive-action lock
  (`isProcessing` + `ActionOutcome`); `CustomCountDownTimer` becomes a coroutine `delay`; popups become
  Compose dialogs; deprecated static helpers become their modern replacements (the deprecated one usually
  just delegates). Where legacy behaviour is a bug (a lock that never releases), ask whether to copy it.
- **Behaviour only, unless told otherwise.** If the new UI design lacks something the legacy UI showed
  (a warning text, an icon, a currency line), flag it as missing UI instead of inventing design; build a
  plain placeholder only when the user asks.
- **Stay in scope.** Never change shared components or helpers other screens use without asking first,
  even for a behaviour-preserving overload. Unrelated cleanups the port uncovers (nullability, constants)
  go where the user says (often a separate branch).
- **Build after every step** with the project's build command and read the result.

### 4. Write the test matrix while porting

Every port gets a test matrix file next to the feature docs (`docs/<feature>/test-matrix-<page>.md`),
written in the same session as the port, not afterwards. Each row is a manual test a person can run on a
device later; expected results cite the legacy line they come from; deliberate differences are marked
**V2:**. More cases are better than fewer. Format and coverage checklist: `references/test-matrix.md`.
When a later port changes an earlier page's behaviour (routing moved, a page split), update that page's
matrix too.

### 5. Review the fresh port with the user

Give the file lists, names only:

```
**Old**
- LegacyFragment.java
- LegacyViewModel.kt
**New**
- NewViewModel.kt
- NewRouteHost.kt (the route wiring)
```

Then let the user step through. Answer "where is this from?" with the exact legacy file:line, and
"you missed X" by checking it against the table, fixing it, and adding the row. Fix what they find before
moving to the next scope.

### 6. Delete the legacy source last

The legacy files stay in the repo, even when nothing calls them anymore, until the **whole** port is done,
reviewed, and tested on device against the matrices. They are the reference every review and test relies
on. Only then, as the final action, delete them: grep for remaining references first, delete only what is
truly dead, build, and report what was removed and what still has callers.

## Reporting a scope

After porting a scope, report:

- the 1:1 table with the new status column;
- deliberate differences (what the user decided, and where it is recorded);
- missing UI flagged, not built;
- what you left alone and why (dead contracts with evidence, out-of-scope findings);
- build result, and that it is not yet tested on device if it is not.

## Pitfalls seen in practice

- A guard re-added inside the locked function (`if (isProcessing) return` after `runExclusive` already
  set it) silently blocks every action. The lock lives in one place.
- Folding view-creation work into `onStart` makes a screen lock redo it (cart cleared, list reset).
- Copying a legacy value that formats differently (credits vs currency, `formatCredit` vs
  `formatCurrency`) passes review by eye; compare the exact formatter call.
- A legacy adapter's filter can make a whole branch unreachable (folders filtered out, so the category
  click path never runs). Port the filter and the branch together, and note the finding.
- Legacy code often re-reads live config on every call (`new Constants().timeout`, a static formatter that
  builds itself from the current config). Caching the instance in a view model property (`private val
  formatter = Factory.create()`) freezes that config for the view model's life; use a getter instead.
