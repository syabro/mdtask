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
- **ripgrep (rg)** — fast file search (`rg --files -g '*.md' --hidden`)
- **Vitest** — testing framework
- **$EDITOR** — for edit command

Minimal dependencies: rg (required), Node.js (required).

## 4. Data Model (Canonical Format)

See `docs/skills/mdtask/SKILL.md` — canonical reference for task format, metadata tokens, and parsing rules.

## 5. File Organization

CLI always scans ALL `*.md` files recursively from current directory (including hidden directories). Excludes `node_modules` and `.git` by default.

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

- `mdtask list` — flat list of open tasks
- `mdtask list --all` — include done tasks
- `mdtask view <ID>` — print full task block (header + dedented body)

Tasks display `@blocked_by:ID` dependencies. Only unresolved blockers are shown; done blockers are hidden. Non-existent blockers are treated as open. Open blockers are shown in red when output is a terminal.

### 6.2 Modify

- `mdtask done <ID>` — toggle `[ ] ↔ [x]` in-place. Duplicate IDs cause an error.
- `mdtask move <ID> <file>` — move task block to another file. Creates target if needed.

### 6.3 Validate

- `mdtask validate` — check task integrity: duplicate IDs (error), empty tags and malformed metadata (warnings). Exit 1 on errors, 0 otherwise.

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

- tasks can be listed; filtering planned for future releases
- any file can be edited manually without breaking format
- `rg` can extract full task blocks via regex
- diffs are human-readable

## 12. Core Principle

Markdown is not presentation — it is a structured table where:
- line = record
- indent = block boundary
- inline tokens = columns

CLI is only an interpreter, never the owner of data.
