# Config — mdtask

Search scope and file filtering configuration.

## Base Directory

The base directory for task files is resolved in this order (first match wins):

1. **CLI file path**: `mdtask list --path ./docs/specs/config.md`
2. **CLI directory path**: `mdtask list --path ./docs`
3. **Environment Variable**: `MDTASK_PATH=./docs mdtask list`
4. **Config File**: `.mdtaskrc` JSON file with `{"path": "./docs"}`
5. **Default**: Current directory (`.`)

When `--path` points to a file, mdtask resolves that file's project root first:
the nearest parent with `.mdtaskrc`, or the nearest parent with `.git` when no
config exists. Relative `.mdtaskrc` paths resolve from that project root. This
explicit file context is not overridden by `MDTASK_PATH`.

Commands that operate on one file, such as `ids --path <file>` and
`archive --path <file>`, still limit the operation to that file while using the
file's project context for config lookup and project-wide IDs.

Without `--path <file>`, the `.mdtaskrc` file is searched from current directory
up to filesystem root.

## File Patterns

Control which files are scanned for tasks using `files.include` and `files.exclude` in `.mdtaskrc`:

```json
{
  "path": "docs/specs",
  "files": {
    "include": ["**/*.md"],
    "exclude": ["archive/**"]
  }
}
```

- **include** — only scan files matching these glob patterns (default: all `.md` files)
- **exclude** — skip files matching these patterns (overrides include)
- Patterns are relative to the base directory (`path`), not the project root. If `path` is `docs/specs`, use `["**/*.md"]`, not `["docs/specs/**"]`.
- Uses ripgrep's native `-g` flag for matching

## Excluded Directories

`node_modules` and `.git` are skipped by default. Add more via the `MDTASK_EXCLUDE_DIRS` environment variable (comma-separated directory names):

```bash
MDTASK_EXCLUDE_DIRS=dist,build mdtask list
```

## Exclude Prefixes

Hide tasks whose ID starts with a given prefix from all commands:

```json
{
  "excludePrefixes": ["EXMPL", "KTL"]
}
```

Tasks with matching prefixes are skipped during collection — they won't appear in `list`, `validate`, or any other command. Useful for filtering out example/documentation tasks.

# Tasks

- [x] CFG-084 Detect project root from file path arguments
  When the CLI is launched outside the project and receives a path to a task/spec file, project root is currently resolved from the current working directory. That can make commands scan the wrong tree and assign IDs using the wrong project context.

  If a CLI path argument points to a file, resolve `project.root` from that file's parent directories. The root is the nearest parent containing `.mdtaskrc`; if no config is found, use the nearest parent containing `.git`.

  DoD: running the CLI from outside the project with a file path uses that file's project root for task discovery, config lookup, and ID assignment.

  **Implemented:**
  - `--path <file>` now derives config and task discovery from that file's project root.
  - `list`, `view`, `validate`, `open`, `move`, and `set` use the file's project scope instead of scanning only the file.
  - `ids` and `archive` keep single-file operation scope while using the file's project context.
  - `MDTASK_PATH` no longer overrides explicit file context, and symlinked file paths resolve through the target file.
