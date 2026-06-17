---
name: mdtask
description: You MUST load this skill for ANY interaction with tasks in .md files — read, write, create, edit, rewrite, list, find, filter, summarize, or check status. Defines the task format and what goes in a task body.
disable-model-invocation: false
---

# /mdtask - Task format and content reference

## How to use

Use the CLI for task work. In this repo, run `pnpm mdtask <command>`; with a global install, run `mdtask <command>`.

Key commands:
- `list` — open, unblocked tasks
- `list --blocked` — include open tasks with unresolved blockers
- `list --all` — include done tasks
- `list --tag backend` / `list --priority high` — filter without shell quoting
- `view <ID>` — print the full task block; `view 22` works because numeric IDs are globally unique
- `open <ID>` — open the task in `$EDITOR`
- `move <ID> <file>` — move a task
- `archive [...ids]` — move done tasks to the archive
- `set <ID...> <tokens...>` — add metadata
- `ids` — assign missing IDs
- `validate` — check task integrity

Full command list: `pnpm mdtask --help` or `mdtask --help`.

## Task Structure

Every task is a markdown checkbox item. It normally has an ID and may have metadata on the header line; a new task may omit the ID until `mdtask ids` fills it in:

```md
- [ ] EXMPL-123 Short task title		#tag1 #tag2 !high @status:blocked
  Description body goes here.
  Can be multi-line.
```

## Header Line

```md
- [ ] EXMPL-123 Title #tag
- [x] EXMPL-123 Title		#tag
- [ ] Title without an ID yet
```

- Checkbox: `[ ]` (open) or `[x]` (done)
- ID: `PREFIX-NNN` where NNN is globally unique across all prefixes (e.g. `EXMPL-022`, `EXMPL-038`). New tasks may omit it until `mdtask ids` assigns one; use `mdtask ids --path <file> --prefix PREFIX` when a file has no prefix source.
- Title: free text
- Metadata separator: a space or explicit double tab (`\t\t`)

## Metadata Tokens

Appear at the **end** of the header line. If a `\t\t` separator is present, it splits title from metadata explicitly. Otherwise metadata is the trailing run of `#tag` / `!priority` / `@key:value` tokens; scanning from the right stops at the first word that isn't one of these. So `Fix #123 in parser` keeps `#123` in the title, while `Refactor parser !high #cleanup` parses `!high #cleanup` as metadata.

| Token | Format | Example | Purpose |
|---|---|---|---|
| Tag | `#name` | `#backend #v2` | Categories / filters |
| Priority | `!crit` `!high` `!low` | `!high` | Sorting (no priority = medium) |
| Property | `@key:value` | `@status:in-progress` | Extended key:value |

Tags start with a letter and may contain letters, digits, hyphens, and underscores, so an issue reference like `#123` is title text, not a tag.

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

- All lines indented by ≥1 space after header
- Empty lines within the body are allowed
- Nested content is allowed; the parser strips the common leading indent and preserves relative indentation
- The body ends at the first non-indented non-empty line

## File Organization

- Tasks live in `*.md` files anywhere in the project
- Files are scanned recursively, including hidden dirs except `.git/`
- `node_modules/` is also excluded by default
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

If `path` is `docs/specs`, use `files.include: ["**/*.md"]`, not `["docs/specs/**"]`; patterns are relative to `path`, not the project root.

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

## Parser reference (contributors)

Use the CLI for task work. These hints are for compatible tooling or tests, not for agents to reimplement task discovery when an `mdtask` command exists.

- Identified header regex: `^- \[[ x]\] [A-Z]+-\d+ `
- Metadata from header: split at `\t\t` if present; otherwise peel the trailing run of `#tag`/`!priority`/`@key:value` tokens from the right
- Body: collect indented lines after header until dedent
