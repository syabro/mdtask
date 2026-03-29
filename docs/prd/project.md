# Project — mdtask

Project structure and entry point.

## Pattern Matching

`ts-pattern` is available as a dependency. Use it where it improves clarity — e.g. exhaustive matching, complex conditionals, or multi-branch routing. Not required for simple cases where `switch` or `if` is clear enough.

## Task tag: #noqa

Tasks tagged `#noqa` get a lightweight /next-task workflow — Gemini plan validation (Step 3), Gemini code review (Step 5), and /check (Step 8) are skipped. Use for small, low-risk changes where full review is overkill.

## Publishing to npm

Install globally: `npm install -g mdtask`

Package includes only `dist/cli.js`, `README.md`, and `LICENSE`.

Release workflow: `just release` (default: patch) or `just release minor` / `just release major`. The recipe checks for clean git state, runs tests, builds, bumps version, publishes to npm, commits, tags, and pushes.

License: [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.

## Tasks

- [x] PRJ-030 Add picocolors for CLI colors
  Install and use `picocolors` library for ANSI colors.
  Replace manual color codes in `src/cli.ts` with picocolors API.
  
  Library: `picocolors` (~2KB, zero dependencies)
  
  Changes:
  - `pnpm add picocolors`
  - Replace `COLORS` constant with picocolors imports
  - Replace manual ANSI codes with `p.red()`, `p.yellow()`, etc.
  
  Tests:
  - Colors work in TTY mode
  - Colors disabled in pipe mode (picocolors auto-detects)
  - All existing tests pass

  **Implemented:**
  - `picocolors` installed as production dependency
  - Manual ANSI color codes replaced with picocolors API
  - Removed `useColor` parameter - picocolors auto-detects TTY
  - `formatPriority()` and `formatTaskLine()` simplified
  - All 87 tests pass, lint clean

- [x] PRJ-031 Add ts-pattern for pattern matching
  Install and use `ts-pattern` library for type-safe pattern matching.

  Library: `ts-pattern` (~47KB bundled)

  Use cases:
  - Refactor command handlers to use `match().with()` chains
  - Add exhaustive pattern matching for command routing
  - Improve type safety in switch-like logic

  Changes:
  - `pnpm add ts-pattern`
  - Refactor `handleCommand()` to use pattern matching
  - Refactor color formatting to use pattern matching

  Tests:
  - All existing tests pass
  - Pattern matching covers all command cases exhaustively

  **Implemented:**
  - `ts-pattern` installed as production dependency
  - Available for use where it improves clarity (see project.md "Pattern Matching" section)
  - Not yet adopted in existing code — `cac` handles command routing, `switch` handles priority formatting

- [x] PRJ-032 Dev script `pnpm mdtask` — proxy to tsx		@iter:mvp
  Add npm script `mdtask` that runs `tsx src/cli.ts` for local development.
  This allows running `pnpm mdtask list` without building.

  Changes:
  - Add `tsx` as dev dependency
  - Add `"mdtask": "tsx src/cli.ts"` to package.json scripts

  Tests:
  - `pnpm mdtask list` outputs tasks
  - `pnpm mdtask --help` works

  **Implemented:**
  - `tsx 4.21.0` added as dev dependency
  - `"mdtask": "tsx src/cli.ts"` script added to package.json
  - Arguments pass directly: `pnpm mdtask list --all` works without `--` delimiter
  - `pnpm mdtask list` and `pnpm mdtask --help` verified working

- [x] PRJ-029 Project structure and entry point		@iter:mvp
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works

- [x] PRJ-033 Tag #noqa skips Gemini and /check in /next-task
  When a task has `#noqa` tag, /next-task should skip:
  - Step 3 (validate plan with Gemini)
  - Step 5 (code review with Gemini)
  - Step 8 /check

  Update docs/skills/next-task/SKILL.md accordingly.

  **Implemented:**
  - Added `#noqa` callout at top of Flow section in next-task SKILL.md
  - Steps 3, 5, and 8 each have "Skip if task has `#noqa` tag" note
  - Feature description added to docs/prd/project.md

- [x] PRJ-035 Migrate to globally unique numeric IDs		@iter:new-ids
  Renumber all existing tasks so NNN is unique across all prefixes.
  Update all `@blocked_by:OLD-ID` references.
  Single atomic commit. Do not touch EXMPL/KTL example IDs.

  **Implemented:**
  - CLI-001–024 kept as-is, all other prefixes renumbered to 025–044
  - All `@blocked_by` references updated to new IDs
  - EXMPL/KTL example IDs untouched
  - `mdtask validate` passes clean after migration

- [x] PRJ-036 Update create-task skill for new ID scheme		@iter:new-ids
  Simplify create-task skill: write task without ID, then run `mdtask ids`.
  Remove manual ID computation from Step 4.
  Update prefix-to-PRD table to match `.mdtaskrc` `prefixes` field.

  **Implemented:**
  - Removed manual ID computation (old Step 4), replaced with `mdtask ids` after save
  - Documented three task header formats: no ID, seed prefix, full ID
  - Default is write without ID — `mdtask ids` assigns automatically
  - Added TST prefix to PRD table
  - Updated examples to show new workflow

- [x] PRJ-037 Document globally unique ID scheme		@iter:new-ids
  Update docs/mdtask.md section 7 "Task Identity" and docs/skills/mdtask/SKILL.md:
  - NNN is globally unique across all prefixes
  - Short numeric lookup: `mdtask view 42`
  - `mdtask ids` auto-assigns IDs
  - Prefix-to-file mapping in `.mdtaskrc`

  **Implemented:**
  - Updated mdtask.md section 7 with globally unique NNN, short numeric lookup, `mdtask ids`
  - Updated SKILL.md ID description to reflect PREFIX-NNN with auto-assignment
  - Removed mention of `.mdtaskrc` prefix mapping (not needed — prefix derived from files)

- [x] PRJ-047 Publish to npm so `npm install -g mdtask` works
  Configure package.json for npm publishing.
  Ensure the built CLI binary works as a global install.
  Add bin entry, build step, and publish workflow.
  Add `just release` command to bump version, build, and publish.

  **Implemented:**
  - `files` field limits tarball to `dist/`, `README.md`, `LICENSE` (11KB total)
  - npm metadata: license, author, repository, keywords
  - PolyForm Shield 1.0.0 license
  - `just release [patch|minor|major]` — checks clean git, tests, builds, bumps, publishes, tags, pushes

- [ ] PRJ-034 Define layered architecture
  Analyze current code and define clear data flow layers.
  Create docs/architecture.md describing:
  - What modules/layers exist (discovery, parsing, collection, mutation, presentation)
  - How data flows between them
  - Which functions belong to which layer
  - Where to put new code

  Use Gemini, Codex, and general agent to research and propose architecture.
  Documentation only. Code refactoring is separate tasks.