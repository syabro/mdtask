# mdtask

CLI task manager where Markdown is the single source of truth. No database, no server, no GUI.

## Language

English is the project language — docs, commit messages, code comments, and communication.

## Principle

Markdown is not presentation — it is a structured table:
- line = record
- indent = block boundary
- inline tokens = columns (tags, priority, properties)

CLI is only an interpreter, never the owner of data.

## Task Format

```markdown
- [ ] TSK-123 Short task title		#feature !high @status:doing
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
mdtask list --sort=priority  # sort by priority
mdtask list #feature         # filter by tag
mdtask list !high            # filter by priority
```

## Stack

Node.js + TypeScript + ripgrep. Minimal dependencies.

## Sources of Truth

- **Task format** — `docs/skills/mdtask/SKILL.md`
- **Goals, architecture** — `docs/mdtask.md`
- **PRDs** — `docs/prd/`

When changing one — check the others for consistency.

## PRDs

PRDs (`docs/prd/`) are living documentation. When closing a task:
1. Mark the task as done: `[ ]` → `[x]`
2. Write a PRD section: what the feature does, what the user can do, how it works

PRDs describe how the system works — not why it was built.

## Development Workflow

**Spec-Driven Development:** No code without a task.

Before implementing any feature:
1. Create task in appropriate PRD (`docs/prd/*.md`)
2. Commit the task
3. Only then start implementation

Use `/create-task` skill to create tasks properly.

## Project Structure

```
src/             — source code
test/            — tests (vitest)
docs/            — documentation
```

## Sync

Git only. All operations are plain text edits, no auto-commits, conflicts resolved manually.
