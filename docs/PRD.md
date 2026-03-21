# PRD — MDTASK (File-First Markdown Task System)

## 1. Goal

Build a task management system where:
- Markdown files are the single source of truth
- each task is a contiguous text block
- CLI operates directly on files, no database, no daemon
- Git is the only sync and history mechanism

## 2. Non-Goals

- No GUI or web UI
- No server, accounts, or background services
- No hidden indexes or binary storage
- No proprietary or opaque formats
- No Python, Node.js, or compiled languages

## 3. Technology Stack

- **Bash** — all CLI commands are shell scripts
- **ripgrep (rg)** — fast regex search across files
- **sed/awk** — text transformations
- **bats** — testing framework
- **$EDITOR** — for edit command

Zero dependencies beyond standard Unix tools + rg + bats.

## 4. Data Model (Canonical Format)

### 4.1 Task Structure

```md
- [ ] TSK-123 Short task title		#backend #mcp !p1 @status(blocked)
  Multi-line description.
  Links, code blocks, lists.
  - [ ] subtask
  - [ ] subtask
```

### 4.2 Rules

- Task start line: `^- \[[ x]\] [A-Z]+-\d+ `
- ID is mandatory and comes immediately after the checkbox
- Metadata tokens (`#tag`, `!priority`, `@status(...)`) live on the header line, after the title
- Optional: double tab (`\t\t`) before metadata for visual separation
- Task body = all following lines indented by ≥1 space
- Empty lines are allowed inside the body
- First non-indented non-empty line ends the task block

### 4.3 Metadata (Inline Tokens)

Parsed from the header line. First `#`, `!`, or `@` token marks the start of metadata.

| Type     | Format               | Purpose                |
|----------|----------------------|------------------------|
| Tag      | `#tag`               | Categories / filters   |
| Priority | `!p1..p5`            | Sorting                |
| Status   | `@status(blocked)`   | Extended state         |

## 5. File Organization

CLI always scans ALL `*.md` files recursively from current directory (including hidden directories).

```text
project/
  README.md           # scanned
  tasks.md            # scanned
  docs/
    notes.md          # scanned
  .ralph/
    plan.md           # scanned (hidden dir)
```

## 6. CLI — Required Commands

### 6.1 View

- `mdtask list`
  - flat list
  - sortable by priority
- `mdtask view <ID>`
  - prints full task block

### 6.2 Filters

- `mdtask list #tag`
- `mdtask list !p1`

### 6.3 Mutations

- `mdtask new`
  - inserts task template
- `mdtask done <ID>`
  - toggles `[ ] → [x]`
- `mdtask edit <ID>`
  - opens in `$EDITOR`
- `mdtask move <ID> <file>`

### 6.4 Subtasks

- part of description block
- optional: auto-complete parent when all subtasks are `[x]`

## 7. Task Identity

### 7.1 Source of Truth

- Only header ID: `TSK-123`
- Format: `[A-Z]+-\d+`
- Must be globally unique across all files

### 7.2 Forbidden

- `@id(...)`
- positional indexes
- hidden UUIDs

## 8. Parsing

### 8.1 Algorithm

1. Stream lines
2. Detect task header via regex
3. Collect indented block
4. Parse metadata from second line (before empty line)
5. Remaining lines = description

### 8.2 Requirements

- O(n) over files
- no Markdown AST
- tolerant to malformed content

## 9. Git Compatibility

- All operations are plain text edits
- No auto-commits
- Conflicts resolved manually in Markdown

## 10. Extensions (Not MVP)

- `mdtask stats`
- `mdtask board` (TUI kanban by tags)
- `mdtask export json`
- hooks for MCP / Cursor / LLM agents

## 11. MVP Acceptance Criteria

System is valid if:

- tasks can be listed and filtered without extra indexes
- any file can be edited manually without breaking format
- `rg` can extract full task blocks via regex
- diffs are human-readable

## 12. Core Principle

Markdown is not presentation — it is a structured table where:
- line = index
- indent = record boundary
- inline tokens = columns

CLI is only an interpreter, never the owner of data.
