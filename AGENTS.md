# mdtask

Use **pnpm** for package operations.

**Always read @justfile at the start of every session.** It defines project commands — use `just` instead of raw pnpm/npm for build, test, release, etc.

## Release publishing

Do not run npm publish yourself. The user must run the publish step manually because npm requires interactive two-factor authentication.

## Running mdtask

`pnpm mdtask <command>` — runs CLI via tsx (no build needed). Use this for local development and testing.
Always use `pnpm mdtask` to work with tasks. Never parse task files manually if there is a functionality in `mdtask` cli

## Referencing tasks

Never cite a task by its bare ID. Whenever you mention a task (`CLI-059`, `TSK-061`, …) — in chat or in docs — include its title/text right next to the ID. The reader does not have task IDs memorized; an ID with no content is meaningless. Citing several at once? List each ID with its title.

## Development Workflow

read @skills/mdtask/SKILL.md — task format, spec-driven development, spec structure, examples.

## Project Structure

- `docs/specs/` — specs (task, files, cli, config, project, test)
- `skills/` — shippable dev skills (mdtask, mdtask-add, mdtask-do)
- `docs/mdtask.md` — goals, architecture
- `skills/mdtask/SKILL.md` — task format and spec-driven development workflow
- `../website/` — Astro landing page (git worktree, `website` branch). Deploy: `cd ../website && just deploy` (wrangler → Cloudflare Pages)

## Example IDs in docs

Use `EXMPL-` prefix for example task IDs in documentation and spec task bodies. Never use real task IDs (CLI-001, TSK-003, etc.) in examples — they get picked up by `mdtask list`. The `EXMPL` prefix is excluded via `.mdtaskrc` `excludePrefixes`.

## Before Committing

Before committing, read `docs/dev/commit-message-guidelines.md` and validate the message against it. If the commit closes an mdtask task, include the task ID after the type.

If `docs/mdtask.md` changed — check if `skills/mdtask/SKILL.md` needs updating (and vice versa).
The skill is the single source of truth for task format; mdtask.md covers everything else.

## Task Delegation

  When delegating tasks to agents:
  - Describe WHAT needs to be done, not HOW
  - Never write code for the agent
  - Never provide ready-made solutions
  - Point to specs (`docs/specs/`) — agent reads them
  - Agent writes the code themselves

## File Paths in Prompts

Use `@` prefix for file paths in skill prompts (e.g., `@README.md`). This is Claude Code file inclusion syntax.

---

`CLAUDE.md` is `ln -s AGENTS.md` — Claude Code only reads `CLAUDE.md`, not `AGENTS.md`.

Shippable skills live in `skills/`.

Task runner: the `mdtask-do` skill (run `/mdtask-do`). It loads on demand — no need to read it into every session.
