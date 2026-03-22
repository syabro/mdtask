---
name: do-next-task
description: Work on the next task from the project — pick, plan, review, execute, review code, commit
disable-model-invocation: false
---

# /do-next-task — Task workflow

## Flow

Immediately create a todo list from the 6 steps below and track progress through it.

### Step 1 — Pick a task

1. Load mdtask skill, find all open tasks
2. For each task, check `@blocked_by`:
   - Extract the blocker ID
   - Search for it across `*.md` files
   - Skip the current task if the blocker checkbox is `[ ]`
3. Ask user what direction they want to work on today (tags, area, specific task)
4. Filter and present matching tasks, ask user to pick one (via "Ask a User Question")
5. If no tasks remain: tell user, stop

### Step 2 — Plan and review

1. Find the markdown file where the task is located, read the full task body
2. Understand what needs to be built (don't invent extra scope)
3. Write a concrete implementation plan:
   - What files to create/modify
   - What functions/modules
   - How to structure code
   - Which tests to write
4. Load gemini skill, send plan + task spec + relevant project files for review
5. Ask Gemini: is the plan correct? Any missing pieces? Better approach?
6. Combine feedback into a refined plan
7. Present the refined plan to user for single approval

### Step 3 — Execute (TDD)

1. Write failing tests first based on the task description
2. Run tests, confirm they fail
3. Implement code to make tests pass
4. Run tests, confirm they pass
5. Refactor if needed, keep tests green
6. Run lint/typecheck if configured

### Step 4 — Code review

1. Load gemini skill, send final code for review
2. Ask: correctness, edge cases, style, security
3. Review code yourself
4. Fix issues found

### Step 5 — Final validation

1. Run all tests again to confirm nothing broke after review fixes
2. Run lint/typecheck if configured

### Step 6 — Commit

1. Mark task as done: `[ ]` → `[x]` in the task's markdown file
2. Commit with message describing what was built
3. Run `/check` if docs changed
