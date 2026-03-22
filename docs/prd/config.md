# Config — mdtask

Search scope and file filtering configuration.

## How it works

### Search Path

The search directory for task files can be configured via three methods (in priority order):

1. **CLI Flag**: `mdtask list --path ./docs`
2. **Environment Variable**: `MDTASK_PATH=./docs mdtask list`  
3. **Config File**: `.mdtaskrc` JSON file with `{"path": "./docs"}`
4. **Default**: Current directory (`.`)

The `.mdtaskrc` file is searched from current directory up to filesystem root.

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

- [ ] CFG-002 Add include/exclude file patterns
  Support `files.include` and `files.exclude` arrays in config
  to filter which files are scanned for tasks.

  Example:
  ```yaml
  files:
    include: ["**/*.md"]
    exclude: ["**/*.example.md", "examples/**"]
  ```
