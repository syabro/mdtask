---
name: check
description: Verify consistency across all project docs, specs, and the mdtask skill — run before committing doc changes
disable-model-invocation: false
---

# /check - Integration consistency check

Run two parallel reviewers (General Agent + Gemini) to verify that all project documentation is consistent.

## Execution

Run these two checks **in parallel**:

### 1. General Agent

Launch an Agent (subagent_type: general-purpose) with this prompt:

> 1. Read CLAUDE.md and README.md to understand what this project is.
> 2. Explore the entire project — all files, not just markdown. Code, configs, scripts, skills, everything.
> 3. Compare everything against each other. Find any places where one source says X and another says Y.
> 4. Report every contradiction, inconsistency, or stale reference.
> 5. Classify each finding as: blocker (blocks merge), warning (should fix), or nit (cosmetic).
> This is research only — do NOT edit files.

### 2. Gemini

Run via `~/.claude/skills/gemini/gemini-readonly.sh` passing the whole project directory.
Gemini first reads the project to understand context, then compares everything.

```bash
~/.claude/skills/gemini/gemini-readonly.sh "@./ This is a project. First read CLAUDE.md and README.md to understand what it is. Then compare all files against each other — docs, code, configs, skills, everything. Find any places where one source contradicts or is inconsistent with another. Classify each finding as: blocker (blocks merge), warning (should fix), or nit (cosmetic)."
```

## Output

Combine and deduplicate results from both reviewers. Present each finding as a review item with your reply:

```
- <finding description> !blocker
  <your analysis and proposed fix>

- <finding description> !warning
  <your analysis and proposed fix>

- <finding description> !nit
  <your analysis and proposed fix>
```

Severities: **!blocker** (blocks merge), **!warning** (should fix), **!nit** (cosmetic).

If no issues found — report "All docs consistent."
