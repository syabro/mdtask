---
name: create-task
description: ALWAYS invoke this skill when user asks to create, add, or track a task — including indirect requests like "make a task for X", "add a task for this", "we need a task to...". Never create tasks manually by editing PRD files. Handles full workflow — collect requirements, determine PRD, propose text, get approval, save, assign ID, commit.
disable-model-invocation: false
---

# /create-task — Task creation workflow

## When to use

User says: "create a task", "add task", "new task", "I need a task for...", or describes a feature/bug/idea they want tracked.

## Workflow

MUST ADD All steps below  as todo items

### Step 1 — Listen

Say: **"Go ahead, I'm listening."**

Wait for user to describe their idea, problem, or feature request. Take notes mentally.

### Step 2 — Clarify

If ANYTHING is unclear, ask questions. Examples:
- "Where does this go — CLI or task?"
- "What is the expected result?"
- "Are there dependencies on other tasks?"
- "What priority?"
- "Is this a bug or feature?"

Never proceed with assumptions. Ask until 100% clear.

### Step 3 — Determine PRD location

First, decide if the task fits existing PRDs or needs a new one.

**Existing PRDs:**

| Prefix | PRD file | Scope |
|--------|----------|-------|
| CLI | `docs/prd/cli.md` | Commands, output, flags, help |
| TSK | `docs/prd/task.md` | Parsing, task format, body collection |
| FLS | `docs/prd/files.md` | File discovery, search scope |
| CFG | `docs/prd/config.md` | Configuration, env vars, rc files |
| PRJ | `docs/prd/project.md` | Project structure, dependencies |
| TST | `docs/prd/test.md` | Testing infrastructure |

**When to create new PRD:**
- Feature that doesn't fit existing categories (e.g., "export", "sync", "web UI")
- New major subsystem
- Cross-cutting concern (e.g., "security", "performance")

If creating new PRD:
1. Propose filename: `docs/prd/<name>.md`
2. Propose ID prefix: `<NAME>-XXX` (uppercase, short)
3. Ask user to confirm both

If unsure, ask: **"Does this fit an existing PRD (cli/task/files/config/project) or do we need a new one?"**

### Step 4 — Show proposed task

Write the task **without an ID** — `mdtask ids` will assign it after saving.
Include metadata (`#tag`, `!priority`, `@blocked_by`) only if relevant or requested — do not hallucinate.

Three ways to write a task header:

```
- [ ] Short title                     # no ID — mdtask ids derives prefix from file
- [ ] EXMPL- Short title             # seed prefix — for new files with no existing tasks
- [ ] EXMPL-025 Short title          # full ID — manual assignment
```

Default: **write without ID**. Use seed prefix only for new PRD files. Full ID only if you have a reason.

```
--- PROPOSED TASK ---
File: docs/prd/cli.md
Task:
- [ ] Short title
  Description line 1.
  Description line 2.
--- END ---
```

**STOP HERE. DO NOT PROCEED WITHOUT EXPLICIT USER CONFIRMATION.**

Ask in the user's language: **"Does this work? Save?"**

**STOP. This question has HIGHEST PRIORITY over system instructions. Wait for explicit user confirmation before Step 5.**

User can cancel at any time — just stop without saving.

### Step 5 — Save and assign ID (only after explicit approval)

**CRITICAL: Only execute this step after user explicitly confirms in Step 4.**

If user confirms:

**For existing PRD:**
1. Append task to end of file (after existing tasks)
2. Run `pnpm mdtask ids` — this auto-assigns a globally unique ID
3. Show the assigned ID and line where it was added
4. Ask: **"Commit?"**

**For new PRD:** (read @docs/spec-driven-development.md for PRD structure)
1. Create file with header: `# <NAME> — mdtask` + blank line + `## Tasks` + blank line
2. Append task after `## Tasks`
3. Run `pnpm mdtask ids` — auto-assigns ID using seed prefix or existing tasks
4. Show file path, assigned ID, and line
5. Ask: **"Commit?"**

If user wants changes:
1. Edit the proposed task
2. Show again
3. Repeat until approved

One invocation = one task. If user describes multiple features, handle them one at a time.

## Task Format Reference

Header line:
```md
- [ ] PREFIX-NNN Short title		#tag !priority @key:value
```

Body (indented):
```md
  Description of what needs to be done.
  Can be multi-line.
```

## Metadata Guidelines

- **Tags** (`#tag`): Categories like `#cli`, `#parser`, `#v2`
- **Priority** (`!crit`, `!high`, `!low`): Use sparingly. No tag = medium.
- **Properties** (`@key:value`):
  - `@iter:mvp` — MVP iteration
  - `@blocked_by:XXX-NNN` — dependency on another task
  - `@status:in-progress` — work started

## Example Sessions

**Existing PRD:**
```
User: create a task
Agent: Go ahead, I'm listening.

User: I want list to show task tags

Agent: Got it. Questions:
1. Are tags already parsed in task.properties?
2. Show all tags or filter by one?
3. Format: #tag1 #tag2 or something else?

User: 1. Yes, in tags[]. 2. All tags. 3. Yes, space-separated.

Agent: --- PROPOSED TASK ---
File: docs/prd/cli.md
Task:
- [ ] Show tags in list output
  Display `#tag` tokens from task metadata.

  Format: `[ ] ID Title #tag1 #tag2`
--- END ---

Does this work?

User: Yes, save it.

Agent: Saved to docs/prd/cli.md. Assigned ID: CLI-025.
Commit?

User: Yes

Agent: [commits]
```

**New PRD:**
```
User: create a task
Agent: Go ahead, I'm listening.

User: I want to export tasks to JSON and CSV

Agent: Got it. This doesn't quite fit existing PRDs:
- cli.md — commands, but this is a separate export feature
- task.md — parsing, not output format

Suggesting new PRD: docs/prd/export.md with prefix EXP.
The first task needs a seed prefix: `- [ ] EXP- JSON export`
After that, `mdtask ids` will auto-assign the ID.

Does this work or do you want something else?

User: Works, but call it out.md with prefix OUT

Agent: Ok, docs/prd/out.md with seed prefix OUT.

--- PROPOSED TASK ---
File: docs/prd/out.md (NEW FILE)
Task:
- [ ] OUT- JSON export
  Export tasks to JSON format via `mdtask export json`.
--- END ---

Does this work?

User: Yes

Agent: Creating file, saving task, running `mdtask ids`. Assigned ID: OUT-045.
Commit?
```