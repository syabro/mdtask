# Config — mdtask

Search scope and file filtering configuration.

## Search Path

The search directory for task files can be configured via three methods (in priority order):

1. **CLI Flag**: `mdtask list --path ./docs`
2. **Environment Variable**: `MDTASK_PATH=./docs mdtask list`  
3. **Config File**: `.mdtaskrc` JSON file with `{"path": "./docs"}`
4. **Default**: Current directory (`.`)

The `.mdtaskrc` file is searched from current directory up to filesystem root.

## File Patterns

Control which files are scanned for tasks using `files.include` and `files.exclude` in `.mdtaskrc`:

```json
{
  "files": {
    "include": ["docs/prd/**"],
    "exclude": ["docs/skills/**"]
  }
}
```

- **include** — only scan files matching these glob patterns (default: all `.md` files)
- **exclude** — skip files matching these patterns (overrides include)
- Patterns are relative to the search path
- Uses ripgrep's native `-g` flag for matching

## Tasks

- [x] CFG-001 Limit search directory
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `path`
  - env `MDTASK_PATH`

  **Implemented:**
  - Global `--path <path>` CLI flag
  - `.mdtaskrc` JSON config with `path` property (searches current dir and parents)
  - `MDTASK_PATH` environment variable
  - Priority: flag > env > config > default (.)

- [x] CFG-002 Add include/exclude file patterns
  Support `files.include` and `files.exclude` arrays in config
  to filter which files are scanned for tasks.

  Example:
  ```yaml
  files:
    include: ["**/*.md"]
    exclude: ["**/*.example.md", "examples/**"]
  ```

  **Implemented:**
  - `files.include` and `files.exclude` arrays in `.mdtaskrc` config
  - Glob patterns passed to ripgrep via native `-g` flags (no extra dependencies)
  - Exclude patterns override include when both match
  - Fallback to `find -path` when ripgrep unavailable
  - Validated config parsing: non-array/non-string values are ignored
