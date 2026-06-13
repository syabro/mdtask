# Project — mdtask

Project structure and entry point.

## Task tag: #noqa

Tasks tagged `#noqa` get a lighter `/mdtask-next` run — the two review steps (plan review at Step 3, code review at Step 5) are skipped. The change is still implemented, validated, documented, and committed. Use for small, low-risk changes where external review is overkill.

## Publishing to npm

Install globally: `npm install -g mdtask`

Package includes only `dist/cli.js`, `README.md`, and `LICENSE`.

Release workflow: `just release` (default: patch) or `just release minor` / `just release major`. The recipe checks for clean git state, runs tests, builds, bumps version, publishes to npm, commits, tags, and pushes.

License: [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.

## Spec authoring convention

A spec starts with prose sections that explain the feature from the user's side. The task journal starts at the bottom with `# Tasks`; story groups inside the journal use `##` headings. This makes the journal boundary stand out from the prose. See the `sdd` skill for the full PRD structure.

# Tasks

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

- [ ] PRJ-069 Rename docs/prd/ to docs/specs/ and update config
  Positioning standardizes on "spec" / `docs/specs/` (see docs/positioning.md).
  Move all task files from `docs/prd/` to `docs/specs/`, change `.mdtaskrc` `path`
  from `docs/prd` to `docs/specs`, and fix any other reference to the old path.
  After the move, `mdtask list` must still find every task.

- [ ] PRJ-070 Replace "PRD" with "spec" in skills		@blocked_by:PRJ-069
  Positioning standardizes on "spec", not "PRD" (see docs/positioning.md).
  Update the four shipped skills (sdd, mdtask, mdtask-create, mdtask-next):
  replace "PRD" wording with "spec", and `docs/prd/` with `docs/specs/` in examples.
  Do this after the folder rename so examples point at the real path.
  README is handled separately.

- [ ] PRJ-071 Rewrite README from docs/positioning.md		@blocked_by:PRJ-069
  The README diverges from docs/positioning.md: it leads with the old pitch ("CLI task
  manager where Markdown is the single source of truth"), uses "PRD", and omits the
  one-liner, the core message (specs don't drift), the category, and several shipped commands.
  Rewrite it: open with the one-liner; explain the model (a spec is one Markdown file —
  prose plus tasks — and a task closes in the same commit as the code and the spec update);
  describe the three layers (CLI / skills / macro-loop); give an accurate command reference
  including `archive`, `install-skills`, blockers, and `.mdtaskrc`; use "spec" / `docs/specs/`
  terminology. Takes the README out of PRJ-070's scope.

- [ ] PRJ-072 Rename the mdtask-next skill to mdtask-do
  "next" reads as "show the next task" — selection. The skill actually runs a task
  through the whole cycle (plan, review, code with tests, review, spec update, commit)
  and closes it. Rename it to mdtask-do so the name matches what it does and pairs with
  mdtask-create. Update the skill and every reference to the new name.

- [ ] PRJ-073 Review the sdd skill for over-fit and over-engineering
  Review the sdd skill in isolation for what won't generalize to other users and harnesses:
  over-engineered steps, assumptions baked in from this repo, and personal preferences
  treated as universal rules. Output flagged spots with a recommendation each — keep,
  make optional, or drop. Fixing is separate tasks.

- [ ] PRJ-074 Review the mdtask skill for over-fit and over-engineering
  Same review, applied to the mdtask skill (the task-format reference).

- [ ] PRJ-075 Review the mdtask-create skill for over-fit and over-engineering
  Same review, applied to the mdtask-create skill.

- [ ] PRJ-076 Review the mdtask-do skill for over-fit and over-engineering
  Same review, applied to the mdtask-do skill (after PRJ-072 renames it from mdtask-next).

- [ ] PRJ-077 Review the four skills as a system		@blocked_by:PRJ-073 @blocked_by:PRJ-074 @blocked_by:PRJ-075 @blocked_by:PRJ-076
  After the four per-skill reviews, review them together: do they hand off cleanly, share
  terms, and judge repeated conventions the same way — any gaps or overlaps between create
  and do? Output cross-skill findings with a recommendation each.

- [ ] PRJ-078 Fix formatting settings: 2-space indent, 120-col, via .editorconfig
  Biome formats with tabs (explicit `indentStyle: "tab"` in biome.json) and 80-col
  (Biome's default, unset). Switch to 2-space indent and 120-col, with `.editorconfig`
  as the source of truth: create `.editorconfig` (indent_style=space, indent_size=2,
  max_line_length=120, plus a sensible end_of_line/charset), and remove `indentStyle`
  from biome.json so it stops overriding editorconfig — Biome reads editorconfig via
  useEditorconfig, on by default. Reformat the whole codebase in the same change.

- [ ] PRJ-079 Re-run code review after review fixes, until it's clean
  When code review finds problems and they get fixed, the task is committed without running
  review again — so the fixed version is never reviewed. Result wanted: after each round of
  review fixes, code review runs again, and the task is committed only once review has no
  remaining issues.

- [ ] PRJ-080 Skill should require tasks to state the result, not invented steps
  Nothing in the task-creation guidance separates a task's outcome from its implementation,
  so tasks drift into agent-invented step-by-step recipes. Result wanted: the mdtask-create
  skill, and the sdd "What goes in a task" guidance, make the rule explicit — a task states
  what should be true when it's done. Concrete steps or details belong in a task only when
  they record a decision the user made or a real constraint confirmed with the user, never
  implementation the agent invented on its own.

- [x] PRJ-081 Change the spec task-journal boundary from `## Tasks` to `# Tasks`
  In every spec file the prose manual and the task journal are separated by `## Tasks`
  (H2), which sits at the same heading level as the prose `##` sections — so the boundary
  doesn't stand out from the prose. Result wanted: the journal opens with an H1 `# Tasks`
  at the bottom of the file, with story groups as `##` beneath it, one level clearer than
  its prose. This is an sdd authoring convention — mdtask's parser finds tasks by their
  `- [ ]` lines and ignores heading levels — so the change is to the sdd skill and the
  existing spec files, not to any CLI command.

  **Implemented:**
  - Spec task journals now start with `# Tasks`
  - Story groups under the task journal stay available as `##` headings
  - The SDD, task creation, and task execution skills now use the new boundary
  - Excess blank lines around affected task journals were removed
