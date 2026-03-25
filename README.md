# mdtask

CLI task manager where Markdown is the single source of truth. No database, no server, no GUI.

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
- [ ] EXMPL-123 Short task title		#feature !high @status:doing
  Description body goes here.
  Can be multi-line.

  - [ ] subtask
  - [x] completed subtask
```

- **ID**: header in format `[A-Z]+-\d+`, globally unique
- **Metadata** (after title):
  - `#tag` — tags
  - `!crit` / `!high` / `!low` — priority (no tag = medium)
  - `@key:value` — properties
- **Body**: indented lines after header

## Commands

```bash
mdtask list                  # list open tasks
mdtask list --all            # all tasks including done
mdtask view <ID>             # print full task block by ID
mdtask done <ID>             # toggle task [ ] ↔ [x]
mdtask open <ID>             # open task in $EDITOR at line
mdtask move <ID> <file>      # move task to another file
mdtask validate              # check task integrity
```

## Stack

Node.js + TypeScript + ripgrep. Minimal dependencies.

## Sources of Truth

- **Task format** — `docs/skills/mdtask/SKILL.md`
- **Goals, architecture** — `docs/mdtask.md`
- **PRDs** — `docs/prd/`

When changing one — check the others for consistency.

## Development Workflow

Spec-driven development. PRD is both the spec and the manual.

See [docs/spec-driven-development.md](docs/spec-driven-development.md) for the full workflow with examples.

## Project Structure

```
src/             — source code
test/            — tests (vitest)
docs/            — documentation
```

## Sync

Git only. All operations are plain text edits, no auto-commits, conflicts resolved manually.
