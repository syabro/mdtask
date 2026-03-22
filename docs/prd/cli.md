# CLI — mdtask

User-facing commands, security, edge cases, and testing infrastructure.

## How it works

### Listing tasks

The `mdtask list` command searches all `.md` files recursively from the current directory and displays tasks in a compact format:

```bash
mdtask list              # Show only open tasks
mdtask list --all        # Show all tasks including done
```

Output format shows status, ID, priority (if any), and title:
```
[ ] TSK-001 !high Fix authentication bug
[ ] TSK-002      Update documentation
[x] TSK-003 !low Refactor utils
```

When output is to a terminal (TTY), priorities are color-coded:
- `!crit` — red
- `!high` — yellow  
- `!low` — green
- Done tasks — gray

When piped to another command, colors are disabled for clean parsing.

- [x] CLI-001 Command `mdtask list` — basic output		@iter:mvp @blocked_by:TSK-003 @blocked_by:FLS-001
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

  **Implemented:**
  - `mdtask list` command lists all open tasks from markdown files
  - Recursive search includes hidden directories, excludes node_modules and .git
  - `--all` flag shows both open and done tasks
  - Colored output when stdout is TTY: crit=red, high=yellow, low=green, done=gray
  - File read errors are logged to stderr as warnings
  - Output format: `[ ] ID !priority Title` or `[x] ID Title` for done tasks without priority

- [ ] CLI-002 Command `mdtask list` — sorting
  Flags:
  - `--sort=priority` (crit → high → med → low)

  Tests:
  - sort by priority

- [ ] CLI-003 Command `mdtask view <ID>`		@iter:mvp @blocked_by:TSK-002 @blocked_by:FLS-001
  Print full task block by ID.
  If not found — error, exit 1.

  Tests:
  - output full block
  - error on non-existent ID

- [ ] CLI-004 Filter by tag `mdtask list #tag`
  Filter tasks by tag.
  Support multiple tags (AND logic).

  Tests:
  - filter by single tag
  - filter by multiple tags (AND)

- [ ] CLI-005 Filter by priority `mdtask list !high`
  Filter tasks by priority.

  Tests:
  - filter by priority

- [ ] CLI-006 Command `mdtask done <ID>`		@iter:mvp @blocked_by:TSK-001 @blocked_by:FLS-001
  Toggle `[ ]` ↔ `[x]` in task header.
  File modified in-place.
  Duplicate ID — error, exit 1.
  If already `[x]` — toggle back to `[ ]` (no warning).

  Tests:
  - toggle [ ] → [x]
  - toggle [x] → [ ]
  - file not corrupted
  - duplicate ID — error

- [ ] CLI-007 Command `mdtask open <ID>`
  Open file with task in `$EDITOR +N` at task line.
  If `$EDITOR` not set — error, exit 1.

  Tests:
  - opens in $EDITOR
  - non-existent ID

- [ ] CLI-008 Command `mdtask move <ID> <file>`
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

- [ ] CLI-009 Command `mdtask validate`
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

- [x] CLI-010 Help system		@iter:mvp
  `mdtask --help` — list of commands.
  `mdtask <cmd> —help` — command help.

  Tests:
  - --help outputs command list
  - <cmd> --help outputs help

- [ ] CLI-011 Pipe behavior
  When stdout is not a tty:
  - no colors (ANSI codes)
  - no progress indicators
  - output is clean for parsing

  Tests:
  - no colors when piped
  - clean output for parsing

- [ ] CLI-012 Shell injection protection
  Check all places where user input reaches shell:
  - task ID in commands
  - file names
  - task content (on output)

  Use proper quoting, avoid eval.

- [ ] CLI-013 Move edge cases
  - move to read-only file — graceful error
  - source file becomes empty — keep or delete?

- [ ] CLI-014 Symlinks
  How to handle:
  - symlink to md file
  - symlink to directory
  - circular symlinks

  Solution: follow symlinks, but detect cycles.

- [ ] CLI-015 Mock $EDITOR in tests
  Create mock-editor script:
  ```bash
  #!/bin/bash
  echo "$@" > /tmp/editor_args
  ```
  Verify that mdtask open passes correct arguments.
