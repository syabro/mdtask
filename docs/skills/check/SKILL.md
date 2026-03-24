---
name: check
description: Verify consistency across all project docs, specs, and the mdtask skill — run before committing doc changes
disable-model-invocation: false
---

# /check — Consistency check

Runs Gemini as reviewer to find contradictions **in changed files only**.

## Preparation

Before building the prompt, run `git diff --name-only HEAD` (unstaged + staged) to get the list of changed files. If nothing changed, stop — nothing to check.

## Prompt

Gemini needs `@` prefixes for file inclusion. Insert the actual changed file list into `CHANGED_FILES` below.

```
CHANGED FILES (only check consistency FOR these):
<list each changed file with @ prefix, one per line>

Step 1: Read @README.md @CLAUDE.md (symlink to AGENTS.md, do not read AGENTS.md separately) @docs/spec-driven-development.md.
Step 2: Read @./ the rest of the project files. Skip: .git/, .claude/.
Step 3: Check ONLY the changed files listed above against the rest of the project. Find inconsistencies — contradictions, stale references, outdated paths, missing entries, mismatched terminology — but ONLY if at least one side of the inconsistency is a changed file. Do NOT report issues between unchanged files. Do NOT check code against code.

For each finding:
- <description> !blocker|!warning|!nit
  Reference file locations as `file:line` (e.g., `README.md:7`, `cli.md:3`).
  <proposed fix>

Severities: !blocker (blocks merge), !warning (should fix), !nit (cosmetic).
If no issues: "All docs consistent."
Research only — do NOT edit files.
```

## Execution

### Claude Code

Load the gemini skill and pass the prompt above.

### opencode

Launch a subagent (subagent_type: general) with the prompt above, AND load the gemini skill with the prompt above. Run both in parallel.

## Output

Step 1 — Present Gemini's results as a list. For each finding:
- Show the full finding with context (do NOT shorten or summarize)
- Add your own commentary: what it means, why it matters
- Add your proposed action: what to fix and how

Step 2 — Ask one question per finding via "Ask a User Question". Include severity, full context, commentary, proposed action, and options. After each answer, add a todo only if the resolution is to fix. One answer = one resolution = one todo.

If the user has follow-up questions or needs clarification — continue asking and researching until each finding has a clear resolution: fix (and how) or don't fix.

Exception: if the user said "no questions", skip Step 2 — fix warnings and blockers, skip nits.

Step 3 — After all findings are resolved, apply fixes from todos and commit.

If no issues: "All docs consistent."
