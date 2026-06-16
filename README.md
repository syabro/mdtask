# mdtask

CLI task manager where Markdown is the single source of truth. No database, no server, no GUI.

## Install

```bash
npm install -g mdtask
```

Or run without installing:

```bash
npx mdtask list
```

> **Note:** `npx mdtask` won't work from inside the mdtask source directory — npx conflicts with the local package. Use `pnpm mdtask` for development.

## Language

English is the project language — docs, commit messages, code comments, and communication.

## Principles

### Markdown is the data model

It is a structured table:
- line = record
- indent = block boundary
- inline tokens = columns (tags, priority, properties)

CLI is only an interpreter, never the owner of data.

### Help, don't hinder

Every feature must reduce user effort, not add configuration burden. Derive what you can from existing data in files — don't ask users to maintain mappings, schemas, or config that the tool could figure out on its own.

## Task Format

```markdown
- [ ] EXMPL-123 Short task title #feature !high @status:doing
  Description body goes here.
  Can be multi-line.
```

- **ID**: header in format `[A-Z]+-\d+`, globally unique
- **Metadata** (after title):
  - `#tag` — tags
  - `!crit` / `!high` / `!low` — priority (no tag = medium)
  - `@key:value` — properties
- **Body**: indented lines after header

## Brief commands intro:

```bash
mdtask list                  # list open, unblocked tasks
mdtask list --blocked        # include open blocked tasks
mdtask list --all            # all tasks including done
mdtask list '#backend'       # filter by tag (quote: # is a shell comment)
mdtask list '!high'          # filter by priority
mdtask view <ID>             # print full task block by ID
mdtask open <ID>             # open task in $EDITOR at line
mdtask move <ID> <file>      # move task to another file
mdtask set <ID...> <tokens>  # add metadata to tasks
mdtask ids                   # auto-assign IDs to unidentified tasks
mdtask ids --path <file> --prefix PRJ
mdtask validate              # check task integrity
```

## How it fits together

mdtask is three layers, kept deliberately separate:

1. **The CLI (`mdtask`)** — the task *format*. It reads and edits Markdown checkbox tasks and knows nothing about methodology: a small, fast interpreter over your files.
2. **The skills** (`docs/skills/`) — the *method*. `sdd` is the spec-driven workflow; `mdtask-create` writes new tasks; `mdtask-do` takes one task end to end (pick → plan → build → document → commit).
3. **The loop** — driving a whole *scope* of tasks. That's your coding agent's job, not mdtask's: point the agent at `mdtask-do` and have it repeat until the backlog is empty. mdtask ships no loop or orchestrator.

## Stack

Node.js + TypeScript. Minimal dependencies.

## License

[PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.

## Sources of Truth

- **Task format** — `docs/skills/mdtask/SKILL.md`
- **Goals, architecture** — `docs/mdtask.md`
- **Specs** — `docs/specs/`

When changing one — check the others for consistency.

## Development Workflow

Spec-driven development. PRD is both the spec and the manual.

See [docs/skills/sdd/SKILL.md](docs/skills/sdd/SKILL.md) for the full workflow with examples.

## Project Structure

```
src/             — source code
test/            — tests (vitest)
docs/            — documentation
```

## Sync

Git only. All operations are plain text edits, no auto-commits, conflicts resolved manually.
