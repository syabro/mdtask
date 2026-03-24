---
name: check
description: Verify consistency across all project docs, specs, and the mdtask skill — run before committing doc changes
disable-model-invocation: false
---

# /check — Consistency check

Runs two parallel reviewers to find contradictions across project files.

## Prompt

Both Subagent and Gemini use this exact prompt. Gemini needs `@` prefixes for file inclusion; Subagent ignores them.

```
Step 1: Read @README.md @CLAUDE.md (symlink to AGENTS.md, do not read AGENTS.md separately) @docs/spec-driven-development.md.
Step 2: Read @./ the rest of the project files. Skip: .git/, .claude/.
Step 3: Check docs against each other and against code. Find any inconsistency — contradictions, stale references, outdated paths, missing entries, mismatched terminology. Do NOT check code against code.

For each finding:
- <description> !blocker|!warning|!nit
  Reference file locations as `file:line` (e.g., `README.md:7`, `cli.md:3`).
  <proposed fix>

Severities: !blocker (blocks merge), !warning (should fix), !nit (cosmetic).
If no issues: "All docs consistent."
Research only — do NOT edit files.
```

## Execution

### Subagent

#### Claude Code — Launch an Agent (subagent_type: general-purpose)

#### opencode — Launch a subagent (subagent_type: general)

Pass the prompt above as the task description.

### Gemini

Load the gemini skill and pass the prompt above.

## Output

Step 1 — Combine and deduplicate results from both reviewers. Present as a list. For each finding:
- Show the full finding with context (do NOT shorten or summarize)
- Add your own commentary: what it means, why it matters
- Add your proposed action: what to fix and how

Step 2 — Ask one question per finding via "Ask a User Question". Include severity, full context, commentary, proposed action, and options. After each answer, add a todo only if the resolution is to fix. One answer = one resolution = one todo.

If the user has follow-up questions or needs clarification — continue asking and researching until each finding has a clear resolution: fix (and how) or don't fix.

Step 3 — After all findings are resolved, apply fixes from todos and commit.

If no issues: "All docs consistent."
