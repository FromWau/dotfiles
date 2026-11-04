# Test matrix for a port

One file per ported page/unit: `docs/<feature>/test-matrix-<page>.md`. Written during the port.

## Header

```markdown
# Test matrix: <page> (V2) vs. legacy <LegacyFragment>

Every case must behave like the legacy page unless the row says **V2:** (a deliberate difference).
Legacy references:

- `Abbr:<line>`: `path/to/LegacyFragment.java`
- `Grid:<line>`: `path/to/LegacyAdapter.java`

The V2 code is `<NewViewModel>` (route `<Route>`).

Run on <device> with <safety precondition, e.g. a test-build frame>. Fill in the result column (OK / FAIL + note).

Legend for setup:
- **Type** = <config switch and its values>
```

## Sections and rows

Group by concern with lettered sections; number rows inside (`A1`, `A2`…).

```markdown
## A. Entering the page

| ID | Setup | Steps | Expected (legacy) | Result |
|---|---|---|---|---|
| A1 | Any | Open the page | Reader LED off (`Sel:79`) | |
```

- **Setup**: the config/data state needed ("Postpay chip, Above zero = true").
- **Steps**: what a tester does on the device, concretely.
- **Expected**: the legacy behaviour with its `Abbr:<line>`; a deliberate change starts with **V2:**.
  Where legacy behaviour is uncertain, say "note what shows".
- **Result**: left empty for the tester.

## Coverage checklist

Walk the scope's 1:1 table; every ✅ and ⚠️ row needs at least one case. Then add:

- **Entering**: lifecycle side effects (LEDs, menus, listeners), guards that bounce back, state reset.
- **Content**: every data shape the page renders (each item type, empty, many, config variants).
- **Each action**: happy path, refused path, error path.
- **Timers**: fires, restarts (language change, return), stopped by an action, not reset by screen lock.
- **Cancel/back**: single, rapid multi-tap, at the same time as another action.
- **Language** changes and what they reset.
- **Lifecycle**: screen lock/unlock, config change (dark mode), process death, return from a later page.
- **Races and repeats**: double taps, two targets at once, ten rounds of forward/back.
