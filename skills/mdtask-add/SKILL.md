---
name: mdtask-add
description: ALWAYS invoke this skill when user asks to add, create, or track a task — including indirect requests like "make a task for X", "add a task for this", "we need a task to...". Never add tasks manually by editing spec files. Handles full workflow — collect requirements, pick or create the spec, propose text, get approval, save, assign ID, commit.
disable-model-invocation: false
---

# /mdtask-add — Add task workflow

## When to use

User says "add a task", "create a task", "new task", "I need a task for...", or describes a feature/bug/idea to track. Handles one task or a batch of tasks in a new spec.

## Flow

Add the steps below as todo items, then work through them.

### Step 1 — Listen

If the user has not described the task yet, ask them to describe the idea, problem, or feature. If they already gave enough context, continue.

### Step 2 — Clarify

If anything is unclear, ask before proposing — where it belongs (CLI vs task vs a new area), the expected result, dependencies on other tasks, priority, bug vs feature. Don't proceed on assumptions.

### Step 3 — Choose the spec

Decide whether the task(s) fit an existing spec or need a new one.

- Fits an existing spec in the project → use it.
- New feature, subsystem, or cross-cutting concern that doesn't fit → propose a new spec in the project's configured spec directory (`.mdtaskrc` `path`, or wherever existing specs live) and an ID prefix `<NAME>` (uppercase, short). Confirm both with the user.
- Before creating a new spec, check the file doesn't already exist and the prefix isn't already in use — unless reusing it is intended.

If unsure, ask: **"Does this fit an existing spec or do we need a new one?"**

### Step 4 — Propose

Write the task(s) **without IDs** — `mdtask ids` assigns them after saving. Add metadata (`#tag`, `!priority`, `@blocked_by`) only when relevant; don't invent it.

Header forms:

```
- [ ] Short title            # no ID — mdtask ids derives the prefix from the file or --prefix
- [ ] EXMPL- Short title     # seed prefix — for a new file with no existing tasks
- [ ] EXMPL-025 Short title  # full ID — only if you have a reason to set it by hand
```

Default: write without an ID. Seed prefix only for a brand-new spec file.

Show what you'll save, then ask in the user's language: **"Save?"** For a batch, list every task under the one file.

```
--- PROPOSED ---
File: docs/specs/cli.md
- [ ] Short title
  <body per mdtask skill>
--- END ---
```

Wait for an explicit yes before Step 5. The user can cancel at any time — just stop without saving.

### Step 5 — Save and assign IDs (only after a yes)

**Existing spec:**
1. Append the task(s) after the existing tasks.
2. `mdtask ids --path <file>` (add `--prefix <PREFIX>` if the file has no prefix source).
3. Show the assigned ID(s) and where they landed.
4. If the project commits task changes, ask whether to commit.

**New spec:**
1. Create the file with a project-appropriate heading, then a `# Tasks` section.
2. Append the task(s) after `# Tasks`.
3. `mdtask ids --path <file> --prefix <PREFIX>`.
4. Show the file path and assigned ID(s).
5. If the project commits task changes, ask whether to commit.

If the user wants changes, edit the proposal, show it again, and repeat until they approve.

One feature can become several tasks in one new spec — propose them together. For unrelated features, handle them as separate proposals.

## How to write a task

MUST load the `mdtask` skill for task format. It is the single source. Follow it; don't restate it here.

## Metadata guidance

- **Tags** (`#tag`): categories like `#cli`, `#parser`, `#v2`.
- **Priority** (`!crit`, `!high`, `!low`): use sparingly. No tag = medium.
- **Properties**: `@blocked_by:XXX-NNN` (dependency), `@status:in-progress` (work started), `@iter:mvp` (iteration).

## Example — batch into a new spec

```
User: create tasks
Agent: Go ahead, I'm listening.

User: I want to export tasks to JSON and CSV, and import them back.

Agent: This is a separate export/import feature — doesn't fit the existing specs.
Proposing a new spec: docs/specs/export.md, prefix EXP. Checked: no such file, EXP unused. OK?

User: yes

Agent: --- PROPOSED ---
File: docs/specs/export.md (NEW)
- [ ] EXP- Export tasks to JSON
  Export all tasks to JSON via `mdtask export json`.
- [ ] EXP- Export tasks to CSV
  Export all tasks to CSV via `mdtask export csv`.
- [ ] EXP- Import tasks from JSON
  Re-create tasks from a JSON export.
--- END ---
Save?

User: yes

Agent: Creating docs/specs/export.md, running `mdtask ids --path docs/specs/export.md --prefix EXP`.
Assigned: EXP-050, EXP-051, EXP-052. Commit? (if the project commits task changes)
```
