# CLI Tasks — mdtask

Задачи по CLI-командам. Требования к каждой команде описаны в теле задачи.

## View Commands

- [ ] CLI-001 Command `mdtask list` — basic output		#cli
  Recursive search through `*.md` files.
  Use `rg --files -g '*.md' --hidden` for file discovery.
  By default show only open `[ ]` tasks.
  Flag `--all` to show all including `[x]`.
  Colored output when tty (priority, status).
  Output format: `[status] ID priority Title`
  ```
  [ ] TSK-123 !high Task name
  [x] TSK-124      Another task
  ```

  Tests:
  - search in subdirectories
  - search in hidden directories
  - no md files in directory
  - empty directory
  - --all flag shows [x]
  - colors on tty, no colors on pipe

- [ ] CLI-002 Command `mdtask list` — sorting		#cli
  Flags:
  - `--sort=priority` (crit → high → med → low)

  Tests:
  - sort by priority

- [ ] CLI-003 Command `mdtask view <ID>`		#cli
  Print full task block by ID.
  If not found — error, exit 1.

  Tests:
  - output full block
  - error on non-existent ID

## Filter Commands

- [ ] CLI-004 Filter by tag `mdtask list #tag`		#cli #filter
  Filter tasks by tag.
  Support multiple tags (AND logic).

  Tests:
  - filter by single tag
  - filter by multiple tags (AND)

- [ ] CLI-005 Filter by priority `mdtask list !high`		#cli #filter
  Filter tasks by priority.

  Tests:
  - filter by priority

## Mutation Commands

- [ ] CLI-006 Command `mdtask done <ID>`		#cli #mutation
  Toggle `[ ]` ↔ `[x]` in task header.
  File modified in-place.
  Duplicate ID — error, exit 1.
  If already `[x]` — toggle back to `[ ]` (no warning).

  Tests:
  - toggle [ ] → [x]
  - toggle [x] → [ ]
  - file not corrupted
  - duplicate ID — error

- [ ] CLI-007 Command `mdtask open <ID>`		#cli #mutation
  Open file with task in `$EDITOR +N` at task line.
  Use `$VISUAL` if set, fallback to `$EDITOR`.
  If neither set — error, exit 1.

  Tests:
  - opens in $EDITOR
  - non-existent ID

- [ ] CLI-008 Command `mdtask move <ID> <file>`		#cli #mutation
  Move task to another file.
  Remove from source, add to target.
  Target file doesn't exist — create it.
  Source file empty after move — keep it.
  Move to same file — no-op, exit 0.

  Tests:
  - task removed from source
  - task added to target
  - entire block moved
  - move to non-existent file (create)
  - move to same file (no-op)

- [ ] CLI-009 Command `mdtask validate`		#cli
  Integrity check:
  - ID uniqueness across all files
  - empty tags (`# `) — warning
  - malformed metadata — warning
  Errors to stderr.
  Exit 0 if clean, exit 1 if errors found.

  Tests:
  - duplicate ID — error
  - empty tag — warning
  - valid file — ok

## Infrastructure

- [ ] CLI-010 Help system		#cli #infra
  `mdtask --help` — list of commands.
  `mdtask <cmd> —help` — command help.

  Tests:
  - --help outputs command list
  - <cmd> --help outputs help

- [ ] CLI-011 Pipe behavior		#cli #infra
  When stdout is not a tty:
  - no colors (ANSI codes)
  - no progress indicators
  - output is clean for parsing

  Tests:
  - no colors when piped
  - clean output for parsing
