# Project — mdtask

Project structure and entry point.

## Task tag: #noqa

Tasks tagged `#noqa` get a lighter `/mdtask-next` run — the two review steps (plan review at Step 3, code review at Step 5) are skipped. The change is still implemented, validated, documented, and committed. Use for small, low-risk changes where external review is overkill.

## Publishing to npm

Install globally: `npm install -g mdtask`

Package includes only `dist/cli.js`, `README.md`, and `LICENSE`.

Release workflow: `just release` (default: patch) or `just release minor` / `just release major`. The recipe checks for clean git state, runs tests, builds, bumps version, publishes to npm, commits, tags, and pushes.

License: [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.

## Tasks










- [ ] PRJ-034 Define layered architecture
  Analyze current code and define clear data flow layers.
  Create docs/architecture.md describing:
  - What modules/layers exist (discovery, parsing, collection, mutation, presentation)
  - How data flows between them
  - Which functions belong to which layer
  - Where to put new code

  Use Gemini, Codex, and general agent to research and propose architecture.
  Documentation only. Code refactoring is separate tasks.

- [ ] PRJ-048 GitHub Actions: run tests on push
  Add `.github/workflows/ci.yml` that runs `pnpm test` and `pnpm lint` on every push.

- [ ] PRJ-049 GitHub Actions: npm publish on tag push
  Add `.github/workflows/publish.yml` that publishes to npm on tag push (`v*`).
  Use npm trusted publishing (OIDC, no token).
  Keep `just release` as manual fallback.

- [ ] PRJ-053 Define commit message format
  Discuss and agree on a commit message convention with the user.
  Document the format in CLAUDE.md so it's followed in all future commits.