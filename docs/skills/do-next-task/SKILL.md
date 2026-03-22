---
name: do-next-task
description: Work on the next task from the project — pick, plan, review, execute, review code, commit
disable-model-invocation: false
---

# /do-next-task — Task workflow

## Flow

Immediately create a todo list from the steps below and track progress through it.
ALL steps are mandatory. Never skip any step, regardless of task size.

### Step 1 — Pick a task

1. Load mdtask skill, find all open tasks
2. For each task, check `@blocked_by`:
   - Extract the blocker ID
   - Search for it across `*.md` files
   - Skip the current task if the blocker checkbox is `[ ]`
3. Ask user what direction they want to work on today (tags, area, specific task)
4. Filter and present matching tasks, ask user to pick one (via "Ask a User Question")
5. If no tasks remain: tell user, stop

### Step 2 — Plan

1. Find the markdown file where the task is located, read the full task body
2. Understand what needs to be built (don't invent extra scope)
3. Write a concrete implementation plan:
   - What files to create/modify
   - What functions/modules
   - How to structure code
   - Which tests to write

### Step 3 — Validate plan with Gemini

1. Load gemini skill
2. Send plan + task spec + relevant project files for review
3. Ask Gemini: is the plan correct? Any missing pieces? Better approach?
4. Combine feedback into a refined plan
5. Present the refined plan to user for single approval

### Step 4 — Execute (TDD)

1. Write failing tests first based on the task description
2. Run tests, confirm they fail
3. Implement code to make tests pass
4. Run tests, confirm they pass
5. Refactor if needed, keep tests green
6. Run lint/typecheck if configured

### Step 5 — Code review with Gemini

1. Load gemini skill, send final code for review
2. Ask: correctness, edge cases, style, security
3. Review code yourself
4. Fix issues found

### Step 6 — Final validation

1. Run all tests again to confirm nothing broke after review fixes
2. Run lint/typecheck if configured

### Step 7 — Update PRD (TWO places - BOTH required)

**Place 1 — In the TASK body itself:**
- Find the completed task (the `- [ ] TSK-XXX ...` line you just worked on)
- Add an `**Implemented:**` block inside that task body with 2-5 bullets
- Describe what is now working (outcomes only — no code, no internal implementation details)

**Place 2 — In the PRD's "How it works" section:**
- Find the markdown file where the task lives (e.g., `docs/prd/task.md`)
- Look for the `## How it works` section (or create one if missing)
- Add a brief high-level description of the new behavior so a user or agent can understand how the system now works
- Keep it concise and product-level, not implementation notes
- Example: Add a subsection like `## Metadata format` describing what users can do with the feature

### Step 8 — Commit

1. Mark task as done: `[ ]` → `[x]` in the task's markdown file
2. Commit with message describing what was built
3. Run `/check` if docs changed
