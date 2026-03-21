# mdtask

## Project Structure

- `docs/mdtask.md` — goals, architecture (why + how)
- `docs/cli.md` — CLI tasks with requirements
- `docs/mvp.md` — parser + infrastructure tasks
- `docs/post-mvp.md` — deferred tasks
- `.claude/skills/mdtask/SKILL.md` — canonical task format spec (what)

## Before Committing

If `docs/mdtask.md` changed — check if `.claude/skills/mdtask/SKILL.md` needs updating (and vice versa).
The skill is the single source of truth for task format; mdtask.md covers everything else.

## Task Delegation

  When delegating tasks to agents:
  - Describe WHAT needs to be done, not HOW
  - Never write code for the agent
  - Never provide ready-made solutions
  - Point to specs (docs/cli.md, docs/mvp.md) — agent reads them
  - Agent writes the code themselves