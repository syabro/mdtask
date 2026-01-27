# MVP Tasks — MDTASK

## Parser

- [ ] MVP-001 Implement regex for task header recognition
  #parser
  Regex: `^- \[[ x]\] [A-Z]+-\d+ `
  Must correctly match:
  - `- [ ] TSK-123 Title`
  - `- [x] ABC-1 Done task`

  Tests:
  - valid IDs of different formats
  - checkbox [ ] and [x]
  - edge cases (spaces, special characters)
  - empty file
  - malformed headers (broken syntax, incomplete)
  - special characters in task title

- [ ] MVP-002 Implement task body collection (indented block)
  #parser
  Collect all lines with ≥1 space indent after header.
  Empty lines within block are allowed.
  Block ends at first line with zero indent.

  Tests:
  - multiline body
  - empty lines inside
  - correct block termination

- [ ] MVP-003 Parse metadata from task body
  #parser
  Metadata = second line of task (immediately after header).
  Extract:
  - tags: `#tag` (including with digits: #v2, #123)
  - priority: `!p1..p5`
  - status: `@status(value)`

  Tests:
  - all token types
  - multiple tokens in one line
  - tags with digits #v2, #123

## CLI Commands

### View Commands

- [ ] MVP-004 Command `mdtask list` — basic output
  #cli
  Recursive search through `*.md` files.
  Use `rg` for search.
  By default show only open `[ ]` tasks.
  Flag `--all` to show all including `[x]`.
  Colored output when tty (priority, status).
  Output format: `[status] ID priority Title`
  ```
  [ ] TSK-123 !p1 Task name
  [x] TSK-124 !p3 Another task
  ```

  Tests:
  - search in subdirectories
  - search in hidden directories
  - no md files in directory
  - empty directory
  - --all flag shows [x]
  - colors on tty, no colors on pipe

- [ ] MVP-005 Command `mdtask list` — sorting
  #cli
  Flags:
  - `--sort=priority` (by !p1..p5)

  Tests:
  - sort by priority

- [ ] MVP-006 Command `mdtask view <ID>`
  #cli
  Print full task block by ID.
  If not found — error.

  Tests:
  - output full block
  - error on non-existent ID

### Filter Commands

- [ ] MVP-007 Filter by tag `mdtask list #tag`
  #cli #filter
  Filter tasks by tag.
  Support multiple tags (AND logic).

  Tests:
  - filter by single tag
  - filter by multiple tags (AND)

- [ ] MVP-008 Filter by priority `mdtask list !p1`
  #cli #filter
  Filter tasks by priority.

  Tests:
  - filter by priority

### Mutation Commands

- [ ] MVP-009 Command `mdtask done <ID>`
  #cli #mutation
  Toggle `[ ]` ↔ `[x]` in task header.
  File modified in-place.
  Duplicate ID — error.
  Already done — warning.

  Tests:
  - toggle [ ] → [x]
  - toggle [x] → [ ]
  - file not corrupted
  - duplicate ID — error
  - repeated done — warning

- [ ] MVP-010 Command `mdtask open <ID>`
  #cli #mutation
  Open file with task in `$EDITOR +N` at task line.

  Tests:
  - opens in $EDITOR
  - non-existent ID

- [ ] MVP-011 Command `mdtask move <ID> <file>`
  #cli #mutation
  Move task to another file.
  Remove from source, add to target.

  Tests:
  - task removed from source
  - task added to target
  - entire block moved
  - move to non-existent file (error or create)
  - move to same file (no-op or error)

- [ ] MVP-012 Command `mdtask validate`
  #cli
  Integrity check:
  - ID uniqueness
  - empty tags
  - malformed metadata
  Errors to stderr.

  Tests:
  - duplicate ID — error
  - empty tag — warning
  - valid file — ok

## Infrastructure

- [ ] MVP-013 Project structure and entry point
  #infra
  Create:
  - `bin/mdtask` — main entry point
  - `lib/` — helper scripts
  - `test/` — bats tests
  All errors to stderr.

  Tests:
  - entry point works

- [ ] MVP-014 File search function
  #infra
  Recursive search `*.md` including hidden directories.
  Use `rg --files -g '*.md' --hidden`.
  Exclude: node_modules, .git (default).
  Override via `MDTASK_EXCLUDE_DIRS`.

  Tests:
  - file search finds all md
  - excludes node_modules, .git
  - MDTASK_EXCLUDE_DIRS works
  - spaces in file names
  - special characters in path

- [ ] MVP-015 Help system
  #infra
  `mdtask --help` — list of commands.
  `mdtask <cmd> --help` — command help.

  Tests:
  - --help outputs command list
  - <cmd> --help outputs help
