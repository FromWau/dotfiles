# Examples

One worked message per shape, as sent in real sessions.

## A change to accept (klap testing matrix)

````markdown
**K29: a dash-led number that names nothing**

Before: no row covers a digit that is neither a declared short nor a number input.
```bash
ls -1‸            # K28: -1 is declared, so it's offered
```

Change: add row K29.
- **Why:** klap reads `-5` as an option word, and since nothing declares it, the list should be empty.
- **Evidence:** `ls -5` printed `ls: invalid option -- '5'`.

After:
```bash
ls -5‸            # end of word: offers nothing
ls -‸5            # inside the word: klap is handed -, so it offers ls's names
ls -5‸ dir        # words after the cursor: still nothing
```

- **A (Recommended):** add K29.
- **B:** fold it into K28 as the case where nothing is offered.
- **C:** drop it.
````

## A behaviour to define (kotoml)

From kotoml; option A is what `EditLayoutTest` pins as "removing a table takes the comment
above its header and leaves one blank line"):

````markdown
**R4: what `remove` does with the comment above a table's header**

Before: `# about b` sits right above `[b]`, and a blank line separates each table.
```toml
[a]
x = 1

# about b
[b]
y = 2

[c]
z = 3
```

Run:
```kotlin
doc.remove("b", force = true)
```

- **A (Recommended):** the comment goes with its header, and one blank line stays between the tables left.
  ```toml
  [a]
  x = 1

  [c]
  z = 3
  ```
- **B:** the comment stays as a free line where the table was.
  ```toml
  [a]
  x = 1

  # about b

  [c]
  z = 3
  ```
- **C:** the table goes, and both blank lines around it stay.
  ```toml
  [a]
  x = 1


  [c]
  z = 3
  ```
````
