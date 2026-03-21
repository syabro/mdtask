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
mdtask view TSK-123          # print full task block
mdtask done TSK-123          # toggle [ ] ↔ [x]
mdtask open TSK-123          # open in $EDITOR at task line
mdtask move TSK-123 file.md  # move task to another file
mdtask validate              # check integrity (ID uniqueness, format)
```

## Stack

Node.js + TypeScript + ripgrep. Minimal dependencies.

## Sources of Truth

- **Task format** — `docs/skills/mdtask/SKILL.md`
- **Goals, architecture** — `docs/mdtask.md`
- **CLI tasks** — `docs/cli.md`

When changing one — check the others for consistency.

## Project Structure

```
src/             — source code
test/            — tests (vitest)
docs/mdtask.md   — goals, architecture
docs/cli.md      — CLI tasks
docs/mvp.md      — parser + infrastructure tasks
```

## Sync

Git only. All operations are plain text edits, no auto-commits, conflicts resolved manually.
