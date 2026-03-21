# mdtask

## Project Structure

- `docs/PRD.md` — goals, CLI commands, architecture (why + how)
- `docs/mvp.md` — MVP tasks
- `docs/post-mvp.md` — deferred tasks
- `.claude/skills/mdtask/SKILL.md` — canonical task format spec (what)

## Before Committing

If `docs/PRD.md` changed — check if `.claude/skills/mdtask/SKILL.md` needs updating (and vice versa).
The skill is the single source of truth for task format; PRD covers everything else.

## Task Delegation

  When delegating tasks to agents:
  - Describe WHAT needs to be done, not HOW
  - Never write code for the agent
  - Never provide ready-made solutions
  - Point to specs (docs/mvp.md) — agent reads them
  - Agent writes the code themselves