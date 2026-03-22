# Config — mdtask

Search scope and file filtering configuration.

- [ ] CFG-001 Limit search directory
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `path`
  - env `MDTASK_PATH`

- [ ] CFG-002 Add include/exclude file patterns
  Support `files.include` and `files.exclude` arrays in config
  to filter which files are scanned for tasks.

  Example:
  ```yaml
  files:
    include: ["**/*.md"]
    exclude: ["**/*.example.md", "examples/**"]
  ```
