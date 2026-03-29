---
name: next-task
description: Work on the next task from the project — pick, plan, review, execute, review code, commit
disable-model-invocation: false
---

# /next-task — Task workflow

> **CRITICAL: ALWAYS use `pnpm mdtask <command>` CLI to work with tasks. NEVER read or parse markdown task files manually.**

## Flow

Immediately create a todo list using `todowrite` tool for all steps below
ALL steps are mandatory. Never skip any step, regardless of task size.
After reading this file you must say "I'll do all the steps as it described" and provide all steps you understood,
   so user will understand you really get it

> **`#noqa` tag:** If the picked task has `#noqa`, skip Steps 3, 5, and 8 (no Gemini reviews, no /check).

> **Mode:** By default, work autonomously — pick the most logical task, approve your own plan, fix /check warnings and blockers, skip nits. If user passes `--interactive` (or `--i`), ask questions at decision points: task selection, plan approval, /check findings.

### Step 1 — Pick a task

**ALWAYS use `pnpm mdtask` CLI — NEVER parse markdown files manually.**

1. Run `pnpm mdtask list` to get all open tasks
   - Tasks with unresolved `@blocked_by:ID` are still listed — skip them when picking
2. If user provided scope (tag, area, specific task) — filter by it. Otherwise pick the most logical next task.
3. In `--interactive` mode: present matching tasks and ask user to choose.
4. If no tasks remain: tell user, stop

### Step 2 — Plan

1. Read the task file to get the full task details (use Read tool)
2. Understand what needs to be built (don't invent extra scope)
3. Write a concrete implementation plan:
   - What files to create/modify
   - What functions/modules
   - How to structure code

### Step 3 — Validate plan with Gemini

> Skip if task has `#noqa` tag.

1. Load gemini skill (user-level skill)
2. Send plan + task spec + relevant project files for review
3. Ask Gemini: is the plan correct? Any missing pieces? Better approach?
4. Combine feedback into a refined plan
5. In `--interactive` mode: present the refined plan to user for approval. Otherwise proceed.

### Step 4 — Execute (TDD)

1. Write failing tests first based on the task description
2. Run tests, confirm they fail
3. Implement code to make tests pass
4. Run tests, confirm they pass
5. Refactor if needed, keep tests green
6. Run lint/typecheck if configured

### Step 5 — Code review with Gemini

> Skip if task has `#noqa` tag.

1. Load gemini skill and send code diff for review
2. Ask: correctness, edge cases, style, security (blocker/warning/nitpick)
3. Review code yourself
4. Fix issues found
5. You can create the tasks to fix later if business logic is unclear to you with #needhuman tag using /create-task skill

### Step 6 — Final validation

1. Run all tests again to confirm nothing broke after review fixes
2. Run lint/typecheck if configured

### Step 7 — Update PRD (TWO places - BOTH required)

> read @docs/spec-driven-development.md for the full workflow with examples.

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
2. Run `/check` — pass only the files you changed in this task. Do NOT fix findings in files you didn't touch. Skip if task has `#noqa` tag.
