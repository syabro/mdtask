# Config — mdtask

Search scope and file filtering configuration.

## Search Scope

- [ ] POST-001 Limit search directory
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `search_paths`
  - env `MDTASK_PATH`

## File Extension

- [ ] POST-002 Filter by file extension
  `MDTASK_EXTENSION=*.todo.md` — search only in files with specific extension.
  Default `*.md`.
