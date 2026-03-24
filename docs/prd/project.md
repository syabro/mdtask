# Project — mdtask

Project structure and entry point.

## Command Routing

The CLI uses `cac` for command routing and `switch` statements for priority color mapping. `ts-pattern` is installed but unused — it was replaced by simpler constructs during development.

## Tasks

- [x] PRJ-002 Add picocolors for CLI colors
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

- [x] PRJ-003 Add ts-pattern for pattern matching
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
  - `handleCommand()` refactored to use `match().with().otherwise()` chains
  - `formatPriority()` refactored to use pattern matching with fallback
  - All 87 tests pass, lint clean

- [x] PRJ-004 Dev script `pnpm mdtask` — proxy to tsx		@iter:mvp
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

- [x] PRJ-001 Project structure and entry point		@iter:mvp
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works