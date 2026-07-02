# Commit message guidelines

## Format

```text
TYPE: TASK-ID Description
```

Use `TYPE: Description` only when the commit does not close a task. If the commit closes an mdtask task, `TASK-ID` is required.

The description must complete this sentence:

> If applied, this commit will `<description>`

Use imperative mood and name the result, not the code shape. Prefer concrete verbs like `Add`, `Fix`, `Document`, `Rename`, or `Move`.

Keep the subject short and specific. Mention the main change only. Omit tests unless tests are the goal of the commit.

Avoid vague verbs like `Update`, `Improve`, `Adjust`, and `Handle`. Avoid negative phrasing like `Stop`, `Prevent`, `Avoid`, and `Do not`.

## Types

- `FEAT` — feature added or removed
- `FIX` — bug fix
- `CRITICAL` — critical fix
- `HACKFIX` — temporary workaround until a real fix is available
- `CODE` — internal code feature or behavior change invisible to users, not a pure refactor
- `PERF` — performance change
- `SECURITY` — security change
- `DOCS` — documentation change
- `STYLE` — formatting-only change
- `REFACTOR` — refactor without behavior change
- `TEST` — test changes
- `CHORE` — small maintenance change
- `TEXT` — user-facing text change

## Examples

```text
DOCS: EXMPL-123 Document commit message format
FEAT: EXMPL-124 Add JSON export command
FIX: EXMPL-125 Parse blocked tasks consistently
DOCS: Document architecture layers
```
