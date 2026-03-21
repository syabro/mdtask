# Files — mdtask

Project structure, file search, and file operations.

## Project Structure

- [ ] MVP-004 Project structure and entry point
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works

## File Search

- [ ] MVP-005 File search function
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
