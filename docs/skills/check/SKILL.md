---
name: check
description: Verify consistency across all project docs, specs, and the mdtask skill — run before committing doc changes
disable-model-invocation: false
---

# /check — Consistency check

Runs `agy` (Gemini 3.5 Flash, high effort) as a **read-only** reviewer to find contradictions across project files.

## Execution

`agy` reads files with its own tools — no `@` includes needed. Run it read-only (never pass `--dangerously-skip-permissions`):

```bash
agy --print-timeout 9m -p "$(cat <<'EOF'
You are a READ-ONLY documentation consistency reviewer for this project. Work in the current directory. Do NOT edit, create, or delete any file — only read and report. If you want to fix something, describe the fix in text instead of applying it.

Read first: README.md, AGENTS.md (CLAUDE.md is a symlink to it), docs/skills/sdd/SKILL.md. Then read the rest of the docs and skill files under docs/. Skip: .git/, .claude/, node_modules/, dist/.

Check docs against each other and against the CLI/code. Find any inconsistency — contradictions, stale references, outdated paths, missing entries, mismatched terminology. Do NOT check code against code.

References inside the body of a COMPLETED task (a block starting with "- [x]") are historical records — list them under a separate "History (informational)" heading, not as blocker/warning.

For each finding:
- <description>  !blocker | !warning | !nit
  file:line  (e.g. README.md:7, cli.md:3)
  proposed fix

Severities: !blocker (blocks merge), !warning (should fix), !nit (cosmetic).
End with a one-line verdict. If no live issues: "All live docs consistent."
EOF
)"
```

After it finishes, run `git status` to confirm `agy` edited nothing.

## Output

Step 1 — Present agy's results as a list. For each finding:
- Show the full finding with context (do NOT shorten or summarize)
- Add your own commentary: what it means, why it matters
- Add your proposed action: what to fix and how

Step 2 — Ask one question per finding via "Ask a User Question". Include severity, full context, commentary, proposed action, and options. After each answer, add a todo only if the resolution is to fix. One answer = one resolution = one todo.

If the user has follow-up questions or needs clarification — continue asking and researching until each finding has a clear resolution: fix (and how) or don't fix.

Exception: if the user said "no questions", skip Step 2 — fix warnings and blockers, skip nits.

Step 3 — After all findings are resolved, apply fixes from todos and commit.

If no issues: "All docs consistent."
