# Task — mdtask

Parsing a single task from a markdown text block.

## Task parsing

The parser recognizes task headers in format `- [ ] ID-123 Title` and extracts:
- Status: open `[ ]` or done `[x]`
- ID: uppercase letters, hyphen, digits (e.g., `TSK-123`)
- Title: text before metadata
- Metadata: optional tags (`#tag`), priority (`!high`), or properties (`@key:value`)

Metadata is the trailing run of `#tag` / `!priority` / `@key:value` tokens at the end of the line. Scanning from the right stops at the first word that isn't one of these, so a `#`, `!`, or `@` earlier in the line stays in the title (e.g. `Fix #123 in parser` keeps `#123` as title text). An explicit double tab (`\t\t`) overrides this and splits title from metadata at the tabs. The parser returns null for non-task lines.

Checkbox lines inside fenced code blocks (` ``` ` or `~~~`, indented 0–3 spaces) are documentation examples, never tasks — every command that scans files (`list`, `view`, `validate`, `ids`, …) skips them. So a spec can show example tasks in a code block without them leaking into the task list or getting IDs assigned by `mdtask ids`.

## Metadata format

After the task title, metadata tokens provide additional categorization:

- **Tags** (`#tag`): Categories like `#feature`, `#bug`, `#v2`. A tag must start with a letter and may contain letters, digits, hyphens, and underscores — so an issue reference like `#123` is treated as title text, not a tag.
- **Priority** (`!crit`, `!high`, `!low`): Task urgency. Tasks without priority are considered medium. Any `!\w+` token is accepted as priority; `mdtask validate` warns about values outside the known set.
- **Properties** (`@key:value`): Key-value pairs for structured data like `@status:blocked` or `@blocked_by:TSK-038`. The same key can appear multiple times to store multiple values.

Example: `- [ ] EXMPL-123 Fix login		#bug !high @status:blocked @blocked_by:EXMPL-001`

## Task body

Lines indented with ≥1 space after the header form the task body. Empty lines within the body are preserved. The body ends at the first non-indented non-empty line.

`collectTaskBody(lines, headerIndex)` returns the body as a single dedented string — the minimum common indent is stripped, preserving relative indentation of nested content (sub-lists, code blocks). Trailing empty lines are trimmed.

```markdown
- [ ] EXMPL-001 Title
  Body line 1
  Body line 2

  More body after empty line
```

→ `"Body line 1\nBody line 2\n\nMore body after empty line"`

## Task writing conventions

A task is a handoff. The title names the work. The body gives an implementer enough context to start without rereading the chat.

Write the body in this order:

1. **Prose** — what is happening now and what should happen instead. Split by meaning into short paragraphs. Add constraints, examples, or edge cases only when they change the implementation or verification.
2. **`User decision: ...`**

   `User decision:` records user-stated choices or constraints that must survive later rewrites of the task body.

   Include every explicit user decision that is not merely the task's main requested change.

   Skip `User decision:` only when the user statement is just the task request itself and there is no separate choice or constraint to preserve.

   Non-user decisions and inferred implementation consequences go in the prose or `DoD`.
3. **`DoD: ...`** — the observable state or result that means the task is done. Use one sentence for a single condition; use bullets when several conditions must all hold.

Write in ELI18 style: clear enough for a tired programmer to understand on the first read. Remove vague, clever, and bureaucratic wording.

Use backticks where Markdown expects backticks.

Keep tasks compact. A detail belongs only if an implementer would decide differently without it. Implementation steps belong in the task only when the approach is already decided and must be preserved.

```markdown
- [ ] EXMPL-100 Fix `parseHeader` on BOM input
  DoD: files with a BOM marker parse the same as regular input.

- [ ] EXMPL-101 Archive completed story groups
  `mdtask archive` currently moves completed tasks one by one into a flat `_archive.md`. Closed story groups lose their heading and surrounding context. Groups should be archived as whole units instead.

  User decision: archive whole story groups, not individual done tasks.

  DoD: archiving a completed story group moves the heading, tasks, and task bodies together into the archive, removes the group from the live spec, and preserves the grouped structure.

- [ ] EXMPL-102 Add read-only `git diff` access for review agents
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

# Tasks

