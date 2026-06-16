---
name: mdtask
description: Load this skill when user asks to list, find, filter, summarize, or check status of tasks in .md files, or how to write one. Defines the task format and what goes in a task body.
disable-model-invocation: false
---

# /mdtask - Task format and content reference

## How to use

Use `mdtask` CLI to work with tasks. `mdtask list` shows open, unblocked tasks. Use `mdtask list --blocked` when you need to include open tasks blocked by unresolved dependencies.

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
- ID: `PREFIX-NNN` where NNN is globally unique across all prefixes (e.g. `EXMPL-022`, `EXMPL-038`). Auto-assigned by `mdtask ids`; use `mdtask ids --path <file> --prefix PREFIX` when a file has no prefix source. Short numeric lookup: `mdtask view 22`.
- Title: free text; metadata is the trailing run of tokens at the end of the line, so a `#`/`!`/`@` earlier in the title stays in the title
- ` ` (space) or `\t\t` (double tab): optional separator before metadata

## Metadata Tokens

Appear at the **end** of the header line. Metadata is the trailing run of `#tag` / `!priority` / `@key:value` tokens; scanning from the right stops at the first word that isn't one of these. So `Fix #123 in parser` keeps `#123` in the title, while `Refactor parser !high #cleanup` parses `!high #cleanup` as metadata. A `\t\t` separator, when present, splits title from metadata explicitly.

| Token    | Format                 | Example            | Purpose                   |
|----------|------------------------|--------------------|---------------------------|
| Tag      | `#name`                | `#backend #v2`     | Categories / filters      |
| Priority | `!crit` `!high` `!low` | `!high`            | Sorting (no tag = medium) |
| Property | `@key:value`           | `@status:blocked`  | Extended key:value        |

Tags must start with a letter (`#[A-Za-z]…`), so an issue reference like `#123` is title text, not a tag.

### `@blocked_by` — the one built-in property

`@blocked_by:ID` is the only property mdtask treats specially:
- Open tasks with unresolved blockers are hidden from default `mdtask list` output.
- Use `mdtask list --blocked` to include blocked open tasks.
- When blocked tasks are shown, unresolved blockers are red in terminal output.
- Resolved (done) blockers are hidden from list output.
- Full blocker info stays in the file and is visible via `mdtask view`.

All other properties (`@status`, `@iter`, …) are per-project conventions with no built-in behavior.

## Task Body

The body captures information that future implementers, reviewers, or maintainers would still need after implementation begins. For lightweight personal TODOs, a short title or one-line body is enough. For agent handoff or spec work, include the parts that affect the result:

- Context — the problem, bug, request, or opportunity behind the task.
- Outcome — what becomes true once it's done.
- Constraints — decisions and rules that must hold, including APIs or contracts that must remain compatible, product decisions that have already been made, accepted architectural choices, and performance, security, reliability, or UX requirements.
- Acceptance Criteria — observable conditions that determine whether the task is complete.

Leave out invented implementation steps unless the approach is already an accepted constraint. Avoid step-by-step plans (create class X, add method Y, refactor Z, split A into B), personal implementation preferences, temporary debugging notes, and speculation about solutions that have not been decided.

A detail belongs in the task if a future implementer would make a different decision without it.

The goal is not to avoid implementation details. The goal is to preserve decisions and requirements while leaving implementation choices open unless those choices have already been made.

- All lines indented by ≥1 space after header
- Empty lines within the body are allowed
- The body ends at the first non-indented non-empty line

## File Organization

- Tasks live in `*.md` files anywhere in the project
- Files are scanned recursively (including hidden dirs)
- Tasks can be grouped under markdown headings for organization
- No indexes, no database — files are the source of truth

## .mdtaskrc

`.mdtaskrc` is a JSON file. `mdtask` looks for it from the current directory upward.
Add it when you need to set the default task directory, filter scanned files, or hide example prefixes.

```json
{
  "path": "docs/specs",
  "files": {
    "include": ["**/*.md"],
    "exclude": ["archive/**"]
  },
  "excludePrefixes": ["EXMPL", "KTL"]
}
```

- `path`: base directory for task files
- `files.include`: glob patterns to scan, relative to `path`
- `files.exclude`: glob patterns to skip, relative to `path`
- `excludePrefixes`: ID prefixes hidden from all commands

If `path` is `docs/specs`, use `files.include: ["**/*.md"]`, not `["docs/specs/**"]`.

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

## Advanced Parsing Reference

Use the CLI for task work. These hints are for compatible tooling or tests, not for agents to reimplement task discovery when an `mdtask` command exists.

- Header regex: `^- \[[ x]\] [A-Z]+-\d+ `
- Metadata from header: peel the trailing run of `#tag`/`!priority`/`@key:value` tokens from the right (or split at `\t\t`)
- Body: collect indented lines after header until dedent
