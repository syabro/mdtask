# Project — mdtask

Project structure and entry point.

## Task tag: #noqa

Tasks tagged `#noqa` get a lighter `/mdtask-do` run — the two review steps (plan review at Step 3, code review at Step 5) are skipped. The change is still implemented, validated, documented, and committed. Use for small, low-risk changes where external review is overkill.

## Publishing to npm

Install globally: `npm install -g mdtask`

Package includes `dist/cli.js`, root `skills/`, `README.md`, and `LICENSE`.

Release workflow: `just release` (default: patch) or `just release minor` / `just release major`. The recipe checks for clean git state, runs tests, builds, bumps version, publishes to npm, commits, tags, and pushes.

License: [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/) — free to use, modify, and distribute; competing products prohibited.

## Spec authoring convention

One spec is one spec file. It starts with prose sections that explain the feature from the user's side. The task journal starts at the bottom with `# Tasks`; story groups inside the journal use `##` headings. This makes the journal boundary stand out from the prose. See the `sdd` skill for the full spec structure.

## Specs directory

Task/spec files live under `docs/specs/`. `.mdtaskrc` points there, so `mdtask list`, `mdtask view`, `mdtask validate`, and other commands scan the specs by default.

## Skills directory

Shippable agent skills live in root `skills/`. The same directory is committed as the source of truth and shipped in the npm package.

## Task creation skill

`mdtask-create` guides agents through creating tasks: clarify the user's intent, choose an existing spec or propose a new one in the project's configured spec directory, show the exact task proposal before saving, assign IDs with `mdtask ids`, and ask about committing only when the project workflow commits task changes.

## Task execution skill

`mdtask-do` runs one task through selection, planning, review, implementation, validation, spec update, and commit. Normal runs must plan a realistic behavior check, run it after tests and lint pass, and report its result. If the check cannot run, the plan names the strongest replacement evidence. Code review repeats after implementation fixes until the latest reviewed diff has no remaining actionable findings. `#noqa` skips reviews only; fast mode skips planning, reviews, the behavior check, and final validation.

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

- [x] PRJ-069 Move task specs to docs/specs/ and update config
  Positioning standardizes on "spec" / `docs/specs/` (see docs/positioning.md).
  Move all task files to `docs/specs/`, change `.mdtaskrc` `path` to `docs/specs`,
  and fix any other reference to the old path.
  After the move, `mdtask list` must still find every task.

  **Implemented:**
  - Task/spec files now live under `docs/specs/`.
  - `.mdtaskrc` scans `docs/specs` by default.
  - Documentation, shipped skill examples, and tests now use `docs/specs` paths.
  - Task discovery was checked before and after the move.

- [x] PRJ-070 Replace "PRD" with "spec" in skills		@blocked_by:PRJ-069
  Positioning standardizes on "spec", not "PRD" (see docs/positioning.md).
  Update the four shipped skills (sdd, mdtask, mdtask-create, mdtask-do):
  replace "PRD" wording with "spec" in frontmatter, headings, workflow text, and examples.
  Do this after the folder rename so examples point at the real spec path.
  README is handled separately.

  **Implemented:**
  - Shipped skills now use `spec` / `spec file` terminology instead of PRD wording.
  - `mdtask-create` now asks agents to choose or create a spec.
  - `mdtask-do` now tells agents to update the task and spec when closing work.
  - `sdd` now describes spec files as the source of work and the manual.

- [ ] PRJ-071 Rewrite README from docs/positioning.md		@blocked_by:PRJ-069
  The README diverges from docs/positioning.md: it leads with the old pitch ("CLI task
  manager where Markdown is the single source of truth"), uses "PRD", and omits the
  one-liner, the core message (specs don't drift), the category, and several shipped commands.
  Rewrite it: open with the one-liner; explain the model (a spec is one Markdown file —
  prose plus tasks — and a task closes in the same commit as the code and the spec update);
  describe the three layers (CLI / skills / macro-loop); give an accurate command reference
  including `archive`, `install-skills`, blockers, and `.mdtaskrc`; use "spec" / `docs/specs/`
  terminology. Takes the README out of PRJ-070's scope.

- [x] PRJ-072 Rename the mdtask-next skill to mdtask-do
  "next" reads as "show the next task" — selection. The skill actually runs a task
  through the whole cycle (plan, review, code with tests, review, spec update, commit)
  and closes it. Rename it to mdtask-do so the name matches what it does and pairs with
  mdtask-create. Update the skill and every reference to the new name.

  **Implemented:**
  - The task-running skill now lives at `docs/skills/mdtask-do/` with `name: mdtask-do`.
  - Shipped skill lists, install recipes, package tests, and bundle generation now use `mdtask-do`.
  - Active docs now refer to `/mdtask-do` and `mdtask-do` for the per-task workflow.
  - Archived task history was left unchanged.

- [x] PRJ-073 Review the sdd skill for over-fit and over-engineering
  Review the sdd skill in isolation for what won't generalize to other users and harnesses:
  over-engineered steps, assumptions baked in from this repo, and personal preferences
  treated as universal rules. Output flagged spots with a recommendation each — keep,
  make optional, or drop. Fixing is separate tasks.

  **Findings:**
  - DROP — the word "PRD" and the hardcoded spec path (frontmatter, Cycle, "PRD structure"). Both assume this repo's vocabulary and folder layout; a stranger's spec lives elsewhere and isn't called a PRD. Already tracked by PRJ-069 (spec directory rename) and PRJ-070 (replace "PRD" → "spec" in the skills) — no new task needed.
  - KEEP — everything else: spec-before-code cycle, spec-doubles-as-manual premise, the `**Implemented:**` journaling, new-section-vs-update rule, the `# Tasks` boundary, the kettle example. That is the method itself, not over-fit, and assumes no specific repo or harness.
  - No over-engineering in sdd itself — the heavy multi-step machinery lives in the mdtask-do skill, out of scope here.

- [x] PRJ-074 Review the mdtask skill for over-fit and over-engineering
  Same review, applied to the mdtask skill (the task-format reference).

  **Implemented:**
  - Reviewed the `mdtask` skill with GPT, DeepSeek V4, and GLM-5.1 reviewers.
  - `mdtask` now uses neutral `EXMPL-*` ID examples instead of project prefixes.
  - The `.mdtaskrc` example keeps the project-standard `docs/specs` path and hides example prefixes.
  - Task-body guidance now separates lightweight TODOs from agent handoff/spec work and allows accepted implementation constraints.
  - Parsing hints are now framed as advanced tooling reference with CLI-first guidance.

- [x] PRJ-075 Review the mdtask-create skill for over-fit and over-engineering
  Same review, applied to the mdtask-create skill.

  **Implemented:**
  - Reviewed `mdtask-create` with DeepSeek, Mimo, Minimax, and Claude.
  - Removed repo-specific spec names, dev-only `pnpm mdtask` commands, and the hardcoded `— mdtask` new-spec title.
  - New spec guidance now follows the project's configured spec directory.
  - Commit prompting is now conditional on the project's task-change workflow.

- [x] PRJ-076 Review the mdtask-do skill for over-fit and over-engineering
  Over-fit execution workflow rules are separated from portable task-running behavior.

  Same review, applied to the mdtask-do skill.

  **Findings:**
  - MAKE OPTIONAL — harness-specific checklist tooling: keep the visible tracked checklist rule, but make `ToolSearch`, `TaskCreate`, `TaskList`, and `./tmp` storage harness-specific details.
  - MAKE OPTIONAL — reviewer discovery and fallback mechanics: keep configured plan/code review, but treat `AGENTS.md` / `CLAUDE.md`, subagents, and warning wording as harness policy.
  - MAKE OPTIONAL — validation policy: keep behavior-focused checks, but make test-first, anti-snapshot, repeated external review, and final full validation project-configurable.
  - MAKE OPTIONAL — SDD-specific spec updates: keep recording task completion, but make the two-place feature prose plus task-body update apply only to projects using SDD specs.
  - DROP — direct `sdd` skill cross-reference: it assumes a sibling skill exists for external users; portable guidance should inline or link only when the project ships that skill.
  - KEEP / MAKE OPTIONAL — park-it workflow: keep stopping on human decisions and preserving resume context, but make `#user-required`, note shape, commit requirement, and manual tag-removal details project policy.

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

- [x] PRJ-079 Re-run code review after review fixes, until it's clean
  Final review coverage includes follow-up fixes, so the reviewed implementation diff matches what ships.

  When code review finds problems and they get fixed, the task is committed without running
  review again — so the fixed version is never reviewed. Result wanted: after each round of
  review fixes, code review runs again, and the task is committed only once review has no
  remaining issues.

  **Implemented:**
  - Code review now repeats when safe technical fixes change the implementation diff.
  - Review-fix rounds rerun relevant validation and behavior checks before the next review.
  - The loop stops only when the latest review has no remaining actionable findings.
  - Commit now requires a clean latest implementation review or a valid fast/`#noqa` skip.

- [x] PRJ-080 Skill should require tasks to state the result, not invented steps
  Nothing in the task-creation guidance separates a task's outcome from its implementation,
  so tasks drift into agent-invented step-by-step recipes. Result wanted: the mdtask-create
  skill, and the sdd "What goes in a task" guidance, make the rule explicit — a task states
  what should be true when it's done. Concrete steps or details belong in a task only when
  they record a decision the user made or a real constraint confirmed with the user, never
  implementation the agent invented on its own.

  **Implemented:**
  - "How to write a task" now has one source — the `mdtask` skill's `## Task Body` — defined operationally: Include (Context, Outcome, Constraints, Acceptance Criteria), Leave out (single-implementation approaches and invented step recipes).
  - The rule is explicit: a detail belongs only if a future implementer would decide differently without it — decisions and constraints stay, invented steps go.
  - `sdd` and `mdtask-create` now point at that single source instead of restating it. Consolidated into `mdtask` rather than split across mdtask-create and sdd as this task originally guessed.

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

- [x] PRJ-082 Require behavior check in mdtask-do
  Normal `mdtask-do` runs prove the changed behavior before the task can close.

  `mdtask-do` now lets agents finish with tests, lint, and `mdtask validate`.
  That is not enough when the task changes real behavior: tests can pass while
  the CLI command, UI flow, API call, or integration still fails for the user.

  Result wanted: every normal `mdtask-do` run plans and runs a real behavior check
  for the change: local command, stage flow, API call, UI path, or another realistic
  use case.

  Acceptance:
  - The plan says how the behavior will be checked.
  - Plan review checks whether that proof matches the requested result.
  - After all tests pass, the agent runs the behavior check and reports the result.
  - If the check fails, the agent fixes the issue and re-checks before proceeding.
  - If it cannot run one, the plan says why and what evidence replaces it.
  - #noqa skips the plan review of the behavior check but not the check itself.
  - Fast mode skips the behavior check (no plan, no review).

  **Implemented:**
  - Normal runs now require the plan to name a realistic behavior check or replacement evidence.
  - Plan review now checks whether the planned behavior proof matches the requested result.
  - After tests and lint pass, normal runs execute the planned behavior check and re-run it after failures.
  - `#noqa` still runs the behavior check, while fast mode skips it with the rest of the lightweight path.

- [ ] PRJ-083 Rename `mdtask-create` to `mdtask-add`
  The task-creation workflow currently lives in `mdtask-create`. `mdtask-add` reads closer to the user action: adding a task to the project backlog, and pairs with `mdtask-do`.

  Keep the three-skill split: `mdtask` stays the format/CLI reference, `mdtask-add` is the add-task workflow, and `mdtask-do` is the execute-task workflow. This task is a rename and trigger cleanup, not a merge into one large `mdtask` skill.

  DoD:
  - the skill directory and frontmatter use `mdtask-add` as the primary name
  - `mdtask` no longer claims add/create-task triggers that belong to `mdtask-add`
  - install paths, package scripts, tests, README, AGENTS, active specs/docs, and website references point users at the new name
  - users no longer see `mdtask-create` as the preferred skill name
  - historical implemented notes may keep the old name when they describe past work

- [ ] PRJ-085 Merge sdd skill into mdtask skill
  The sdd skill defines a three-step cycle (spec → build → document) and spec file structure
  (feature description above `# Tasks`). It is separate from the mdtask skill, which defines
  task format. Three skills for task work (mdtask, mdtask-create, sdd) causes agents to skip
  cross-references.

  DoD:
  - mdtask skill includes the sdd cycle and spec structure
  - sdd skill is removed
  - all references to sdd skill updated to point to mdtask
