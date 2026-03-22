# Task — mdtask

Parsing a single task from a markdown text block.

## How it works

The parser recognizes task headers in format `- [ ] ID-123 Title` and extracts:
- Status: open `[ ]` or done `[x]`
- ID: uppercase letters, hyphen, digits (e.g., `TSK-123`)
- Title: text before metadata
- Metadata: optional tags (`#tag`), priority (`!high`), or properties (`@key:value`)

Metadata can be separated by double tab (`\t\t`) or space before first `#`, `!`, or `@`. The parser returns null for non-task lines.

## Metadata format

After the task title, metadata tokens provide additional categorization:

- **Tags** (`#tag`): Categories like `#feature`, `#bug`, `#v2`. Tags can contain letters and digits.
- **Priority** (`!crit`, `!high`, `!low`): Task urgency. Tasks without priority are considered medium.
- **Properties** (`@key:value`): Key-value pairs for structured data like `@status:blocked` or `@blocked_by:TSK-001`. The same key can appear multiple times to store multiple values.

Example: `- [ ] TSK-123 Fix login		#bug !high @status:blocked @blocked_by:TSK-001`

## Tasks

- [x] TSK-001 Implement regex for task header recognition		@iter:mvp
  Regex: `^- \[[ x]\] [A-Z]+-\d+ `
  Must correctly match:
  - `- [ ] TSK-123 Title`
  - `- [x] ABC-1 Done task`
  Metadata tokens on header line after title (optional `\t\t` separator).

  Tests:
  - valid IDs of different formats
  - checkbox [ ] and [x]
  - edge cases (spaces, special characters)
  - empty file
  - malformed headers (broken syntax, incomplete)
  - special characters in task title
  - header with metadata on same line
  - header with `\t\t` separator before metadata

  **Implementation:**
  - Function `parseTaskHeader(line: string): TaskHeader | null` in `src/task.ts`
  - Returns `null` for non-task lines
  - Extracts: status ('open'|'done'), ID, title, rawMetadata
  - Supports metadata detection via whitespace or `\t\t` separator
  - Rejects empty titles (metadata immediately after ID)
  - Property keys allow hyphens: `@build-status:value`

- [ ] TSK-002 Implement task body collection (indented block)		@iter:mvp @blocked_by:TSK-001
  Collect all lines with ≥1 space indent after header.
  Empty lines within block are allowed.
  Block ends at first non-indented non-empty line.

  Tests:
  - multiline body
  - empty lines inside
  - correct block termination

- [x] TSK-003 Parse metadata from header line		@iter:mvp @blocked_by:TSK-001
  Metadata = tokens on header line after title.
  First `#`, `!`, or `@` token marks start of metadata.
  Extract:
  - tags: `#tag` (including with digits: #v2, #123)
  - priority: `!crit`, `!high`, `!low` (no tag = medium)
  - property: `@key:value` (e.g. `@status:blocked`)

  Tests:
  - all token types
  - multiple tokens in one line
  - tags with digits #v2, #123
  - metadata with `\t\t` separator
  - metadata without separator

  **Implemented:**
  - `parseMetadata(rawMetadata: string)` function extracts structured metadata from raw string
  - Tags stored as array: `['#feature', '#v2']`
  - Priority parsed as `'crit' | 'high' | 'low' | null` (null = medium)
  - Properties stored as `Record<string, string[]>` supporting multiple values per key
  - Duplicate property keys accumulate values in array (e.g., `@blocked_by:TSK-001 @blocked_by:FLS-001`)
  - First priority wins when multiple specified
  - Protected against prototype pollution with `Object.create(null)` and `Object.hasOwn()`

- [ ] TSK-004 Auto-complete parent task
  When all subtasks are `[x]`, automatically mark parent as done.
  Requires parsing subtasks in description block.

- [ ] TSK-005 Unknown priority tags
  Unknown `!` tags (not crit/high/low) — warning or ignore?
  Solution: parse any `!\w+`, validate in `mdtask validate` command.
