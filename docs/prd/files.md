# Files — mdtask

File search across project.

## File search

The `findMarkdownFiles()` function discovers all `.md` files recursively within a base directory. It uses ripgrep (`rg`) as the primary search tool for speed, with automatic fallback to the standard `find` command if ripgrep is unavailable.

The function:
- Searches recursively including hidden directories
- Returns absolute paths sorted alphabetically
- Excludes `node_modules` and `.git` directories by default
- Supports additional exclusions via the `excludeDirs` option or `MDTASK_EXCLUDE_DIRS` environment variable
- Handles file names with spaces and special characters

## Tasks

- [x] FLS-028 File search function		@iter:mvp
  Recursive search `*.md` including hidden directories.
  Use `rg --files -g '*.md' --hidden`.
  Exclude: node_modules, .git (default).
  Override via `MDTASK_EXCLUDE_DIRS`.
  If rg not found — fallback to `find . -name '*.md'`.

  Tests:
  - file search finds all md
  - excludes node_modules, .git
  - MDTASK_EXCLUDE_DIRS works
  - spaces in file names
  - special characters in path
  - fallback when rg not found

  **Implemented:**
  - `findMarkdownFiles(options?)` function in `src/files.ts`
  - Primary search via `ripgrep` with `*.md` glob and `--hidden` flag
  - Fallback to `find` command when ripgrep unavailable
  - Default exclusions: `node_modules`, `.git`
  - Custom exclusions via `excludeDirs` option or `MDTASK_EXCLUDE_DIRS` env
  - Returns sorted array of absolute file paths
  - Handles spaces and special characters in paths
