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
  Short reason this task matters.

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

## Task body

A task is a handoff. The title names the work. The body gives an implementer enough context to start without rereading the chat.

Write the body in this order:

1. **Value summary** — a short, unlabeled first line shown under the title in `mdtask list`. It tells the reader what the finished task changes: what becomes possible, trustworthy, clear, safe, reliable, easier, or consistent.

   Start from the task body and `DoD`, then ask what concrete artifact, command, workflow, user action, or project state changes for the better. If the task names a concrete file, command, error, workflow, or scenario, reuse those terms to anchor the outcome. The summary must name both the concrete artifact or situation and the effect it creates — not the artifact, mechanism, or workflow step alone. Phrase the effect as a positive result when possible. Put a blank line after it before any longer description.
2. **Prose** — what is happening now and what should happen instead. Split by meaning into short paragraphs. Add constraints, examples, or edge cases only when they change the implementation or verification.
3. **`User decision: ...`**

   `User decision:` records user-stated choices or constraints that must survive later rewrites of the task body.

   Include every explicit user decision that is not merely the task's main requested change.

   Skip `User decision:` only when the user statement is just the task request itself and there is no separate choice or constraint to preserve.

   Non-user decisions and inferred implementation consequences go in the prose or `DoD`.
4. **`DoD: ...`** — the observable state or result that means the task is done. Use one sentence for a single condition; use bullets when several conditions must all hold.

`mdtask list` shows this first line on its own indented line below the task title. Long values are truncated to 120 characters with an ellipsis.

When a task needs no extra context, it can go straight from the value summary to `DoD`, with the same blank line between them.

Existing open tasks created before this rule can be migrated when touched or in a dedicated cleanup pass: add the value summary as the first body line, insert a blank line after it, keep existing context below it, and leave `User decision` and `DoD` in the same order.

Write in ELI18 style: clear enough for a tired programmer to understand on the first read. Remove vague, clever, and bureaucratic wording.

Before saving a value summary, check it on five points:
- **Outcome** — says what becomes possible, trustworthy, clear, safe, reliable, easier, or more consistent after completion.
- **Concrete subject** — starts from the artifact, command, workflow, user action, or project state when that carries the meaning.
- **Positive result** — names what the completed task gives. Prefer affirmative phrasing; if the main value says “no”, “not”, “cannot”, “stop”, “without”, or “miss”, rewrite it as what becomes available, present, reliable, or consistent.
- **Rooted** — uses the task body and `DoD` as the source.
- **Specific** — tied to this exact artifact, workflow, error, or scenario.

Weak summaries only restate the title, `DoD`, implementation, artifact, mechanism, or workflow step. If a draft mostly says “this file exists”, “this review has findings”, “this check runs”, “this workflow publishes”, or “this name appears”, rewrite it one step further into the capability, confidence, clarity, safety, reliability, consistency, discoverability, or time saved that the finished task creates.

For review or audit tasks, the value is not that findings exist or that items are classified, mapped, or catalogued. Name the decision, cleanup, risk reduction, or follow-up action those findings make possible. For rename and naming tasks, the value is not that the new name appears. Name the discoverability, mental model, or user action the name makes clearer.

Avoid role-label openings when the artifact or workflow can carry the meaning. Repeated openings like `users`, `contributors`, `maintainers`, or `agents` create noise in `mdtask list`. Name a role only when it changes the meaning.

Value summary examples:

Bad: `Tag pushes publish mdtask to npm through trusted publishing, with manual fallback kept.`
Why bad: it describes the publishing mechanism, not what that mechanism gives the project.

Good: `Version tags create npm releases through the repository's trusted publishing workflow.`
Why good: it starts from the concrete workflow and names the practical gain.

Bad: `Review fixes get checked before the task closes.`
Why bad: it describes the workflow step.

Good: `Final review coverage includes follow-up fixes, so the reviewed diff matches what ships.`
Why good: it names the concrete confidence gained.

Bad: `Task workflow becomes clearer.`
Why bad: it is a generic slogan.

Bad: `The audit has findings for over-fit and over-engineered rules.`
Why bad: it describes the review artifact, not what the findings enable.

Good: `Over-fit workflow rules are separated from rules that generalize to ordinary projects.`
Why good: it names the decision the review makes possible.

Bad: `The new skill name appears in docs and install paths.`
Why bad: it describes the rename result, not the value of the name.

Good: `The skill name matches the action people look for when adding a backlog item.`
Why good: it names the discoverability gained.

Bad: `Maintainers can archive a completed story group with its heading, so the live spec stays clean without losing context.`
Why bad: it starts with a role label even though the archive workflow carries the meaning.

Good: `Archived story groups keep their heading and context while the live spec stays focused on active work.`
Why good: it starts from the concrete artifact and names the value without a repeated role label.

Good: `A task created by one skill has the same required fields and handoff rules when another skill executes or reviews it.`
Why good: it names the concrete consistency gained.

Use backticks where Markdown expects backticks.

Keep tasks compact. A detail belongs only if an implementer would decide differently without it. Implementation steps belong in the task only when the approach is already decided and must be preserved.

The goal is not to avoid implementation details. The goal is to preserve decisions and requirements while leaving implementation choices open unless those choices have already been made.

Avoid step-by-step plans (create class X, add method Y, refactor Z, split A into B), personal implementation preferences, temporary debugging notes, and speculation about solutions that have not been decided.

**Examples:**

Value summary + DoD is enough for straightforward work:
```md
- [ ] EXMPL-100 Fix `parseHeader` on BOM input
  BOM-prefixed files parse like regular task files.

  DoD: files with a BOM marker parse the same as regular input.
```

Prose with one user decision and a multi-condition DoD:
```md
- [ ] EXMPL-101 Archive completed story groups
  Archived story groups preserve the heading and context needed to understand past work.

  `mdtask archive` currently moves completed tasks one by one into a flat `_archive.md`. Closed story groups lose their heading and surrounding context. Groups should be archived as whole units instead.

  User decision: archive whole story groups, not individual done tasks.

  DoD: archiving a completed story group moves the heading, tasks, and task bodies together into the archive, removes the group from the live spec, and preserves the grouped structure.
```

Prose with multiple user decisions and a bullet DoD:
```md
- [ ] EXMPL-102 Add read-only `git diff` access for review agents
  Code reviews use the actual working-tree diff from the task workspace.

  Read-only inner agents can inspect files, but they cannot inspect the working-tree diff unless it is pasted into the prompt. A code review can silently review the current snapshot instead of the actual change.

  Add a read-only tool that returns `git diff HEAD` for the agent's current working directory. It exposes only the diff operation and truncates large output like other read tools.

  User decisions:
  - implement as a custom SDK tool through `customTools`
  - include in the read-only default tool set, not behind `--unsafe`
  - expose only `git diff [ref]`, defaulting to `HEAD`
  - run git directly by argv, not through a shell

  DoD:
  - a read-only inner agent can fetch `git diff HEAD` for its current working directory
  - fusion code review no longer depends on the diff being pasted into the prompt
  - the tool does not expose arbitrary shell or git subcommands
```

**Body syntax:**

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

## Parser reference (contributors)

Use the CLI for task work. These hints are for compatible tooling or tests, not for agents to reimplement task discovery when an `mdtask` command exists.

- Identified header regex: `^- \[[ x]\] [A-Z]+-\d+ `
- Metadata from header: split at `\t\t` if present; otherwise peel the trailing run of `#tag`/`!priority`/`@key:value` tokens from the right
- Body: collect indented lines after header until dedent
