## Bash Scripting - File Handling

### CRITICAL: Always Use Null-Delimited Output for Files

**Problem:** Filenames can contain spaces, newlines, and special characters. Standard loops break.

### NEVER Do This:
```bash
FILES=$(find . -name "*.xml")
for file in $FILES; do  # BREAKS on spaces!
    process "$file"
done
```

### ALWAYS Do This:
```bash
while IFS= read -r -d '' file; do
    process "$file"
done < <(find . -name "*.xml" -print0)
```

### Essential Commands:
- `find ... -print0` - Null-delimited output
- `while IFS= read -r -d '' file; do ... done` - Read null-delimited
- `sort -z` - Sort null-delimited
- `xargs -0` - Process null-delimited arguments

### Quick Reference:

```bash
# Find and process files
while IFS= read -r -d '' file; do
    sed -i 's/old/new/g' "$file"
done < <(find . -type f -name "*.kt" -print0)

# With sorting
while IFS= read -r -d '' file; do
    process "$file"
done < <(find . -name "*.xml" -print0 | sort -z)

# Delete files safely
find . -name "*.log" -print0 | xargs -0 rm -f

# Count files
count=0
while IFS= read -r -d '' file; do
    count=$((count + 1))
done < <(find . -name "*.kt" -print0)
```

### Additional Bash Tips:
- Always quote variables: `"$variable"` not `$variable`
- Use `[[ ]]` instead of `[ ]` for tests
- Use `set -e` to exit on errors
- Use `set -u` to catch undefined variables
- Check files exist: `[ -f "$file" ]`

-----

## Terminal

### Json formatting/selection
Use `jq` to format json output or to query against the json
