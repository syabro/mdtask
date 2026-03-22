# Project — mdtask

Project structure and entry point.

- [ ] PRJ-002 Add picocolors for CLI colors
  Install and use `picocolors` library for ANSI colors.
  Replace manual color codes in `src/app.ts` with picocolors API.
  
  Library: `picocolors` (~2KB, zero dependencies)
  
  Changes:
  - `npm add picocolors`
  - Replace `COLORS` constant with picocolors imports
  - Replace manual ANSI codes with `p.red()`, `p.yellow()`, etc.
  
  Tests:
  - Colors work in TTY mode
  - Colors disabled in pipe mode (picocolors auto-detects)
  - All existing tests pass

- [ ] PRJ-003 Add ts-pattern for pattern matching
  Install and use `ts-pattern` library for type-safe pattern matching.
  
  Library: `ts-pattern` (~47KB bundled)
  
  Use cases:
  - Refactor command handlers to use `match().with()` chains
  - Add exhaustive pattern matching for command routing
  - Improve type safety in switch-like logic
  
  Changes:
  - `npm add ts-pattern`
  - Refactor `handleCommand()` to use pattern matching
  - Refactor color formatting to use pattern matching
  
  Tests:
  - All existing tests pass
  - Pattern matching covers all command cases exhaustively

- [x] PRJ-001 Project structure and entry point		@iter:mvp
  Node.js + TypeScript project.
  Create:
  - `src/` — source code
  - `test/` — vitest tests
  - `package.json` — entry point, scripts
  All errors to stderr.

  Tests:
  - entry point works
