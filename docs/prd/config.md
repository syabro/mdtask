# Config — mdtask

Search scope and file filtering configuration.

- [ ] CFG-001 Limit search directory
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `search_paths`
  - env `MDTASK_PATH`

- [ ] CFG-002 Filter by file extension
  `MDTASK_EXTENSION=*.todo.md` — search only in files with specific extension.
  Default `*.md`.

- [ ] CFG-003 Add include/exclude file patterns
  Support `files.include` and `files.exclude` arrays in config
  to filter which files are scanned for tasks.

  Example:
  ```yaml
  files:
    include: ["**/*.md"]
    exclude: ["**/*.example.md", "examples/**"]
  ```
