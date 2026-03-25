---
name: mdtask
description: Load this skill when user asks to list, find, filter, summarize, or check status of tasks in .md files. Provides task format spec.
disable-model-invocation: false
---

# /mdtask - Task format reference

## How to use

Use `mdtask` CLI to work with tasks. Example: `mdtask list`.

## Task Structure

Every task is a markdown checkbox item with ID and optional metadata on the header line:

```md
- [ ] EXMPL-123 Short task title		#tag1 #tag2 !high @status:blocked
  Description body goes here.
  Can be multi-line.
```

## Header Line

```
- [<space or x>] <ID> <Title> [<\t\t> <metadata>]
```

- Checkbox: `[ ]` (open) or `[x]` (done)
- ID: `[A-Z]+-\d+` — mandatory, globally unique (e.g. `EXMPL-123`, `CLI-001`)
- Title: free text until first metadata token or end of line
- ` ` (space) or `\t\t` (double tab): optional separator before metadata

## Metadata Tokens

Appear on the header line. First `#`, `!`, or `@` marks the start of metadata.

| Token    | Format                 | Example            | Purpose                   |
|----------|------------------------|--------------------|---------------------------|
| Tag      | `#name`                | `#backend #v2`     | Categories / filters      |
| Priority | `!crit` `!high` `!low` | `!high`            | Sorting (no tag = medium) |
| Property | `@key:value`           | `@status:blocked`  | Extended key:value        |

## Task Body

- All lines indented by ≥1 space after header
- Empty lines within body are allowed
- Block ends at first non-indented non-empty line

## File Organization

- Tasks live in `*.md` files anywhere in the project
- Files are scanned recursively (including hidden dirs)
- Tasks can be grouped under markdown headings for organization
- No indexes, no database — files are the source of truth

## Examples

Minimal task:
```md
- [ ] EXMPL-042 Fix null pointer in parser
```

Full task with metadata and body:
```md
- [ ] EXMPL-007 Add export command		#cli #export !low @status:in-progress
  Export tasks to JSON format.
  Should support:
  - filtering by tag
  - output to stdout or file
```

Done task:
```md
- [x] EXMPL-100 Implement header regex		#parser
```

## Parsing Hints

- Header regex: `^- \[[ x]\] [A-Z]+-\d+ `
- Metadata from header: split on first `#`, `!`, or `@`
- Body: collect indented lines after header until dedent