---
name: mdtask-do
description: Work one project task end to end — pick, plan, review, execute, review code, update the spec, commit
disable-model-invocation: false
---

# /mdtask-do — Task workflow

> **Always use the `mdtask` CLI to work with tasks — never read or parse the markdown task files by hand.** In this repo that's `pnpm mdtask <command>`; with a global install it's `mdtask <command>`.

## Flow

**Gate — do this before reading any further.** Your first action in this skill is to materialize the steps below as a live, checkable task list, and you tick items off it as you go (you'll be asked to confirm against it before the commit in Step 8). In Claude that's the task tools — `ToolSearch` for `select:TaskCreate,TaskUpdate` to load them, then `TaskCreate` one item per step (Pick, Plan, Review plan, Execute, Behavior check, Review code, Final validation, Update spec, Commit); in Pi, a `./tmp` markdown checklist. If a task tool genuinely isn't available, write the same checklist into your visible reply — the artifact is mandatory, the specific tool is not. Don't announce or summarize the steps in prose as a substitute; create the tracked list, then go straight into Step 1.

**One checklist per run.** Before creating this run's items, check (`TaskList`) for a checklist left by a previous task in this session. If there is none, or every item in it is closed, clear it and start fresh. If it still has open (unfinished) items, the rule depends on how you're running: **interactively** (the user is present and hasn't told you to act independently, here or in standing instructions) → STOP and ask the user what to do with them — never wipe someone's in-progress work; **autonomously** (the user set independent / loop operation in instructions or chat) → there's no one to ask, so just clear all of them and start fresh, don't block the loop.

**Modes**
- **normal** (default) — full cycle, autonomous: pick the most logical task and approve your own plan.
- **fast** (`fast`, `--fast`, `-f`) — skip planning, both review steps, test-first work, the behavior check, and final validation. Still pick the task with the CLI, make the change, update the task and spec, and commit unless told not to.

**`#noqa` tag** — if the picked task carries `#noqa`, skip the two review steps (Step 3 and Step 5). Everything else, including the behavior check and commit, still runs.

### Step 1 — Pick a task

1. `mdtask list` for open, unblocked tasks. The CLI hides tasks with unresolved `@blocked_by:ID` by default. Skip tasks tagged `#user-required` — they're parked for a human decision (see "When you can't decide" below).
2. If the user gave scope (tag, area, specific task), filter by it. Otherwise pick the most logical next task.
3. No open tasks left → tell the user and stop. (This is what makes the skill safe to run in a loop — see "Working a list of tasks" below.)

### Step 2 — Plan

> Skip in fast mode.

1. Read the task file for full details.
2. Understand what to build — don't invent extra scope.
3. Write a concrete plan: files to create/modify, functions/modules, how to structure the code.
4. State the behavior check you will run after tests pass: a local command, CLI flow, API call, UI path, integration check, or another realistic use case that proves the requested result. If a direct behavior check cannot run, say why and name the strongest available replacement evidence; don't use ordinary tests, lint, code reading, or `mdtask validate` as the replacement when a realistic check is possible.

### Step 3 — Review the plan

> Skip if the task has `#noqa`, or in fast mode.

A different model catches more than self-review, so send the plan to an external reviewer:

1. Check `AGENTS.md` / `CLAUDE.md` for a configured review tool and when to use it.
   - **Named** → use it. Send plan + task spec + relevant files; ask: is it correct? missing pieces? better approach? does the planned behavior check prove the requested result?
   - **Not configured** → ⚠️ warn the user ("no review tool configured in AGENTS.md/CLAUDE.md — falling back to a subagent, which is weaker because it's the same model checking itself"), then launch a subagent for the review.
   - **No subagent tool available either** → ⚠️ warn and review the plan yourself. Don't skip silently.
2. Fold the feedback into a refined plan.

### Step 4 — Execute with risk-based validation and behavior check

> Fast mode: implement directly — no test-first, no validation unless the user asks.

Pick the smallest useful validation for the change:

- **Logic, parsers, data transforms, CLI behavior, bug fixes** → write a failing test first when practical.
- **Data contracts, schemas, imports/exports, migrations** → validate real structure with fixtures or representative input/output.
- **UI, copy, styling, layout-only** → no new test unless there's branching logic, state, accessibility behavior, or a known regression.

Then implement, run the relevant existing tests, and run lint/typecheck if configured. If you added no test, say in one line why existing validation is enough. Skip shallow snapshot tests and tests that only restate static data.

After tests and lint/typecheck pass, run the planned behavior check. Report the exact check and result. If it fails, fix the issue and re-run the behavior check before review or final validation. If the behavior check cannot run, record why and report the replacement evidence named in the plan. `#noqa` skips reviews only; it still runs this behavior check. Fast mode skips this whole step's behavior check because it has no plan.

### Step 5 — Review the code

> Skip if the task has `#noqa`, or in fast mode.

Resolve the reviewer the same way as Step 3 (named tool → subagent fallback with a warning → self-review with a warning). Send the current implementation diff + task context; ask about correctness, edge cases, style, security. Review it yourself too. Fix all safe actionable technical findings. If fixes change the implementation diff, run relevant validation and behavior checks as needed, then run code review again on the updated diff. Repeat until the latest review has no remaining actionable findings on the current implementation diff; optional nits or subjective suggestions do not keep the loop open unless they affect the requested result. If a later implementation change happens after a clean review, return to this step before committing. If a decision genuinely needs a human — ambiguous business logic, a product call you can't make, a finding you cannot safely accept or reject — don't guess: park the task (see "When you can't decide" below).

### Step 6 — Final validation

> Skip in fast mode unless the user asks for it.

Run all tests again to confirm nothing broke after review fixes, and lint/typecheck if configured. Confirm the final report has an explicit behavior-check status: passed, skipped by fast mode, or replaced with the reason and evidence from the plan.

### Step 7 — Update the spec (TWO places — both required)

> Full workflow with examples: the `mdtask` skill's "Spec-driven development" section.

**Place 1 — feature description (above `# Tasks`):** in the spec file where the task lives, add a new `## Section` for a new feature, or update the existing section if the task extends one. Match the section to the feature, not to the task. Describe it from the user's side — what to run, what config to use — concise, how-to-use, not implementation detail.

**Place 2 — the task body:** mark it `[x]` and add an `**Implemented:**` block (2–5 bullets, outcomes only — no code, no internals). **Only touch the task you worked on — never modify other tasks or their Implemented blocks.**

### Step 8 — Commit

First confirm against the checklist from the Flow gate: every step done or consciously skipped (fast/`#noqa`), the behavior-check status is recorded, the last implementation diff was reviewed cleanly or review was validly skipped, and nothing was silently dropped. Then commit with a message describing what was built.

## When you can't decide — park it

At any step, if you hit a decision that genuinely needs a human — ambiguous business logic, a product call you can't make, a spec gap — don't guess, and don't open a separate task. Park the current task so the loop moves on:

1. Tag it: `mdtask set <ID> '#user-required'` (quote the `#` — unquoted it's a shell comment).
2. Append a short note to the task body: the exact open question and what you already found (options weighed, where in the code the problem sits). This is what keeps the context from being lost — the tag only marks the task, the note explains it.
3. Commit the parked state, then stop. The loop picks the next task; parked tasks are skipped (Step 1).

A human later reviews everything parked with `mdtask list '#user-required'`, makes the call, and removes the `#user-required` tag to put the task back in play. (`mdtask set` only *adds* metadata — to remove the tag, open the task with `mdtask open <ID>` and delete the `#user-required` token from the header line.)

## Working a list of tasks

This skill does one task and stops cleanly when none are left. To work through a backlog, run it repeatedly from your coding agent's own loop — driving a whole scope of tasks is the agent's job, not part of mdtask, so use whatever loop mechanism your harness provides.
