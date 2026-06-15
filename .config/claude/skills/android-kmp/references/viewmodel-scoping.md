# Composable-Scoped ViewModels (lifecycle 2.11)

Scoping a `ViewModel` to *any composable* instead of a backstack entry — one VM per
list item / card / bottom sheet — plus how to keep many scoped VMs cheap.

## The capability

- **Before 2.11**: a VM needed a `ViewModelStoreOwner` backed by a *backstack entry*
  (screen, nav graph, or activity). That forced one VM per screen.
- **lifecycle 2.11**: scope a VM to the *current composition*. The VM survives config
  changes and is **cleared when its composable permanently leaves composition** (e.g.
  scrolled out of a `LazyRow`), and restored when it returns.
- **Official APIs** (added in `lifecycle 2.11.0-alpha02`):
  - `rememberViewModelStoreOwner()` — one scoped owner for the call site.
  - `rememberViewModelStoreProvider()` — hoist above a list/`Pager`, then
    `rememberViewModelStoreOwner(provider, key = ...)` per item for many independent scopes.

## Mechanism

`viewModel()` / `koinViewModel()` resolve `LocalViewModelStoreOwner.current`. Override
that composition local with a scoped owner and any VM created inside binds to that scope:

```kotlin
// Reusable helper — pure common APIs, drop in commonMain.
@Composable
fun ComponentViewModelScope(
    key: Any,                                   // dynamic when many of same VM type
    saveableStateHolder: SaveableStateHolder,   // hoisted ABOVE the list
    content: @Composable () -> Unit,
) {
    val provider = rememberViewModelStoreProvider()
    val owner = rememberViewModelStoreOwner(provider, key = key)
    saveableStateHolder.SaveableStateProvider(key) {
        CompositionLocalProvider(LocalViewModelStoreOwner provides owner) { content() }
    }
}
```

- **`key`**: dynamic (item id) when you have multiple VMs of the same type — same idea as
  `LazyColumn` item keys; it selects which VM instance + saved state to restore on recycle.
  Static (a constant) when there's only one instance (e.g. one chat bottom sheet).
- **State restoration**: hoist the `SaveableStateHolder` *above* the list so it outlives the
  items, and read/write item-local state through the VM's `SavedStateHandle` — restored when
  a recycled item returns.
- **Per-instance args**: pass via creation extras (`viewModel { ItemVm(id, createSavedStateHandle()) }`)
  or Koin `koinViewModel { parametersOf(id) }`.

## When to use it

- Worth it for **complex screens with subcomponents that have real independent state** — e.g. a
  video-call screen: one VM per participant card, one for the chat sheet, one screen-level VM for
  high-level actions (mute, end call) and cross-card state.
- **Not** for a plain CRUD list with one or two state fields — keep the single screen VM (see
  SKILL.md "No Base Classes" / don't force MVI on simple screens).
- Bonus: lets you scope a VM *across* multiple screens by wrapping a composable that hosts them.

## State ownership across multiple VMs

- **Local-only** (per-item, items don't talk to each other — e.g. a card's volume/expanded
  toggle) → item VM, persisted in `SavedStateHandle`.
- **Cross-item** (only one can hold it — e.g. which card is pinned/selected) → **hoist to the
  owning/screen VM**. The previously-selected item's VM may already be dead, so an item VM can't
  own it.
- **Shared / external** (websocket stream, favorites) → singleton data source (Koin `single`)
  exposing a `StateFlow`; every item VM injects the *same* source and observes the same state.

## Performance: many scoped VMs + per-item flows

Common fear: "100 item VMs → 100 repos, 100 DB-reading flows, a bulk update fires 100 emits."
Almost none of that is true if you follow the source-of-truth rules.

- **Repo is not duplicated.** It's a DI `single`; constructor injection hands every item VM the
  *same* instance. Injecting ≠ constructing. 100 VMs → 1 repo, 1 hashmap.
- **Writes are cheap.** `save`/`delete`/`favorite` are user-triggered, one at a time, O(1). The
  number of VMs doesn't multiply writes.
- **Flows are push, not poll.** An idle `StateFlow` collector is a suspended coroutine parked in
  the subscriber list — ~free. "N flows actively reading the DB" is a misread of how flows work.
- **Only visible items have VMs.** Composable-scoping means collector count = viewport (~8), not
  table size (1000). Scroll away → VM cleared → flow cancelled.
- **One hot source, cheap per-item slices.** Keep a single hot source of truth in the repo and
  derive each item's view from it — never a per-item *cold* flow (re-executes the producer per
  collector; see `coroutines-and-flows.md` cold-vs-hot):
  ```kotlin
  class PlantRepository {
      private val _plants = MutableStateFlow<Map<String, Plant>>(emptyMap())
      val plants: StateFlow<Map<String, Plant>> = _plants.asStateFlow()   // ONE DB observation

      fun plant(id: String): Flow<Plant?> =
          plants.map { it[id] }.distinctUntilChanged()                    // O(1) in-memory slice

      fun bulkUpdate(updated: List<Plant>) =
          _plants.update { it + updated.associateBy(Plant::id) }          // ONE upstream emit
  }
  // item VM: repo.plant(id).stateIn(viewModelScope, WhileSubscribed(5_000), null)
  ```
- **A bulk update is not N meaningful emits.** Update the single `MutableStateFlow` once → one
  upstream emit → fan-out reaches only the ~visible collectors → `distinctUntilChanged` drops any
  whose own item didn't change (`data class` structural equality) → only changed *and* visible
  items recompose.
- **You often don't need per-item data flows at all.** Keep the single `StateFlow<List<Item>>` and
  pass the item down as a parameter; Compose diffs by `key` and only the changed item recomposes.
  The item VM then observes the repo only for item-specific data (lazy detail) or shared streams.

## KMP / CMP availability

- The whole stack lives in `commonMain` via the JetBrains republish
  `org.jetbrains.androidx.lifecycle:lifecycle-viewmodel-compose` and works on Android / iOS /
  desktop / web. The `ComponentViewModelScope` helper above is copy-paste portable into `commonMain`.
- **Use the `org.jetbrains.androidx.lifecycle:*` coordinate** matching your Compose Multiplatform
  version — *not* `androidx.lifecycle:*:2.11`. Version skew between the two = resolution errors.
- `SaveableStateHolder` is Compose runtime (always multiplatform); `SavedStateHandle`, creation
  extras, and Koin's `koinViewModel()` (resolves `LocalViewModelStoreOwner.current`) are all
  multiplatform.
- **Config-change survival is Android-only** (no activity recreation on desktop/iOS/web). The
  clear-on-leave + restore-on-return-to-composition behavior works on every platform.
- **Maturity (snapshot 2026-06):** scoping APIs are in `lifecycle 2.11` — androidx at
  `2.11.0-rc01`, JetBrains multiplatform republish around `2.11.0-beta01`, i.e. **pre-stable**.
  Pin exact versions and re-check current status before relying on it; expect possible API churn
  before GA.
