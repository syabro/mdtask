# CLI — mdtask

User-facing commands, security, edge cases, and testing infrastructure.

All commands accept `--path <dir>` to override the base directory (default: `.`).

## Short numeric lookup

All commands that accept a task ID also accept a plain number. The number is matched against the numeric part (NNN) of task IDs:

```bash
mdtask view 22          # resolves to CLI-022 (or whichever task has NNN=22)
mdtask open 1           # resolves to CLI-001
```

Resolution order:
1. Exact match (`CLI-022`) — always preferred
2. Numeric suffix match (`22` → find task where NNN=22)

Errors: not found (exit 1), ambiguous (multiple prefixes share the same NNN), duplicate ID.

## Listing tasks

The `mdtask list` command searches all `.md` files recursively from the current directory and displays tasks in a compact format:

```bash
mdtask list              # Show open, unblocked tasks
mdtask list --blocked    # Include open tasks blocked by unresolved @blocked_by
mdtask list --all        # Include done tasks
```

By default, `mdtask list` hides open tasks with unresolved blockers. A blocker is unresolved when the referenced task is open or missing. If any matching tasks are hidden, the command prints a note with the hidden count and the `--blocked` flag to reveal them.

When output is to a terminal (TTY), tasks are displayed as a compact table with aligned columns. If a task has a body, the first body line is shown on its own indented line below the title, truncated to 120 characters with an ellipsis when longer:
```
 ID            │ TITLE                  │ PRI   │ TAGS     │ PROPS
───────────────┼────────────────────────┼───────┼──────────┼──────────────────
 [ ] EXMPL-001 │ Fix authentication bug │ !high │          │
               │ Users can sign in again.
 [ ] EXMPL-002 │ Update documentation   │       │          │ @iter:mvp
               │ New users can follow the setup.
 [x] EXMPL-003 │ Refactor utils         │ !low  │ #backend │ @status:done
               │ Maintenance work is safer.
```

Columns auto-sized to content width. Empty columns (Priority, Tags, Props) are hidden when no tasks have data for them.

Priorities are color-coded:
- `!crit` — red
- `!high` — yellow
- `!low` — green
- Done tasks — gray

When piped to another command, output uses flat format with no colors for clean parsing. The value still uses its own indented line and the same 120-character limit:
```
[ ] EXMPL-001 Fix authentication bug !high
    Users can sign in again.
[ ] EXMPL-002 Update documentation @iter:mvp
    New users can follow the setup.
[x] EXMPL-003 Refactor utils !low @status:done
    Maintenance work is safer.
```

### Blocked tasks

`mdtask list --blocked` includes blocked open tasks in the output. When blocked tasks are shown, only unresolved `@blocked_by:ID` values are displayed. Resolved blockers stay in the task file and remain visible via `mdtask view`.

Non-existent blockers are treated as unresolved. When output is to a terminal (TTY), unresolved blockers are shown in red. When piped, plain text is output for clean parsing.

### Sorting

```bash
mdtask list --sort=priority    # Sort by priority: crit → high → medium → low
```

Tasks with the same priority retain their original file order (stable sort).

### Filtering by tag

```bash
mdtask list --tag backend            # Show only tasks tagged #backend (no quoting)
mdtask list --tag backend --tag urgent  # Show tasks with BOTH tags (AND logic)
mdtask list '#backend' '#urgent'     # Same, positional form (must be quoted)
```

Prefer the `--tag <name>` flag: a bare `#backend` is eaten by the shell (`#` starts a comment), so the positional form must be quoted. The flag is repeatable; with or without a leading `#`. Multiple tags use AND logic — only tasks that have all specified tags are shown. Flag and positional tags combine. Tag filters combine with `--all` and `--sort`.

### Filtering by priority

```bash
mdtask list --priority high              # Show only high-priority tasks (no quoting)
mdtask list --priority high --priority crit  # Show high OR crit tasks (OR logic)
mdtask list '!high' '!crit'              # Same, positional form (must be quoted)
```

Prefer the `--priority <crit|high|low>` flag: a bare `!high` triggers shell history expansion, so the positional form must be quoted. The flag is repeatable; with or without a leading `!`. Multiple priorities use OR logic — tasks matching any of the specified priorities are shown. Flag and positional priorities combine. Priority filters combine with `--all`, `--sort`, and tag filters.

### Unidentified task warnings

After the main task list, `mdtask list` shows tasks without IDs with a warning:

```
Warning: tasks without IDs (run `mdtask ids` to assign):
- [ ] Basic boiling                    README.md:5
- [ ] Tea presets                      README.md:6
```

Each entry shows the task title, file path (relative to cwd), and line number. File locations are right-aligned for readability. In a terminal, the header is yellow and locations are gray.

Done unidentified tasks are hidden by default; use `--all` to include them. The warning appears regardless of tag/priority filters (unidentified tasks have no metadata to filter by). Tasks with excluded seed prefixes (from `.mdtaskrc` `excludePrefixes`) are hidden.

## Viewing a task

`mdtask view <ID>` (alias: `mdtask show <ID>`) prints the file location and the full task block — header line (raw from file) followed by the body indented with 6 spaces (aligned with the title after `- [ ] `):

```bash
mdtask view EXMPL-001
mdtask show EXMPL-001    # same thing
```

Output:
```
docs/specs/cli.md:42
- [ ] EXMPL-001 Fix the bug		@blocked_by:EXMPL-002 !high
      Users can sign in again.

      Description line 1.
      Description line 2.
```

The first line shows the file path (relative to cwd) and line number. In a terminal, this line is displayed in gray; when piped, it's plain text.

If the task is not found, exits with error code 1.

## Opening a task in editor

`mdtask open <ID>` opens the file containing the task in `$EDITOR` at the task's line number:

```bash
mdtask open TSK-038      # opens $EDITOR +lineNumber filePath
```

If `$EDITOR` is not set, exits with error code 1. If the task ID is not found, exits with error code 1.

## Validating tasks

`mdtask validate` checks task integrity across all markdown files:

```bash
mdtask validate          # Check all files in base directory
mdtask validate --path docs/   # Check specific directory
```

Checks performed:
- **Duplicate IDs** (error) — same task ID appears in multiple places. Reports all locations. Exits with code 1.
- **Duplicate numeric part** (warning) — the same number used by different prefixes (e.g. `CLI-001` and `PRJ-001`). Short numeric lookup (`mdtask view 1`) would be ambiguous. Names the conflicting IDs and their locations. Reported to stderr.
- **Empty tags** (warning) — `#` followed by whitespace instead of a tag name. Reported to stderr.
- **Malformed metadata** (warning) — `@key` without `:value`. Reported to stderr.
- **Unknown priority** (warning) — `!word` that isn't `crit`, `high`, or `low`. Reported to stderr.

Errors cause exit code 1. Warnings are reported but don't affect exit code. Clean files produce no output and exit 0.

## Moving tasks

`mdtask move <ID> <file>` moves a task (header + body) from its current file to another file:

```bash
mdtask move TSK-038 docs/specs/other.md
```

The entire task block (header line and indented body) is removed from the source file and appended to the target file. If the target file does not exist, it is created (including parent directories). If the source file becomes empty after the move, it is kept. Moving a task to the same file it already lives in is a no-op (symlink-aware).

Errors (exit code 1):
- Task ID not found or duplicate
- Source or target file is read-only (permission denied)
- Target path is a directory

## Archiving done tasks

`mdtask archive` moves done tasks into an archive file so active specs stay focused:

```bash
mdtask archive                    # archive all done tasks in the base
mdtask archive TSK-038 TSK-039    # archive specific done tasks
mdtask archive --path docs/specs/cli.md  # archive done tasks from one file
```

The default archive is `<basePath>/_archive.md`. Set `.mdtaskrc` `archivePath` to use another file inside the scanned base. The archive file is skipped during archiving, so already archived tasks are not moved again. `--path <file>` scopes both bulk archiving and explicit ID lookup to that file.

Errors (exit code 1):
- Task ID not found or duplicate
- Explicit task ID is open, not done
- Archive path is outside the scanned base
- Source or archive file is read-only (permission denied)
- Archive path is a directory

## Symlink handling

File discovery follows symlinks — both symlinked `.md` files and symlinked directories are included in search results. Circular symlinks (e.g., a directory linking back to an ancestor) are detected and handled gracefully without hanging or errors.

When a symlink and its target both appear in the search tree, only one entry is returned (deduplicated by resolved real path) to prevent duplicate task IDs in output.

## Setting metadata on tasks

`mdtask set <ID...> <tokens...>` adds metadata tokens to task header lines:

```bash
mdtask set TSK-038 @iter:new-ids               # add property
mdtask set TSK-038 TSK-039 '#backend'          # multiple IDs
mdtask set TSK-038,TSK-039 '!high' '#feature'  # comma-separated IDs
```

Args are parsed by first character: `#` = tag, `!` = priority, `@` = property. Everything else is a task ID.

- **Tags:** skipped if already present (exact match)
- **Priority:** replaces existing priority (only one allowed)
- **Properties:** always appended (multiple values per key allowed)

Metadata is appended after `\t\t` separator. If no metadata exists, `\t\t` is added.

## Auto-assigning IDs

`mdtask ids` scans all files for tasks without IDs and assigns globally unique `PREFIX-NNN`:

```bash
mdtask ids                                  # assign IDs to all unidentified tasks
mdtask ids --path docs/specs/cli.md         # assign IDs only in one file
mdtask ids --path docs/specs/notes.md --prefix NTS
```

When `--path` points to a file, only that file is changed. Existing IDs from the normal base are still read so NNN stays globally unique.

Prefix is derived automatically:
1. From existing IDed tasks in the same file (most frequent prefix wins)
2. From a seed line like `- [ ] CLI- Task title` (prefix without number)
3. From `--prefix PREFIX` when no file or seed prefix exists

NNN is globally unique across all prefixes. If the highest existing number is 023 (from any prefix), the next assigned ID will be 024.

A seed prefix on a specific task overrides the file-level prefix for that task. After `mdtask ids`, the seed marker is consumed — the task gets a proper `PREFIX-NNN` ID.

Duplicate numeric parts across prefixes (e.g. `CLI-005` and `TSK-005`) are reported as warnings to stderr.

Assigned IDs are printed to stdout in task format: `- [ ] KTL-001 Basic boiling` (or `- [x]` for done tasks).

If a file has unidentified tasks but no prefix source and `--prefix` is not set:
- **Interactive (TTY):** prompts `Enter prefix for <filename>:` (relative path) — input is trimmed, uppercased, and validated (`A-Z0-9`, must start with a letter)
- **Pipe (non-TTY):** exits with an error that includes the file, line, and task text, without modifying any files

## Shell safety

All external process invocations use `execFileSync` or `spawnSync` without `shell: true`, so user input (task IDs, file paths, task content) is never interpreted by a shell. Task IDs are constrained to `[A-Z]+-\d+` by the parser regex, preventing metacharacters from entering IDs. File paths with special characters (spaces, `$()`, backticks, pipes) are handled safely by Node.js `fs` APIs. All output uses `process.stdout.write()` directly — no shell involved.

## Default command shortcuts

`mdtask` without arguments defaults to `list`:

```bash
mdtask                   # same as: mdtask list
```

A task ID as the sole argument defaults to `view`:

```bash
mdtask EXMPL-023         # same as: mdtask view EXMPL-023
mdtask 23                # same as: mdtask view 23
```

Only matches the pattern `[A-Z]+-\d+` or a plain number. If the argument is not a known command and not a valid task ID, an error message and help are shown (exit code 1).

## Installing skills

mdtask ships its dev skills (`sdd`, `mdtask`, `mdtask-add`, `mdtask-do`) inside the npm package. A skill auto-invokes only when its `SKILL.md` lives in the agent's own skill-discovery folder, which differs per agent — so the agent passes that folder in:

```bash
mdtask install-skills <dir>   # e.g. mdtask install-skills ~/.claude/skills
```

This symlinks each skill into `<dir>` (creating `<dir>` if needed). The link target depends on how mdtask is available:

- **Project dependency** — links straight into `node_modules/mdtask/skills`. The version is pinned by the project; the links update when you bump the dependency.
- **Global install or `npx`** — links into a per-user cache at `~/.config/mdtask/skills/` (honors `XDG_CONFIG_HOME`). Any later `mdtask` run refreshes that cache when the running version is newer, so the agent's links stay current with no manual reinstall.

Skills already linked by mdtask are re-pointed on re-run; a real directory or a symlink mdtask doesn't manage is left untouched and reported. If any skill can't be linked, the command exits non-zero so setup automation sees the partial install. The project-local `check` skill is not shipped.

# Tasks

- [ ] CLI-066 Archive done tasks by user-story group
  `mdtask archive` currently moves individual done tasks into a flat `_archive.md`.
  Target: when a whole story group is closed, move the group with its heading,
  removing it from the live file. Living file is cleaned per story, not per task.

- [x] CLI-067 Remove the `done` command
  The agent edits the file directly anyway; a separate toggle command is not needed.

  **Implemented:**
  - `mdtask done` command and `handleDone` function removed from `src/cli.ts`
  - `test/done.test.ts` deleted
  - All documentation references removed from `README.md`, `docs/specs/cli.md`, and `docs/mdtask.md`

- [x] CLI-068 Hide blocked tasks from `list` by default
  `mdtask list` already shows only open tasks. Extend the default to also hide tasks
  with an unresolved `@blocked_by`, so the list shows only what's workable right now.
  After the list, print a note that N blocked tasks are hidden, with the flag to reveal
  them (e.g. `mdtask list --blocked` shows them too).
  This moves the "skip blocked tasks" logic out of the mdtask-do skill and into the CLI.

  **Implemented:**
  - `mdtask list` hides open tasks with unresolved blockers by default
  - `mdtask list --blocked` includes blocked open tasks again
  - The list prints a hidden-task note with the count and reveal flag
  - Docs and task-picking skill text now describe the new default
