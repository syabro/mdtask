# MVP Tasks — mdtask

## Parser

- [ ] MVP-001 Implement regex for task header recognition		#parser
  Regex: `^- \[[ x]\] [A-Z]+-\d+ `
  Must correctly match:
  - `- [ ] TSK-123 Title`
  - `- [x] ABC-1 Done task`
  Metadata tokens on header line after title (optional `\t\t` separator).

  Tests:
  - valid IDs of different formats
  - checkbox [ ] and [x]
  - edge cases (spaces, special characters)
  - empty file
  - malformed headers (broken syntax, incomplete)
  - special characters in task title
  - header with metadata on same line
  - header with `\t\t` separator before metadata

- [ ] MVP-002 Implement task body collection (indented block)		#parser
  Collect all lines with ≥1 space indent after header.
  Empty lines within block are allowed.
  Block ends at first line with zero indent.

  Tests:
  - multiline body
  - empty lines inside
  - correct block termination

- [ ] MVP-003 Parse metadata from header line		#parser
  Metadata = tokens on header line after title.
  First `#`, `!`, or `@` token marks start of metadata.
  Extract:
  - tags: `#tag` (including with digits: #v2, #123)
  - priority: `!crit`, `!high`, `!low` (no tag = medium)
  - property: `@key:value` (e.g. `@status:blocked`)

  Tests:
  - all token types
  - multiple tokens in one line
  - tags with digits #v2, #123
  - metadata with `\t\t` separator
  - metadata without separator

## Infrastructure

- [ ] MVP-004 Project structure and entry point		#infra
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works

- [ ] MVP-005 File search function		#infra
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
