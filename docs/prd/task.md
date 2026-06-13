# Task — mdtask

Parsing a single task from a markdown text block.

## Task parsing

The parser recognizes task headers in format `- [ ] ID-123 Title` and extracts:
- Status: open `[ ]` or done `[x]`
- ID: uppercase letters, hyphen, digits (e.g., `TSK-123`)
- Title: text before metadata
- Metadata: optional tags (`#tag`), priority (`!high`), or properties (`@key:value`)

Metadata is the trailing run of `#tag` / `!priority` / `@key:value` tokens at the end of the line. Scanning from the right stops at the first word that isn't one of these, so a `#`, `!`, or `@` earlier in the line stays in the title (e.g. `Fix #123 in parser` keeps `#123` as title text). An explicit double tab (`\t\t`) overrides this and splits title from metadata at the tabs. The parser returns null for non-task lines.

Checkbox lines inside fenced code blocks (` ``` ` or `~~~`, indented 0–3 spaces) are documentation examples, never tasks — every command that scans files (`list`, `view`, `validate`, `ids`, …) skips them. So a PRD can show example tasks in a code block without them leaking into the task list or getting IDs assigned by `mdtask ids`.

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

## Tasks


