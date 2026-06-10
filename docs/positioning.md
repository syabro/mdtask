# mdtask — positioning decisions

These decisions apply to the whole project: landing, README, docs, skills. Where code or
docs don't follow them yet, that's an unfinished migration, not an exception.

## Core message

**One commit: the code, the task closure, and the updated spec.**
Lead with this everywhere.

## The unit is a spec

- A spec is a single Markdown file. `auth.md` is all of authentication.
- Features (magic-link login, password reset) are tasks inside the spec, not separate files.
- There are many spec files; together they are the backlog.
- Never phrase it so it reads as "the whole project in one file".
- Terminology: `specs` (`docs/specs/`), not PRD. Project-wide decision; the repo still has
  `docs/prd/` and "PRD" in docs and skills — migration not done yet.

## The agent runs the loop, not the tool

- `mdtask done` only toggles the checkbox. The `Implemented:` note, the prose update, and
  the commit are done by the agent via the `mdtask-next` skill. mdtask ships no loop or
  orchestrator.
- So in any text: "your agent picks a task, builds it, and closes it in place" — never
  "mdtask closes it / mdtask commits".

## The spec describes only what's done

Prose covers what works. Behavior of an open task is not mentioned in the prose.
Close the task — update the prose, in the same commit.

## Versus

- **OpenSpec / Spec Kit:** mdtask replaces their file ceremony — the folder of generated
  spec/plan/tasks files and the slash commands. It does not replace orchestration: the loop
  is the agent's job.
- **Trackers (Jira / Linear / Issues):** their status lives in the cloud; mdtask's lives in
  the same diff as the code.

## @blocked_by

A custom field supported out of the box: parsed, and the task is shown as blocked.
It is NOT a dependency graph — no traversal, no cycles. Don't oversell it.
