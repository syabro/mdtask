# CLI — mdtask

User-facing commands, security, edge cases, and testing infrastructure.

## Listing tasks

The `mdtask list` command searches all `.md` files recursively from the current directory and displays tasks in a compact format:

```bash
mdtask list              # Show only open tasks
mdtask list --all        # Show all tasks including done
```

Output format shows status, ID, title, priority (if any), blockers (if any), and all other `@key:value` properties:
```
[ ] EXMPL-001 Fix authentication bug !high
[ ] EXMPL-002 Update documentation @blocked_by:EXMPL-001 @iter:mvp
[x] EXMPL-003 Refactor utils !low @status:done
```

When output is to a terminal (TTY), priorities are color-coded:
- `!crit` — red
- `!high` — yellow  
- `!low` — green
- Done tasks — gray

When piped to another command, colors are disabled for clean parsing.

### Sorting

```bash
mdtask list --sort=priority    # Sort by priority: crit → high → medium → low
```

Tasks with the same priority retain their original file order (stable sort).

### Filtering by tag

```bash
mdtask list #backend           # Show only tasks tagged #backend
mdtask list #backend #urgent   # Show tasks with BOTH tags (AND logic)
```

Multiple tags use AND logic — only tasks that have all specified tags are shown. Tag filters combine with `--all` and `--sort`.

### Filtering by priority

```bash
mdtask list !high              # Show only high-priority tasks
mdtask list !high !crit        # Show high OR crit tasks (OR logic)
```

Multiple priorities use OR logic — tasks matching any of the specified priorities are shown. Priority filters combine with `--all`, `--sort`, and tag filters.

## Viewing a task

`mdtask view <ID>` prints the full task block — header line (raw from file) followed by the dedented body:

```bash
mdtask view EXMPL-001
```

Output:
```
- [ ] EXMPL-001 Fix the bug		@blocked_by:EXMPL-002 !high
Description line 1.
Description line 2.
```

If the task is not found, exits with error code 1.

## Toggling task status

`mdtask done <ID>` toggles a task between open and done:

```bash
mdtask done TSK-001      # [ ] → [x]
mdtask done TSK-001      # [x] → [ ] (toggle back)
```

The file is modified in-place. If the ID is not found, exits with error code 1. If the ID appears in multiple files (duplicate), exits with error code 1.

## Opening a task in editor

`mdtask open <ID>` opens the file containing the task in `$EDITOR` at the task's line number:

```bash
mdtask open TSK-001      # opens $EDITOR +lineNumber filePath
```

If `$EDITOR` is not set, exits with error code 1. If the task ID is not found, exits with error code 1.

## Validating tasks

`mdtask validate` checks task integrity across all markdown files:

```bash
mdtask validate          # Check all files in search path
mdtask validate --path docs/   # Check specific directory
```

Checks performed:
- **Duplicate IDs** (error) — same task ID appears in multiple places. Reports all locations. Exits with code 1.
- **Empty tags** (warning) — `#` followed by whitespace instead of a tag name. Reported to stderr.
- **Malformed metadata** (warning) — `@key` without `:value`. Reported to stderr.
- **Unknown priority** (warning) — `!word` that isn't `crit`, `high`, or `low`. Reported to stderr.

Errors cause exit code 1. Warnings are reported but don't affect exit code. Clean files produce no output and exit 0.

## Moving tasks

`mdtask move <ID> <file>` moves a task (header + body) from its current file to another file:

```bash
mdtask move TSK-001 docs/prd/other.md
```

The entire task block (header line and indented body) is removed from the source file and appended to the target file. If the target file does not exist, it is created (including parent directories). If the source file becomes empty after the move, it is kept. Moving a task to the same file it already lives in is a no-op (symlink-aware).

Errors (exit code 1):
- Task ID not found or duplicate
- Source or target file is read-only (permission denied)
- Target path is a directory

## Symlink handling

File discovery follows symlinks — both symlinked `.md` files and symlinked directories are included in search results. Circular symlinks (e.g., a directory linking back to an ancestor) are detected and handled gracefully without hanging or errors.

When a symlink and its target both appear in the search tree, only one entry is returned (deduplicated by resolved real path) to prevent duplicate task IDs in output.

## Shell safety

All external process invocations use `execFileSync` or `spawnSync` without `shell: true`, so user input (task IDs, file paths, task content) is never interpreted by a shell. Task IDs are constrained to `[A-Z]+-\d+` by the parser regex, preventing metacharacters from entering IDs. File paths with special characters (spaces, `$()`, backticks, pipes) are handled safely by Node.js `fs` APIs. All output uses `process.stdout.write()` directly — no shell involved.

## Tasks

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
  - Output format: `[ ] ID !priority Title @blocked_by:ID1 @blocked_by:ID2` or `[x] ID Title` for done tasks
  - `@blocked_by` properties are displayed at the end of each task line

- [x] CLI-016 Show @blocked_by in list output
  Display `@blocked_by:ID` properties in `mdtask list` output.
  
  When a task has `@blocked_by:TSK-001` in its metadata, show it in the output:
  ```
  [ ] CLI-003 Command `mdtask view <ID>` @blocked_by:TSK-002 @blocked_by:FLS-001
  ```

  Tests:
  - task with single @blocked_by shows it
  - task with multiple @blocked_by shows all
  - task without @blocked_by has no extra output
  - done task with @blocked_by shows it in gray

  **Implemented:**
  - `@blocked_by` properties extracted from `task.properties.blocked_by` array
  - Displayed at end of line: `@blocked_by:ID1 @blocked_by:ID2`
  - Gray color applied for done tasks via existing `p.gray()` wrapper
  - Added 5 tests covering single/multiple/none/done cases

## Blocker display in list

`mdtask list` only shows **unresolved** blockers — if a blocker task is done, it is hidden from the output:

```
[ ] EXMPL-005 Fix auth bug @blocked_by:EXMPL-003
```

Here EXMPL-001 was also a blocker but is already done, so it's not shown. Non-existent blockers are treated as open and always displayed.

When output is to a terminal (TTY), open blockers are shown in red. When piped, plain text is output for clean parsing.

Full blocker info (including resolved ones) remains in the task file, visible via `mdtask view`.

- [x] CLI-002 Command `mdtask list` — sorting
  Flags:
  - `--sort=priority` (crit → high → med → low)

  Tests:
  - sort by priority

  **Implemented:**
  - `--sort=priority` flag sorts tasks by priority: crit → high → medium (no priority) → low
  - Stable sort preserves original file order within same priority level
  - Works with `--all` flag to sort both open and done tasks

- [x] CLI-003 Command `mdtask view <ID>`		@iter:mvp @blocked_by:TSK-002 @blocked_by:FLS-001
  Print full task block by ID.
  If not found — error, exit 1.

  Tests:
  - output full block
  - error on non-existent ID

  **Implemented:**
  - `mdtask view <ID>` prints raw header line + dedented body
  - Task found by ID across all markdown files in search path
  - Exits with code 1 and error message if task not found
  - Body dedented using `collectTaskBody` from TSK-002

- [x] CLI-004 Filter by tag `mdtask list #tag`
  Filter tasks by tag.
  Support multiple tags (AND logic).

  Tests:
  - filter by single tag
  - filter by multiple tags (AND)

  **Implemented:**
  - `mdtask list #tag` filters tasks by tag using variadic positional args
  - Multiple tags use AND logic — only tasks with ALL specified tags shown
  - Combines with `--all` flag and `--sort=priority`
  - No matches produces empty output (exit 0)

- [x] CLI-005 Filter by priority `mdtask list !high`
  Filter tasks by priority.

  Tests:
  - filter by priority

  **Implemented:**
  - `mdtask list !high` filters tasks by priority using variadic positional args
  - Multiple priorities use OR logic — `!high !crit` shows tasks matching either
  - Combines with `--all`, `--sort=priority`, and tag filters
  - No matches produces empty output (exit 0)

- [x] CLI-006 Command `mdtask done <ID>`		@iter:mvp @blocked_by:TSK-001 @blocked_by:FLS-001
  Toggle `[ ]` ↔ `[x]` in task header.
  File modified in-place.
  Duplicate ID — error, exit 1.
  If already `[x]` — toggle back to `[ ]` (no warning).

  Tests:
  - toggle [ ] → [x]
  - toggle [x] → [ ]
  - file not corrupted
  - duplicate ID — error

  **Implemented:**
  - `mdtask done <ID>` toggles task status between `[ ]` and `[x]`
  - File modified in-place, other content preserved
  - Duplicate ID detected across all files — exits with error
  - Non-existent ID — exits with error
  - Line verification before modification prevents stale data overwrites

- [x] CLI-007 Command `mdtask open <ID>`
  Open file with task in `$EDITOR +N` at task line.
  If `$EDITOR` not set — error, exit 1.

  Tests:
  - opens in $EDITOR
  - non-existent ID

  **Implemented:**
  - `mdtask open <ID>` spawns `$EDITOR +lineNumber filePath` with inherited stdio
  - Exits with error code 1 if `$EDITOR` is not set
  - Exits with error code 1 if task ID not found
  - Uses `execFileSync` to avoid shell injection

- [x] CLI-008 Command `mdtask move <ID> <file>`
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

  **Implemented:**
  - Moves entire task block (header + indented body) from source to target
  - Target file created if it doesn't exist
  - Source file kept even if empty after move
  - Same-file move is a no-op (exit 0)
  - Duplicate ID and not-found errors exit with code 1

- [x] CLI-009 Command `mdtask validate`
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

  **Implemented:**
  - `mdtask validate` checks ID uniqueness across all files — duplicate IDs reported as errors with file:line locations
  - Empty tags (`# ` with no name) detected and reported as warnings
  - Malformed properties (`@key` without `:value`) detected and reported as warnings
  - Errors cause exit code 1, warnings only go to stderr without affecting exit code
  - Respects `--path` option for scoping validation to specific directories

- [x] CLI-010 Help system		@iter:mvp
  `mdtask --help` — list of commands.
  `mdtask <cmd> —help` — command help.

  Tests:
  - --help outputs command list
  - <cmd> --help outputs help

- [x] CLI-011 Pipe behavior
  When stdout is not a tty:
  - no colors (ANSI codes)
  - no progress indicators
  - output is clean for parsing

  Tests:
  - no colors when piped
  - clean output for parsing

  **Implemented:**
  - All color output (priority, blockers, done task gray) gated by `isTTY` check
  - No ANSI escape codes emitted when stdout is piped
  - Output lines follow stable parseable format: `[status] ID Title [!priority] [@key:value...]`
  - No progress indicators exist in the codebase (nothing to disable)

- [x] CLI-012 Shell injection protection
  Check all places where user input reaches shell:
  - task ID in commands
  - file names
  - task content (on output)

  Use proper quoting, avoid eval.

  **Implemented:**
  - Audited all external process invocations: `execFileSync` and `spawnSync` used without `shell: true`
  - Task ID regex `[A-Z]+-\d+` prevents shell metacharacters in IDs
  - File paths with special characters handled safely by Node.js `fs` APIs
  - 11 tests added across list, view, done, move, and open commands proving safety with shell metacharacters

- [x] CLI-013 Move edge cases
  - move to read-only file — graceful error
  - source file becomes empty — keep or delete?

  **Implemented:**
  - Read-only source or target file: graceful "permission denied" error, exit 1, no partial writes
  - Target path is a directory: graceful "is a directory" error, exit 1
  - Parent directories for target created automatically if missing
  - Same-file detection uses `realpathSync` to handle symlinks (e.g. `/tmp` → `/private/tmp`)
  - Write order: target first, then source removal — prevents data loss on write failure

- [x] CLI-014 Symlinks
  How to handle:
  - symlink to md file
  - symlink to directory
  - circular symlinks

  Solution: follow symlinks, but detect cycles.

  **Implemented:**
  - `rg --follow` and `find -L` follow symlinks to files and directories
  - Circular symlinks handled gracefully — no hang, valid results still returned
  - Deduplication via `realpathSync` prevents same file appearing twice through different symlink paths
  - Relaxed exit code checks to accept valid stdout even when tools warn about cycles

- [x] CLI-015 Mock $EDITOR in tests
  Create mock-editor script:
  ```bash
  #!/bin/bash
  echo "$@" > /tmp/editor_args
  ```
  Verify that mdtask open passes correct arguments.

  **Implemented:**
  - Integration test file `test/open-integration.test.ts` with real process spawning (no execFileSync mock)
  - Mock editor bash script created per-test in temp dir, captures args via `printf '%s\n' "$@"`
  - Verifies correct `+lineNumber` and absolute file path are passed to `$EDITOR`
  - Covers tasks at different line positions and file paths with spaces

- [x] CLI-017 Color blockers by status in list output
  Show completed blockers in gray strikethrough, pending in red.

  When displaying `@blocked_by:ID`:
  - If blocked task is done: gray + strikethrough
  - If blocked task is open: red

  Example:
  ```
  [ ] EXMPL-005 Fix auth bug @blocked_by:EXMPL-001 @blocked_by:EXMPL-003 @blocked_by:EXMPL-004
                                gray+strike        red               gray+strike
  ```

  Tests:
  - blocker done → gray strikethrough
  - blocker open → red
  - non-existent blocker → red (treat as open)

  **Implemented:**
  - Blocker status determined by looking up task IDs in a status map built from all collected tasks
  - Open or non-existent blockers shown in `red` via `p.red(text)`
  - ANSI nesting avoided by applying gray only to base task parts, appending colored blockers separately
  - Priority coloring disabled for done tasks to prevent ANSI reset codes breaking the gray wrapper
  - Note: done blockers are now hidden entirely (superseded by CLI-020)

- [x] CLI-018 Move priority after title in list output
  Change output format from `[ ] ID !priority Title` to `[ ] ID Title !priority`.

  Currently: `[ ] TSK-001 !high Fix bug`
  New:       `[ ] TSK-001 Fix bug !high`

  Update tests that check output format.

  **Implemented:**
  - Modified `formatTaskLine()` in `src/cli.ts` to place priority after title
  - Updated test expectations in `test/list.test.ts` to match new format
  - Output now consistently shows: `[status] ID Title !priority @blocked_by:ID`

- [x] CLI-019 Show all @property in list output
  Display all @key:value tokens from task metadata, not just @blocked_by.

  **Implemented:**
  - All `@key:value` properties displayed in list output, not just `@blocked_by`
  - Properties sorted alphabetically by key for deterministic output
  - Multi-value properties expand to separate tokens (e.g. `@tag:cli @tag:parser`)
  - `@blocked_by` retains special handling (resolved filtering, red coloring)
  - Other properties shown as plain text after blockers
  - Done tasks: properties rendered in gray

- [x] CLI-020 Hide resolved blockers in list output
  In `mdtask list`, only show @blocked_by for blockers that are still open.
  If a blocker is done — don't display it.

  Before: `[ ] KTL-003 Schedule boiling @blocked_by:KTL-001 @blocked_by:KTL-002`
  After (KTL-001 done): `[ ] KTL-003 Schedule boiling @blocked_by:KTL-002`

  Full blocker info remains in the task file, visible via `mdtask view`.

  **Implemented:**
  - Done blockers are filtered out before rendering in `mdtask list`
  - Open and non-existent blockers still shown (non-existent treated as open)
  - When all blockers are resolved, no `@blocked_by` suffix appears
  - Full blocker info preserved in task files for `mdtask view`
