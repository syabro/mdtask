# mdtask — File-First Markdown Task System

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

## 3. Technology Stack

- **Node.js + TypeScript** — CLI implementation
- **ripgrep (rg)** — fast file search (`rg --files -g '*.md'`)
- **Vitest** — testing framework
- **$EDITOR** — for edit command

Minimal dependencies: rg (required), Node.js (required).

## 4. Data Model (Canonical Format)

See `docs/skills/mdtask/SKILL.md` — canonical reference for task format, metadata tokens, and parsing rules.

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
- `mdtask list !high`

### 6.3 Mutations

- `mdtask done <ID>`
  - toggles `[ ] → [x]`
- `mdtask open <ID>`
  - opens in `$EDITOR` at task line
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

- `@id:...`
- positional indexes
- hidden UUIDs

## 8. Parsing

### 8.1 Algorithm

1. Stream lines
2. Detect task header via regex
3. Collect indented block
4. Parse metadata from header line (after title)
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
