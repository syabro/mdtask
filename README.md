# mdtask

The spec-driven development system where specs and tasks live in your repo and never drift from the code.

The spec (how the system works), the tasks (what's done and what's left), and the code usually live in three disconnected places, and you sync them by hand. mdtask keeps the first two in one Markdown file next to the code: the prose on top is the spec — the manual of what's built; the checkbox tasks below are the backlog and the history. Closing a task edits that same file in the same commit as the code, so the spec stays in sync by construction.

No database, no server, no GUI. Files are the source of truth; git is the only sync and history mechanism.

## Install

```bash
npm install -g mdtask
```

Or run without installing:

```bash
npx mdtask list
```

Requires Node.js ≥ 18. File discovery uses ripgrep (`rg`) when available and falls back to `find`.

## Quick start

A spec is one Markdown file: prose on top, a `# Tasks` section below.

```markdown
# Brewing — Smart Kettle

Wi-Fi kettle with app control.

# Tasks

- [ ] Basic boiling with auto shut-off
  Heat to 100°C, beep on completion.

- [ ] Tea presets
  Predefined temperature + steep time for common tea types.
```

Assign IDs and list:

```bash
$ mdtask ids --prefix EXMPL
- [ ] EXMPL-001 Basic boiling with auto shut-off
- [ ] EXMPL-002 Tea presets

$ mdtask list
 ID            │ TITLE
───────────────┼─────────────────────────────────
 [ ] EXMPL-001 │ Basic boiling with auto shut-off
               │ Heat to 100°C, beep on completion.
 [ ] EXMPL-002 │ Tea presets
               │ Predefined temperature + steep time for common tea types.
```

Any `- [ ]` checkbox line in any `.md` file works — point mdtask at an existing `TODO.md` and `mdtask ids` picks up the checkboxes you already have.

## Task format

```markdown
- [ ] EXMPL-123 Short task title #feature !high @status:doing
  Description body goes here.
  Can be multi-line.
```

- **Checkbox** — `[ ]` open, `[x]` done
- **ID** — `PREFIX-NNN`; the number is globally unique across prefixes, so `mdtask view 123` works without the prefix
- **Metadata** (at the end of the header line):
  - `#tag` — tags, e.g. `#backend #v2`
  - `!crit` / `!high` / `!low` — priority (no token = medium)
  - `@key:value` — properties, e.g. `@iter:mvp`
- **Body** — indented lines after the header

### Blockers

`@blocked_by:EXMPL-042` is the one property with built-in behavior: open tasks with unresolved blockers are hidden from `mdtask list` until the blocker is done. `mdtask list --blocked` shows them.

## Commands

```bash
mdtask                          # no arguments = list
mdtask list                     # open, unblocked tasks
mdtask list --blocked           # include blocked open tasks
mdtask list --all               # include done tasks
mdtask list --tag backend       # filter by tag (repeatable, AND)
mdtask list --priority high     # filter by priority (repeatable, OR)
mdtask list '#backend' '!high'  # positional filters (quote them: # and ! are shell chars)
mdtask list --sort=priority     # crit → high → medium → low

mdtask view EXMPL-042           # print the full task block (alias: show)
mdtask 42                       # bare ID or number = view
mdtask open EXMPL-042           # open in $EDITOR at the task's line
mdtask move EXMPL-042 docs/specs/other.md  # move a task to another file
mdtask set EXMPL-042 '#backend' '!high'    # add metadata tokens to tasks

mdtask ids                      # assign IDs to checkbox tasks that lack them
mdtask ids --path TODO.md --prefix APP     # scope to one file, set the prefix
mdtask archive                  # move done tasks into the archive file
mdtask validate                 # check integrity: duplicate IDs, malformed metadata
mdtask install-skills <dir>     # symlink the bundled skills into an agent's skills dir
```

All commands accept `--path <dir|file>` to override where tasks are searched.

## Configuration

Optional `.mdtaskrc` (JSON), searched from the current directory upward:

```json
{
	"path": "docs/specs",
	"files": {
		"include": ["**/*.md"],
		"exclude": ["archive/**"]
	},
	"excludePrefixes": ["EXMPL"],
	"archivePath": "_done.md"
}
```

- `path` — base directory for task files (default: `.`; all `.md` files are scanned recursively, `node_modules/` and `.git/` excluded)
- `files.include` / `files.exclude` — glob patterns relative to `path`
- `excludePrefixes` — ID prefixes hidden from all commands (e.g. example IDs in docs)
- `archivePath` — archive file for `mdtask archive`, relative to `path` (default: `_archive.md`)

The `MDTASK_PATH` env variable overrides `path`; the `--path` flag overrides both.

## How it fits together

mdtask is three layers, kept deliberately separate:

1. **The CLI (`mdtask`)** — the task *format*. It reads and edits Markdown checkbox tasks and knows nothing about methodology: a small, fast interpreter over your files.
2. **The skills** (`skills/`) — the *method*. `mdtask` is the task format and spec-driven workflow reference; `mdtask-add` adds new tasks; `mdtask-do` takes one task end to end (pick → plan → build → document → commit).
3. **The loop** — driving a whole *scope* of tasks. That's your coding agent's job, not mdtask's: point the agent at `mdtask-do` and have it repeat until the backlog is empty. mdtask ships no loop or orchestrator.

The skills are plain `SKILL.md` files, loaded by any agent harness — no lock-in to a specific tool. Install them into your agent's skills directory:

```bash
mdtask install-skills ~/.claude/skills
```

## What mdtask doesn't do

- **Enforce the spec update.** Closing a task in the same commit as the spec edit is the workflow's rule, not a tool guarantee — you can tick `[x]` and leave the prose stale. The skills make the update a step and the diff makes skipping it visible; the CLI doesn't check it.
- **Run to the end without you.** When a task needs a decision only a person can make, the workflow parks it (`#user-required`) and stops instead of guessing.
- **Real-time team coordination.** No live board, no dashboards. Parallel edits are ordinary git conflicts, resolved manually.

## Development

```bash
pnpm install
pnpm mdtask <command>   # run the CLI from source (tsx), no build needed
pnpm test
pnpm lint
```

> **Note:** `npx mdtask` won't work from inside the mdtask source directory — npx conflicts with the local package. Use `pnpm mdtask` for development.

The project develops itself spec-driven: specs live in `docs/specs/`, the workflow is the `mdtask` skill — see [skills/mdtask/SKILL.md](skills/mdtask/SKILL.md).

Sources of truth — when changing one, check the others for consistency:

- **Task format** — `skills/mdtask/SKILL.md`
- **Goals, architecture** — `docs/mdtask.md`
- **Specs** — `docs/specs/`

## Sync

Git only. All operations are plain text edits, no auto-commits, conflicts resolved manually.

## License

[PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.
