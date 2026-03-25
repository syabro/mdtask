# mdtask

Use **pnpm** for package operations.

## Running mdtask

`pnpm mdtask <command>` — runs CLI via tsx (no build needed). Use this for local development and testing.
Always use `pnpm mdtask` to work with tasks. Never parse task files manually if there is a functionality in `mdtask` cli

## Development Workflow

read @docs/spec-driven-development.md — spec-driven development, PRD structure, examples.

## Project Structure

- `docs/prd/` — PRDs (task, files, cli, config, project, test)
- `docs/skills/` — canonical skill files (mdtask, check, create-task, next-task)
- `.claude/skills/` — symlinks to `docs/skills/`; edit `docs/skills/` only
- `docs/mdtask.md` — goals, architecture
- `docs/spec-driven-development.md` — development workflow

## Example IDs in docs

Use `EXMPL-` prefix for example task IDs in documentation and PRD task bodies. Never use real task IDs (CLI-001, TSK-003, etc.) in examples — they get picked up by `mdtask list`. The `EXMPL` prefix is excluded via `.mdtaskrc` `excludePrefixes`.

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

read @docs/skills/next-task/SKILL.md to understand task loop