# mdtask

## Project Structure

- `docs/prd/` — PRDs (task, files, cli, config, project)
- `docs/skills/` — skills (mdtask, check)
- `docs/mdtask.md` — goals, architecture

## Before Committing

If `docs/mdtask.md` changed — check if `docs/skills/mdtask/SKILL.md` needs updating (and vice versa).
The skill is the single source of truth for task format; mdtask.md covers everything else.

## Task Delegation

  When delegating tasks to agents:
  - Describe WHAT needs to be done, not HOW
  - Never write code for the agent
  - Never provide ready-made solutions
  - Point to specs (docs/prd/) — agent reads them
  - Agent writes the code themselves

---

`CLAUDE.md` is `ln -s AGENTS.md` — Claude Code only reads `CLAUDE.md`, not `AGENTS.md`.
