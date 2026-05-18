---
name: mdtask-next
description: Work on the next task from the project — pick, plan, review, execute, review code, commit
disable-model-invocation: false
---

# /mdtask-next — Task workflow

> **CRITICAL: ALWAYS use `pnpx mdtask <command>` CLI to work with tasks. NEVER read or parse markdown task files manually.**

## Flow

Immediately create a todo checklist. In Claude environment, use the `todowrite` tool. In PI agent, emulate this with a temporary markdown checklist file under `./tmp` and keep it in memory while working.
ALL steps are mandatory unless an explicit skip rule applies (`#noqa` or fast mode). Never skip any other step, regardless of task size.
After reading this file, first say "I'll do all the steps as it described" and provide the steps you understood.
This acknowledgement is not a stopping point.
Continue immediately with Step 1 in the same turn.
If the user pasted or invoked this skill, treat it as a request to run `/mdtask-next` unless they explicitly ask only to inspect or edit the skill.
Never stop after the acknowledgement.

> **`#noqa` tag:** If the picked task has `#noqa`, skip Steps 3, 5, and 8 (no configured review-tool reviews).

> **Mode:** By default, work autonomously — pick the most logical task, approve your own plan. If user passes `--interactive` (or `--i`), ask questions at decision points: task selection, plan approval.
>
> **Fast mode:** If user passes `fast`, `--fast`, or `-f`, skip plan creation, plan validation, TDD/test-first work, and result validation. In fast mode, still pick the task with `pnpx mdtask`, make the requested change directly, update the task/PRD, and commit unless the user says not to commit.

### Step 1 — Pick a task

**ALWAYS use `pnpx mdtask` CLI — NEVER parse markdown files manually.**

1. Run `pnpx mdtask list` to get all open tasks
   - Tasks with unresolved `@blocked_by:ID` are still listed — skip them when picking
2. If user provided scope (tag, area, specific task) — filter by it. Otherwise pick the most logical next task.
3. In `--interactive` mode: present matching tasks and ask user to choose.
4. If no tasks remain: tell user, stop

### Step 2 — Plan

> Skip entirely in fast mode.

1. Read the task file to get the full task details (use Read tool)
2. Understand what needs to be built (don't invent extra scope)
3. Write a concrete implementation plan:
   - What files to create/modify
   - What functions/modules
   - How to structure code

### Step 3 — Validate plan with configured review tool

> Skip if task has `#noqa` tag.
> Skip entirely in fast mode.

1. Use the project's configured review tool from AGENTS.md or the active project instructions.
2. Send plan + task spec + relevant project files for review.
3. Ask: is the plan correct? Any missing pieces? Better approach?
4. Combine feedback into a refined plan.
5. In `--interactive` mode: present the refined plan to user for approval. Otherwise proceed.

### Step 4 — Execute with risk-based validation

Fast mode:
1. Implement the change directly.
2. Do not write failing tests first.
3. Do not run result validation unless the user explicitly asks for it.

Normal mode:
1. Classify the change before coding:
   - Business logic, parsers, data transforms, config, CLI behavior, and bug fixes: write a failing test first when practical.
   - Data contracts, imports/exports, schemas, generated data, and migrations: validate real structure and invariants with fixtures, schema checks, parsed values, or representative input/output checks.
   - UI microcomponents, copy, styling, and layout-only changes: do not create new tests unless there is branching logic, state, accessibility behavior, or a known regression.
2. Prefer the smallest useful validation level. Do not add shallow snapshot tests, tests that only duplicate static data, or tests that only assert trivial rendered text.
3. Implement the change.
4. Run existing relevant tests.
5. Run lint/typecheck if configured.
6. If no new test was added, briefly state why the existing validation is enough.

### Step 5 — Code review with configured review tool

> Skip if task has `#noqa` tag.

1. Use the project's configured review tool from AGENTS.md or the active project instructions.
2. Send the current diff and task context for review.
3. Ask: correctness, edge cases, style, security (blocker/warning/nitpick).
4. Review code yourself.
5. Fix issues found.
6. You can create the tasks to fix later if business logic is unclear to you with #needhuman tag using /mdtask-create skill.

### Step 6 — Final validation

> Skip entirely in fast mode unless the user explicitly asks for validation.

1. Run all tests again to confirm nothing broke after review fixes
2. Run lint/typecheck if configured

### Step 7 — Update PRD (TWO places - BOTH required)

> read @./spec-driven-development.md for the full workflow with examples.

**Place 1 — Feature description (before ## Tasks):**
- Find the markdown file where the task lives (e.g., `docs/prd/config.md`)
- If the task adds a **new feature** — create a new `## Section` above `## Tasks`
- If the task **extends an existing feature** — update the existing section
- Match the section to the feature, not to the task
- Describe from user perspective: what commands to run, what config to use
- Keep it concise — focus on HOW TO USE, not implementation details

**Place 2 — In the TASK body itself:**
- Find the completed task (the `- [ ] TSK-XXX ...` line you just worked on)
- Mark it done: `[ ]` → `[x]`
- Add an `**Implemented:**` block inside THAT TASK BODY ONLY with 2-5 bullets
- Describe what is now working (outcomes only — no code, no internal implementation details)
- **CRITICAL: Only touch the task you worked on. NEVER modify other tasks or their Implemented sections.**

### Step 8 — Commit

1. Commit with message describing what was built
