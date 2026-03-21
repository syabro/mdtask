---
name: mdtask
description: Reference for mdtask markdown task format — use when creating, editing, or parsing tasks in .md files
disable-model-invocation: false
---

# /mdtask-format - Task format reference

## Task Structure

Every task is a markdown checkbox item with ID and optional metadata on the header line:

```md
- [ ] TSK-123 Short task title		#tag1 #tag2 !p1 @status(blocked)
  Description body goes here.
  Can be multi-line.
  - [ ] subtask one
  - [x] subtask two
```

## Header Line

```
- [<space or x>] <ID> <Title> [<\t\t> <metadata>]
```

- Checkbox: `[ ]` (open) or `[x]` (done)
- ID: `[A-Z]+-\d+` — mandatory, globally unique (e.g. `TSK-123`, `MVP-001`)
- Title: free text until first metadata token or end of line
- `\t\t` (double tab): optional visual separator before metadata

## Metadata Tokens

Appear on the header line. First `#`, `!`, or `@` marks the start of metadata.

| Token | Format | Example | Purpose |
|-------|--------|---------|---------|
| Tag | `#name` | `#backend #v2` | Categories / filters |
| Priority | `!p1`..`!p5` | `!p1` | Sorting (1 = highest) |
| Status | `@status(val)` | `@status(blocked)` | Extended state |

## Task Body

- All lines indented by ≥1 space after header
- Empty lines within body are allowed
- Block ends at first non-indented non-empty line
- Subtasks are indented checkbox items within the body

## File Organization

- Tasks live in `*.md` files anywhere in the project
- Files are scanned recursively (including hidden dirs)
- Tasks can be grouped under markdown headings for organization
- No indexes, no database — files are the source of truth

## Examples

Minimal task:
```md
- [ ] BUG-42 Fix null pointer in parser
```

Full task with metadata and body:
```md
- [ ] FEAT-7 Add export command		#cli #export !p2 @status(in-progress)
  Export tasks to JSON format.
  Should support:
  - filtering by tag
  - output to stdout or file
```

Done task:
```md
- [x] MVP-001 Implement header regex		#parser
```

## Parsing Hints

- Header regex: `^- \[[ x]\] [A-Z]+-\d+ `
- Extract all headers: `rg '^\- \[[ x]\] [A-Z]+-\d+'`
- Metadata from header: split on first `#`, `!`, or `@`
- Body: collect indented lines after header until dedent
