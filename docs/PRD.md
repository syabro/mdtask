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

## 3. Data Model (Canonical Format)

### 3.1 Task Structure

```md
- [ ] TSK-123 Short task title
  #backend #mcp !p1 @due(2026-02-01)
  ---
  Multi-line description.
  Links, code blocks, lists.
  - [ ] subtask
  - [ ] subtask
````

### 3.2 Rules

- Task start line: `^- \[[ x]\] [A-Z]+-\d+ `
- ID is mandatory and comes immediately after the checkbox
- Task body = all following lines indented by ≥1 space
- Empty lines are allowed inside the body
- First non-indented non-empty line ends the task block

### 3.3 Metadata (Inline Tokens)

Parsed only from the first body lines before `---`.

| Type     | Format               | Purpose                |
|----------|----------------------|------------------------|
| Tag      | `#tag`               | Categories / filters   |
| Priority | `!p1..p5`            | Sorting                |
| Due date | `@due(YYYY-MM-DD)`   | Deadlines              |
| Status   | `@status(blocked)`   | Extended state         |

## 4. File Organization

### Option A — Single File

```text
tasks.md
````

### Option B — Domain Files

```text
tasks/
  backend.md
  infra.md
  product.md
````

CLI scans recursively.

## 5. CLI — Required Commands

### 5.1 View

- `mdtask list`
  - flat list
  - sortable by priority, due date
- `mdtask view <ID>`
  - prints full task block

### 5.2 Filters

- `mdtask list #tag`
- `mdtask list !p1`
- `mdtask list @due:today|week|overdue`

### 5.3 Mutations

- `mdtask new`
  - inserts task template
- `mdtask done <ID>`
  - toggles `[ ] → [x]`
- `mdtask edit <ID>`
  - opens in `$EDITOR`
- `mdtask move <ID> <file>`

### 5.4 Subtasks

- part of description block
- optional: auto-complete parent when all subtasks are `[x]`

## 6. Task Identity

### 6.1 Source of Truth

- Only header ID: `TSK-123`
- Format: `[A-Z]+-\d+`
- Must be globally unique across all files

### 6.2 Forbidden

- `@id(...)`
- positional indexes
- hidden UUIDs

## 7. Parsing

### 7.1 Algorithm

1. Stream lines
2. Detect task header via regex
3. Collect indented block
4. Parse metadata until `---`
5. Remaining lines = description

### 7.2 Requirements

- O(n) over files
- no Markdown AST
- tolerant to malformed content

## 8. Git Compatibility

- All operations are plain text edits
- No auto-commits
- Conflicts resolved manually in Markdown

## 9. Extensions (Not MVP)

- `mdtask stats`
- `mdtask board` (TUI kanban by tags)
- `mdtask export json`
- hooks for MCP / Cursor / LLM agents

## 10. MVP Acceptance Criteria

System is valid if:

- tasks can be listed and filtered without extra indexes
- any file can be edited manually without breaking format
- `rg` can extract full task blocks via regex
- diffs are human-readable

## 11. Core Principle

Markdown is not presentation — it is a structured table where:
- line = index
- indent = record boundary
- inline tokens = columns

CLI is only an interpreter, never the owner of data.
