# mdtask

Use **pnpm** for package operations.

## Running mdtask

`pnpm mdtask <command>` — runs CLI via tsx (no build needed). Use this for local development and testing.
Always use `pnpm mdtask` to work with tasks. Never parse task files manually if there is a functionality in `mdtask` cli

## Project Structure

- `docs/prd/` — PRDs (task, files, cli, config, project)
- `docs/skills/` — canonical skill files (mdtask, check, do-next-task)
- `.claude/skills/` — symlinks to `docs/skills/`; edit `docs/skills/` only
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

## File Paths in Prompts

Use `@` prefix for file paths in skill prompts (e.g., `@README.md`). This is Claude Code file inclusion syntax.

---

`CLAUDE.md` is `ln -s AGENTS.md` — Claude Code only reads `CLAUDE.md`, not `AGENTS.md`.

All Claude skill files under `.claude/skills/*/SKILL.md` are `ln -s` to `docs/skills/*/SKILL.md`.
Update the files in `docs/skills/`, not the symlink paths.

read @docs/skills/do-next-task/SKILL.md to understand task loop