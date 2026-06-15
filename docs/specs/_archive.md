- [x] CLI-001 Command `mdtask list` — basic output		@iter:mvp @blocked_by:TSK-040 @blocked_by:FLS-028
  Recursive search through `*.md` files.
  Use `rg --files -g '*.md' --hidden` for file discovery.
  By default show only open `[ ]` tasks.
  Flag `--all` to show all including `[x]`.
  Colored output when tty (priority, status).
  Output format: `[status] ID Title !priority`
  ```
  [ ] TSK-123 Task name !high
  [x] TSK-124 Another task
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
  
  When a task has `@blocked_by:TSK-038` in its metadata, show it in the output:
  ```
  [ ] CLI-003 Command `mdtask view <ID>` @blocked_by:TSK-039 @blocked_by:FLS-028
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

- [x] CLI-002 Command `mdtask list` — sorting
  Flags:
  - `--sort=priority` (crit → high → med → low)

  Tests:
  - sort by priority

  **Implemented:**
  - `--sort=priority` flag sorts tasks by priority: crit → high → medium (no priority) → low
  - Stable sort preserves original file order within same priority level
  - Works with `--all` flag to sort both open and done tasks

- [x] CLI-003 Command `mdtask view <ID>`		@iter:mvp @blocked_by:TSK-039 @blocked_by:FLS-028
  Print full task block by ID.
  If not found — error, exit 1.

  Tests:
  - output full block
  - error on non-existent ID

  **Implemented:**
  - `mdtask view <ID>` prints raw header line + dedented body
  - Task found by ID across all markdown files in base directory
  - Exits with code 1 and error message if task not found
  - Body dedented using `collectTaskBody` from TSK-039

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

- [x] CLI-006 Command `mdtask done <ID>`		@iter:mvp @blocked_by:TSK-038 @blocked_by:FLS-028
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

  Currently: `[ ] TSK-038 !high Fix bug`
  New:       `[ ] TSK-038 Fix bug !high`

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

- [x] CLI-021 Command `mdtask ids` — auto-assign globally unique IDs		@iter:new-ids
  New command that scans all files for tasks without IDs (`- [ ] Title without prefix`)
  and assigns PREFIX-NNN where:
  - PREFIX derived from existing tasks in the file or a seed line (`- [ ] CLI- Title`)
  - NNN is globally unique across all prefixes (next after global max)
  - Multiple un-IDed tasks in one file get sequential numbers top-to-bottom
  - Also detects and reports ambiguous/duplicate numeric parts across prefixes
  Error if file has no prefix source.

  **Implemented:**
  - `mdtask ids` command scans files and assigns PREFIX-NNN to unidentified tasks
  - Prefix derived from existing IDed tasks (most frequent) or seed line — no config needed
  - NNN globally unique across all prefixes, zero-padded to at least 3 digits
  - Two-pass approach: validates all prefixes before any file mutations
  - Seed prefix on a task overrides file-level prefix for that task
  - Duplicate numeric parts across prefixes reported as warnings

- [x] CLI-022 Short numeric lookup in all commands		@iter:new-ids
  All commands accept plain number: `mdtask view 42` resolves to the task whose NNN=42.
  Add `resolveTaskId(input, tasks)` shared function:
  - Exact match first (CLI-042)
  - Numeric suffix match (42 → CLI-042)
  - Error if not found

  **Implemented:**
  - `resolveTaskId(input, tasks)` shared function in task.ts
  - All commands (view, done, open, move, set) accept plain numbers
  - Exact ID match takes priority, then numeric suffix lookup
  - Errors on not found, duplicate ID, or ambiguous numeric match

- [x] CLI-023 Command `mdtask set <ID...> <tokens...>` — add metadata to tasks
  Add/update metadata tokens on task header lines.
  Accepts multiple IDs (spaces or commas).

  Usage:
  mdtask set EXMPL-021 EXMPL-022 @iter:new-ids
  mdtask set EXMPL-021,EXMPL-022 #feature !high
  mdtask set EXMPL-021 @iter:new-ids #backend

  Args parsed by first char: #=tag, !=priority, @=property, otherwise=ID.
  File modified in-place. Error if any task not found.

  **Implemented:**
  - `mdtask set` command with multiple ID support (space and comma separated)
  - Tags skipped if already present, priority replaced, properties always appended
  - Grouped file writes — multiple tasks in one file modified in single read/write
  - Priority replacement targets metadata only, not title text
  - 14 tests covering all token types, duplicates, errors, and edge cases

- [x] CLI-024 Default command shortcuts
  `mdtask` without arguments defaults to `list`.
  `mdtask EXMPL-023` without a command name defaults to `view`.
  Only when the sole argument matches a task ID (`[A-Z]+-\d+` or plain number).
  If the argument is not a known command and not a valid ID pattern,
  print an error message and show help.

  **Implemented:**
  - No args → runs `list` command
  - Task ID as sole arg (`[A-Z]+-\d+` or plain number) → runs `view` for that ID
  - Unknown non-command arg → prints error message with help output, exits 1

- [x] CLI-045 Tabular output for `mdtask list`
  Render list output as a compact table with aligned columns: ID, Title, Priority, Tags, Properties.
  Current flat format: `[ ] CLI-001 Fix bug !high @iter:mvp`
  New table format with column headers and separators.
  Columns auto-sized to content width.
  Keep flat format when piped (non-TTY) for parseability.

  **Implemented:**
  - Table format with header, separator, and aligned data rows in TTY mode
  - Columns: ID (with status checkbox), Title, Priority, Tags, Props (blockers + properties)
  - Columns auto-sized to max content width, empty columns auto-hidden
  - Color coding preserved: priority colors, red blockers, gray for done tasks
  - Non-TTY output unchanged (flat format for parseability)

- [x] CLI-046 Show file location in `mdtask view` output
  Display file path and line number in `mdtask view` output header.
  Example: `docs/specs/cli.md:191`
  Users can see where the task lives without running `mdtask open`.

  **Implemented:**
  - File path (relative to cwd) and line number shown as first line of view output
  - Gray color in terminal, plain text when piped
  - Format: `path/to/file.md:42`

- [x] CLI-050 Interactive prefix prompt in `mdtask ids`
  When `mdtask ids` encounters a file with no prefix source (no existing IDs, no seed prefix):
  - If TTY: prompt user "Enter prefix for <filename>:" and use the input
  - If not TTY (pipe): error as today

  **Implemented:**
  - TTY prompt via `node:readline/promises` — asks "Enter prefix for \<file\>:"
  - Input trimmed, uppercased, validated against `^[A-Z][A-Z0-9]*$`
  - Invalid/empty input exits with error and descriptive message
  - Non-TTY mode preserves existing error behavior
  - Readline interface reused across multiple files, closed after loop

- [x] CLI-051 Show unidentified tasks in list output with warning
  `mdtask list` should display tasks without IDs after the main list,
  separated by a warning header:
  ```
  Warning: tasks without IDs (run `mdtask ids` to assign):
  - [ ] Basic boiling                    README.md:5
  - [ ] Tea presets                      README.md:6
  ```
  Show file path (relative) and line number for each.

  **Implemented:**
  - Warning section appended after main task list when unidentified tasks exist
  - Shows file path (relative to cwd) and line number, right-aligned
  - Yellow header and gray locations in TTY mode; plain text when piped
  - Respects `--all` flag (done unidentified tasks hidden by default)
  - Excluded seed prefixes from `.mdtaskrc` are filtered out

- [x] CLI-052 `mdtask ids` output should include `- [ ]` prefix
  Currently prints `KTL-001 Title`, should print `- [ ] KTL-001 Title`
  (or `- [x]` for done tasks) to match task format.

  **Implemented:**
  - `mdtask ids` stdout now prints `- [ ] ID Title` for open tasks and `- [x] ID Title` for done tasks
  - Reuses the same formatted string for both file mutation and stdout output

- [x] CLI-054 `mdtask view` body should be indented with 6 spaces
  Currently `collectTaskBody` fully dedents the body (0 indent).
  Add 6-space indent prefix to every non-empty body line in view output.

  **Implemented:**
  - Body lines indented with 6 spaces in view output, aligned with title after `- [ ] `
  - Empty lines in body remain unindented
  - `collectTaskBody` unchanged — indent applied in `handleView` presentation layer

- [x] CLI-055 Rename `searchPath` to `basePath` across codebase
  Internal variable/parameter name `searchPath` should be `basePath` to match
  the concept of base directory. Rename in src/cli.ts, src/files.ts,
  src/config.ts, and tests. Update --path help text from "Search path" to
  "Base directory".

  **Implemented:**
  - Renamed `FindOptions.searchPath` → `basePath` in src/files.ts
  - Renamed `resolveSearchPath()` → `resolveBasePath()` in src/config.ts
  - Renamed all `searchPath` variables/params in src/cli.ts (collectTasks + 8 handlers)
  - Updated `--path` help text to "Base directory for tasks"
  - Updated all test references in test/files.test.ts and test/config.test.ts

- [x] CLI-056 Scope `mdtask ids --path <file>` and add `--prefix`
  `mdtask ids --path <file>` should assign IDs only in that file.
  `--prefix PREFIX` should supply a fallback when no prefix can be derived.
  Missing-prefix errors should name the exact task location.

  **Implemented:**
  - `--path` pointing at a file now limits mutations to that file while preserving global numeric IDs
  - Added `--prefix` fallback for files with no existing ID or seed prefix
  - Missing-prefix errors include file, line, and task text
  - Covered targeted file, explicit prefix, invalid prefix, and unrelated-file cases in tests

- [x] CLI-059 Add `--tag` and `--priority` filter flags to `mdtask list`
  `mdtask list #backend` and `mdtask list !high` depend on raw `#`/`!` arguments.
  The shell eats them — `#` starts a comment, `!` triggers history expansion — so the
  filter is silently dropped: the user gets the full list with no error and no way to
  tell the filter was ignored.

  Add explicit `--tag <name>` and `--priority <crit|high|low>` options that need no shell
  quoting. The positional `#tag` / `!priority` filters keep working unchanged. Multiple
  values follow the same semantics as the existing positional filters.

  **Implemented:**
  - `mdtask list --tag <name>` and `--priority <level>`, both repeatable and shell-safe;
    accept the value with or without a leading `#`/`!`.
  - Flag and positional filters merge with identical semantics: tags AND together,
    priorities OR together.
  - `--help` and the listing docs now lead with the flag form so the feature is discoverable.

- [x] CLI-060 Warn on duplicate numeric ID parts in `mdtask validate`
  IDs are documented as globally unique by their numeric part, and short numeric lookup
  (`mdtask view 22`) depends on it. But `validate` doesn't check for duplicate numbers, so
  `CLI-001` and `PRJ-001` pass validation and only surface later as an "ambiguous ID" error
  when someone uses numeric lookup. `mdtask ids` already detects duplicate numbers.

  `mdtask validate` should report duplicate numeric parts across prefixes, naming the
  conflicting IDs and their files, so the conflict is caught at validation time instead of
  at lookup time.

  **Implemented:**
  - `mdtask validate` warns (stderr, no exit 1) when one number is used by more than one
    prefix, naming each conflicting ID with its file:line.
  - Locations are grouped by full ID, so an exact-duplicate ID (already reported as an error)
    appears once in the numeric warning instead of twice.
  - Uses the same numeric extraction as short lookup, so the warning matches exactly the
    collisions that would make `mdtask view <n>` ambiguous.

- [x] CLI-063 Command `mdtask install-skills <dir>` — deliver skills into an agent's skill directory
  A skill auto-invokes only when its `SKILL.md` sits in the agent's own skill-discovery
  folder. That folder differs per agent and there are dozens of agents, so mdtask cannot know
  it — but the agent does, and passes it in. Today the npm package ships no skills at all, so
  an installed user can't get the SDD methodology the workflow depends on. The skills must also
  stay current when the mdtask version changes, with no manual reinstall.

  Bundle the shippable skills (`sdd`, `mdtask`, `mdtask-create`, `mdtask-next`) in the npm
  package (add them to `package.json` `files`); the project-local `check` skill is not shipped.

  `mdtask install-skills <dir>` creates symlinks in the directory the caller names (the agent's
  own skill folder) — no agent detection, no built-in dir map. The symlink target depends on
  how mdtask is available:
  - Installed as a project dependency → link straight into `node_modules/mdtask/skills`. The
    version is already pinned by the project; no cache, no version check.
  - Global install or `npx` → link into a per-user cache at `~/.config/mdtask/skills/`. On any
    `mdtask` invocation, if the cache's version stamp is older than the running version,
    overwrite the cache with the bundled skills and update the stamp (plain overwrite, no
    locks; only-if-older so an old run never downgrades). The cache stays current after a
    version bump, so every agent's symlinks pointing at it update with no manual reinstall.

  No registry of install locations is kept.

  **Implemented:**
  - `mdtask install-skills <dir>` symlinks the 4 shippable skills into `<dir>` (created if
    needed). Skills are bundled into a top-level `skills/` dir at build time (tsup `onSuccess`
    runs `scripts/bundle-skills.mjs`) and shipped via `package.json` `files`.
  - Project-dependency installs link to the logical `node_modules/mdtask/skills/<skill>` path
    (stable across version bumps); global/`npx` installs link into `~/.config/mdtask/skills/`
    (honors `XDG_CONFIG_HOME`).
  - The cache self-refreshes: any `mdtask` run rewrites it when the running version is newer
    (only-if-older, never downgrades), but only when the cache already exists and the run is
    not a local dependency — so local/dev runs never mutate a global cache. Best-effort, no
    locks (single shared cache, newest-wins, by design).
  - Re-points only mdtask-managed symlinks (path-boundary checked); leaves real dirs and
    foreign symlinks untouched and reports them. Exits non-zero if any skill is skipped or the
    bundle is incomplete, so automation never mistakes a partial install for success.

- [x] CLI-064 Command `mdtask archive` — move done tasks out of PRDs
  Done `[x]` tasks bloat PRD files and burn agent context. `mdtask archive`
  moves done task blocks (same extraction as `mdtask move`) into one archive file.
  - `mdtask archive` — all done in base; `archive <id...>` — точечно; `--path <file>` — один файл.
  - Default path `<basePath>/_archive.md`, override via `.mdtaskrc` `archivePath`.
    Must stay inside the scanned base so `@blocked_by`/`view` to archived tasks resolve.
  - Never archive from the archive file itself.

  **Implemented:**
  - `mdtask archive` moves all done tasks in the scanned base into `<basePath>/_archive.md`.
  - `mdtask archive <id...>` archives only named done tasks and rejects open tasks.
  - `--path <file>` limits archiving and explicit ID lookup to one file.
  - `.mdtaskrc` `archivePath` selects another archive file inside the scanned base, and the archive file itself is skipped.

- [x] CFG-025 Limit search directory
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `path`
  - env `MDTASK_PATH`

  **Implemented:**
  - Global `--path <path>` CLI flag
  - `.mdtaskrc` JSON config with `path` property (searches current dir and parents)
  - `MDTASK_PATH` environment variable
  - Priority: flag > env > config > default (.)

- [x] CFG-026 Add include/exclude file patterns
  Support `files.include` and `files.exclude` arrays in config
  to filter which files are scanned for tasks.

  Example:
  ```yaml
  files:
    include: ["**/*.md"]
    exclude: ["**/*.example.md", "examples/**"]
  ```

  **Implemented:**
  - `files.include` and `files.exclude` arrays in `.mdtaskrc` config
  - Glob patterns passed to ripgrep via native `-g` flags (no extra dependencies)
  - Exclude patterns override include when both match
  - Fallback to `find -path` when ripgrep unavailable
  - Validated config parsing: non-array/non-string values are ignored

- [x] CFG-027 Exclude tasks by ID prefix		#noqa @blocked_by:PRJ-033
  Add `excludePrefixes` array to `.mdtaskrc` config.
  Tasks whose ID starts with any listed prefix are hidden from all commands (list, validate, etc.).

  Example config:
  ```json
  { "excludePrefixes": ["EXMPL"] }
  ```

  After implementing, rename all example task IDs in docs to use `EXMPL-` prefix
  (spec-driven-development.md, SKILL.md, create-task SKILL.md, cli.md view output example, task.md body example).

  **Implemented:**
  - `excludePrefixes` config field parsed and validated in config.ts
  - Tasks with matching ID prefixes skipped during collection in all commands
  - All example IDs in docs renamed to EXMPL-* prefix
  - Project `.mdtaskrc` configured with `["EXMPL", "KTL"]`
  - Phantom tasks eliminated: `mdtask list` shows only real tasks

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

- [x] PRJ-030 Add picocolors for CLI colors
  Install and use `picocolors` library for ANSI colors.
  Replace manual color codes in `src/cli.ts` with picocolors API.
  
  Library: `picocolors` (~2KB, zero dependencies)
  
  Changes:
  - `pnpm add picocolors`
  - Replace `COLORS` constant with picocolors imports
  - Replace manual ANSI codes with `p.red()`, `p.yellow()`, etc.
  
  Tests:
  - Colors work in TTY mode
  - Colors disabled in pipe mode (picocolors auto-detects)
  - All existing tests pass

  **Implemented:**
  - `picocolors` installed as production dependency
  - Manual ANSI color codes replaced with picocolors API
  - Removed `useColor` parameter - picocolors auto-detects TTY
  - `formatPriority()` and `formatTaskLine()` simplified
  - All 87 tests pass, lint clean

- [x] PRJ-031 Add ts-pattern for pattern matching
  Install and use `ts-pattern` library for type-safe pattern matching.

  Library: `ts-pattern` (~47KB bundled)

  Use cases:
  - Refactor command handlers to use `match().with()` chains
  - Add exhaustive pattern matching for command routing
  - Improve type safety in switch-like logic

  Changes:
  - `pnpm add ts-pattern`
  - Refactor `handleCommand()` to use pattern matching
  - Refactor color formatting to use pattern matching

  Tests:
  - All existing tests pass
  - Pattern matching covers all command cases exhaustively

  **Implemented:**
  - `ts-pattern` installed as production dependency
  - Available for use where it improves clarity (see project.md "Pattern Matching" section)
  - Not yet adopted in existing code — `cac` handles command routing, `switch` handles priority formatting

- [x] PRJ-032 Dev script `pnpm mdtask` — proxy to tsx		@iter:mvp
  Add npm script `mdtask` that runs `tsx src/cli.ts` for local development.
  This allows running `pnpm mdtask list` without building.

  Changes:
  - Add `tsx` as dev dependency
  - Add `"mdtask": "tsx src/cli.ts"` to package.json scripts

  Tests:
  - `pnpm mdtask list` outputs tasks
  - `pnpm mdtask --help` works

  **Implemented:**
  - `tsx 4.21.0` added as dev dependency
  - `"mdtask": "tsx src/cli.ts"` script added to package.json
  - Arguments pass directly: `pnpm mdtask list --all` works without `--` delimiter
  - `pnpm mdtask list` and `pnpm mdtask --help` verified working

- [x] PRJ-029 Project structure and entry point		@iter:mvp
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works

- [x] PRJ-033 Tag #noqa skips Gemini and /check in /next-task
  When a task has `#noqa` tag, /next-task should skip:
  - Step 3 (validate plan with Gemini)
  - Step 5 (code review with Gemini)
  - Step 8 /check

  Update docs/skills/next-task/SKILL.md accordingly.

  **Implemented:**
  - Added `#noqa` callout at top of Flow section in next-task SKILL.md
  - Steps 3, 5, and 8 each have "Skip if task has `#noqa` tag" note
  - Feature description added to docs/specs/project.md

- [x] PRJ-035 Migrate to globally unique numeric IDs		@iter:new-ids
  Renumber all existing tasks so NNN is unique across all prefixes.
  Update all `@blocked_by:OLD-ID` references.
  Single atomic commit. Do not touch EXMPL/KTL example IDs.

  **Implemented:**
  - CLI-001–024 kept as-is, all other prefixes renumbered to 025–044
  - All `@blocked_by` references updated to new IDs
  - EXMPL/KTL example IDs untouched
  - `mdtask validate` passes clean after migration

- [x] PRJ-036 Update create-task skill for new ID scheme		@iter:new-ids
  Simplify create-task skill: write task without ID, then run `mdtask ids`.
  Remove manual ID computation from Step 4.
  Update prefix-to-PRD table to match `.mdtaskrc` `prefixes` field.

  **Implemented:**
  - Removed manual ID computation (old Step 4), replaced with `mdtask ids` after save
  - Documented three task header formats: no ID, seed prefix, full ID
  - Default is write without ID — `mdtask ids` assigns automatically
  - Added TST prefix to PRD table
  - Updated examples to show new workflow

- [x] PRJ-037 Document globally unique ID scheme		@iter:new-ids
  Update docs/mdtask.md section 7 "Task Identity" and docs/skills/mdtask/SKILL.md:
  - NNN is globally unique across all prefixes
  - Short numeric lookup: `mdtask view 42`
  - `mdtask ids` auto-assigns IDs
  - Prefix-to-file mapping in `.mdtaskrc`

  **Implemented:**
  - Updated mdtask.md section 7 with globally unique NNN, short numeric lookup, `mdtask ids`
  - Updated SKILL.md ID description to reflect PREFIX-NNN with auto-assignment
  - Removed mention of `.mdtaskrc` prefix mapping (not needed — prefix derived from files)

- [x] PRJ-047 Publish to npm so `npm install -g mdtask` works
  Configure package.json for npm publishing.
  Ensure the built CLI binary works as a global install.
  Add bin entry, build step, and publish workflow.
  Add `just release` command to bump version, build, and publish.

  **Implemented:**
  - `files` field limits tarball to `dist/`, `README.md`, `LICENSE` (11KB total)
  - npm metadata: license, author, repository, keywords
  - PolyForm Shield 1.0.0 license
  - `just release [patch|minor|major]` — checks clean git, tests, builds, bumps, publishes, tags, pushes

- [x] TSK-038 Implement regex for task header recognition		@iter:mvp
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

  **Implemented:**
  - Function `parseTaskHeader(line: string): TaskHeader | null` in `src/task.ts`
  - Returns `null` for non-task lines
  - Extracts: status ('open'|'done'), ID, title, rawMetadata
  - Supports metadata detection via whitespace or `\t\t` separator
  - Rejects empty titles (metadata immediately after ID)
  - Property keys allow hyphens: `@build-status:value`

- [x] TSK-039 Implement task body collection (indented block)		@iter:mvp @blocked_by:TSK-038
  Collect all lines with ≥1 space indent after header.
  Empty lines within block are allowed.
  Block ends at first non-indented non-empty line.

  Tests:
  - multiline body
  - empty lines inside
  - correct block termination

  **Implemented:**
  - `collectTaskBody(lines, headerIndex)` in `src/task.ts` returns dedented body as a single string
  - Minimum common indent stripped, relative indentation preserved for nested content
  - Empty lines within body preserved, trailing empty lines trimmed
  - CRLF line endings handled consistently with `parseTaskHeader`
  - Tab-only indentation not treated as body (spec requires spaces)

- [x] TSK-040 Parse metadata from header line		@iter:mvp @blocked_by:TSK-038
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

  **Implemented:**
  - `parseMetadata(rawMetadata: string)` function extracts structured metadata from raw string
  - Tags stored as array: `['#feature', '#v2']`
  - Priority parsed as `'crit' | 'high' | 'low' | null` (null = medium)
  - Properties stored as `Record<string, string[]>` supporting multiple values per key
  - Duplicate property keys accumulate values in array (e.g., `@blocked_by:TSK-038 @blocked_by:FLS-028`)
  - First priority wins when multiple specified
  - Protected against prototype pollution with `Object.create(null)` and `Object.hasOwn()`

- [x] TSK-041 Unknown priority tags
  Unknown `!` tags (not crit/high/low) — warning or ignore?
  Solution: parse any `!\w+`, validate in `mdtask validate` command.

  **Implemented:**
  - Parser accepts any `!\w+` as priority (first match wins), not just crit/high/low
  - `mdtask validate` warns about unknown priority values (e.g., `!urgent`)
  - Unknown priorities sort as medium and display without color
  - Multiple priority tokens on one line: each unknown is warned individually

- [x] TSK-042 Document @blocked_by as well-known property		#noqa
  Add a section in docs/skills/mdtask/SKILL.md describing `@blocked_by:ID` as
  the only property with special behavior:
  - Unresolved blockers shown in red in `mdtask list`
  - Resolved (done) blockers hidden from list output
  - Full blocker info preserved in file, visible via `mdtask view`

  All other properties (@status, @iter, etc.) are per-project conventions
  with no built-in behavior.

  **Implemented:**
  - Added a `@blocked_by — the one built-in property` section to `docs/skills/mdtask/SKILL.md`
  - Documents the three special behaviors (red unresolved, hidden resolved, full info via `view`)
  - Notes all other `@key:value` properties are project conventions with no built-in behavior

- [x] TSK-061 Ignore checkbox lines inside fenced code blocks
  Task detection scans every `- [ ]` / `- [x]` line in a `.md` file, including lines inside
  fenced code blocks (triple-backtick or tilde fences). Documentation that shows example
  tasks — like the unidentified-task warning example in `cli.md` — is parsed as real tasks:
  the examples pollute `mdtask list`, and `mdtask ids` rewrites them in place, assigning IDs
  to purely illustrative lines. `excludePrefixes` can't prevent this, because examples shown
  without an ID have no prefix to exclude.

  When scanning a file, skip any line inside a fenced code block — it is never a task. This
  applies to every command that collects tasks (`list`, `validate`, `ids`, `view`, ...).

  **Implemented:**
  - `computeFenceMask(lines)` flags every line inside a ` ``` ` or `~~~` fence; all three
    file-scan loops (identified tasks, unidentified-task warnings, `ids` rewrite) skip them.
  - Follows CommonMark fence rules that matter here: 0–3 space indent (tabs don't count),
    same-character close at least as long as the opener with a blank tail, unclosed fence
    runs to end of file. Backtick opener with a backtick in its info string is not a fence.
  - Example tasks in PRD code blocks no longer appear in `list`/`view`/`validate` and are
    never assigned IDs by `mdtask ids` — the `EXMPL-` + `excludePrefixes` workaround is no
    longer needed to keep doc examples out of the task list.

- [x] TSK-062 Parse header metadata from the end of the line
  A `#`, `!`, or `@` in the middle of a title is currently misread as the start of metadata,
  so the title is truncated and phantom tags appear. Real cases in this repo: `PRJ-033`
  parses as just "Tag", `CLI-004` is cut mid-title, and `PRJ-033` then wrongly matches a
  `#noqa` tag filter. This affects `list` display and tag/priority filtering. (Read-only —
  the file text is intact, no data loss.)

  Recognize metadata as the trailing run of tokens at the END of the header line. Scan
  whitespace-delimited tokens from the right: while each is a metadata token (`#tag`,
  `!crit`/`!high`/`!low`, `@key:value`), peel it into metadata; stop at the first word that
  is not a token. Everything before that point is the title — a `#`/`!`/`@` that is not part
  of the trailing run stays in the title.

  Also require tags to start with a letter (`#[A-Za-z]…`), so issue references like `#123`
  are never tags and survive anywhere in the line.

  The explicit `\t\t` separator keeps working unchanged and still takes priority when present.

  **Implemented:**
  - `parseTaskHeader` peels the trailing run of metadata tokens from the right; the first
    non-token word stops the scan, so a `#`/`!`/`@` earlier in the line stays in the title.
    `PRJ-033` and `CLI-004` now keep their full titles.
  - Tags must start with a letter (`#[A-Za-z][\w-]*`), so `#123`-style issue refs are never
    tags — `PRJ-033` no longer matches a `#noqa` filter.
  - `parseMetadata` is now token-based: each whole token is classified, so a `#`/`!` inside a
    property value (e.g. a URL fragment `@url:…/page#section`) is not mistaken for a tag or
    priority. `validate`'s unknown-priority check uses the same token rule (`extractPriorityTokens`).

- [x] TST-044 Group related assertions into fewer test blocks
  Many tests are single-assertion one-liners, creating vertical noise.
  Group logically related assertions into shared `it()` blocks.

  Example: instead of 5 separate `it('parses tag X')` with one expect each,
  one `it('parses various tag formats')` with multiple expects.

  Goal: fewer test blocks, same coverage, better readability.

  **Implemented:**
  - Reduced test blocks from 222 to 194 (13% reduction) across task.test.ts and list.test.ts
  - task.test.ts: merged ID formats, invalid headers, priorities, tags, property keys, CRLF, standalone tokens
  - list.test.ts: merged excludePrefixes and pipe behavior tests
  - Same assertion coverage — no tests removed, only grouped
