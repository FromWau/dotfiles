---
name: python
description: Python development conventions, covering package management with `uv` and single-file scripts using PEP 723 inline metadata. Apply whenever writing, running, or editing Python (`.py`), creating a script or CLI tool that pulls dependencies, setting up a venv or `pyproject.toml`, or whenever `pip`, `uv`, `virtualenv`, or `requirements.txt` come up. Reach for this before suggesting `pip install` or a bash script that embeds Python.
---

# Python

## Package management: always `uv`

Use `uv` for everything. It resolves reproducibly, is fast, and keeps
environments isolated from the system Python.

- Install packages with `uv pip install`, never bare `pip install`.
- Create virtual environments with `uv venv`.
- For a real multi-file package, use a `uv` project: `uv init`, `uv add <dep>`,
  `uv run <cmd>`. Dependencies live in `pyproject.toml`, locked in `uv.lock`.

## Standalone scripts: single-file with PEP 723

For one-off tools and scripts, do not scaffold a `pyproject.toml` project and do
not write a bash script that shells out to Python via a heredoc. Write the whole
thing as one self-contained `uv` script with an inline PEP 723 metadata header.
`uv run` reads the header, builds an isolated cached venv, and runs the script
against it without ever touching the system site-packages.

Template:

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "rich"]
# ///

def main():
    ...


if __name__ == "__main__":
    main()
```

Then `chmod +x` the file so it runs directly (`./tool.py`). The first run
resolves and caches the dependencies; later runs are effectively instant.

### Why single-file over a bash+python hybrid

If a task tempts a bash script that needs Python (parsing JSON, an HTTP request
with auth, anything past trivial), write the entire tool as a uv script instead.
A hybrid forces data through fragile shell boundaries (base64, here-docs,
quoting) and splits the logic across two languages. One uv script keeps real
data structures, real error handling, and a single language, while staying
directly executable and dependency-pinned.

### Pitfalls

- The shebang needs `env -S` to pass multiple arguments. Plain
  `#!/usr/bin/env uv run --script` fails on Linux, because the kernel hands
  `env` the single argument `uv run --script` (a program by that literal name).
  `-S` tells `env` to split it.
- `uv` must be installed on any machine that runs the script; the script cannot
  bootstrap uv itself.
- Inline dependencies are isolated, but external CLI tools the script invokes
  via `subprocess` are still system dependencies and must already be present.
