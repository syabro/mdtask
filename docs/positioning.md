# mdtask — positioning

Source of truth for how mdtask is positioned and sold — governs the website, README, and
skills. Where a surface disagrees with this document, the surface is wrong.
Last updated: 2026-06-13.

---

## 1. What mdtask is

### 1.1 The problem

The spec (how the system works), the tasks (what's done and what's left), and the code
live in three disconnected places. The pain is in the gaps between them: the spec lags the
code, the tasks lag both, and you sync them by hand. Each gap already has a specialized
tool, so any single pain has a faster point solution — pitching one pain loses. mdtask
sells the seam: all three in one mechanism, in one file. Coding agents make the gaps
critical: the agent reads the stale spec as truth and builds on top of it.

### 1.2 One-liner

> mdtask — the spec-driven development system where specs and tasks live in your repo and
> never drift from the code.

### 1.3 Category

mdtask is a **spec-driven development system**. Not a framework, OS, toolkit, tracker, or
utility. Comparison set: Spec Kit and OpenSpec. Consequence for the copy: the CLI is not
the hero, and agents are mentioned softly.

### 1.4 Audience

Developers — solo and small teams — with a project in a repo. Skills are SKILL.md, loaded
by any agent harness — no Claude Code lock-in.

Mentioning agents is fine, even prominently. What we avoid is being **agent-first** — copy
written strictly for agents throughout. The line: mention is fine, "strictly for agents
everywhere" is not (the Hacker News audience is allergic to AI hype).

---

## 2. The model behind the promise

### 2.1 The unit

A spec is one Markdown file. The prose on top says what the system does and how to use it —
the manual. Below it, a tasks section holds the checkbox tasks — the backlog and the
history. A project has many spec files; together they are its backlog.

### 2.2 The cycle

The agent picks a task, builds it, and closes it in the same file: tick the checkbox, note
what was implemented, update the prose above to match. That edit ships in the same commit as
the code. The prose describes only what's done, so the spec stays a description of the
system as it actually is.

### 2.3 The layers

Three layers, kept separate on purpose:

- **CLI** — the format. Reads and edits the Markdown tasks; knows nothing about the method.
  No database, no server.
- **Skills** — the method. How an agent creates a task, and how it takes one task from pick
  to commit. This per-task cycle is the micro-loop.
- **The macro-loop** — driving the whole backlog. That's the agent's harness re-running the
  one-task skill until nothing is left. mdtask ships no macro-loop or orchestrator; the CLI
  contains no loop at all.

### 2.4 Guarantee vs convention

What the tool guarantees: the files are valid Markdown, tasks carry stable IDs, and the CLI
reads and edits them. What rests on the workflow — the agent following the skill — is that
closing a task updates the spec in the same commit. The tool doesn't enforce that. So the
no-drift promise is the workflow's doing, not the tool's (see 3.6).

---

## 3. How we sell it

### 3.1 Core message

The result: **specs don't drift from the code.** "One commit" is the proof mechanism
underneath it, not the headline.

### 3.2 Supporting claims

**1. Spec and tasks live in the same file.**
Closing a task is editing the spec — tick the box, update the prose above — one commit
alongside the code. Skip the spec update and it shows in the diff.

**2. Updating the spec is a workflow step, not a good intention.**
The skill walks the agent through it: plan, plan review, code with risk-based tests, code
review, spec update — then commit. It doesn't guess on judgment calls: it tags the task
`#user-required` with the open question and stops.

**3. You own your tasks, not a third-party SaaS.**
They're files in your git repo, next to the code.

**4. The CLI gives your files tracker features.**
Filter by tag and priority, find what's blocked, jump to a task by ID, check integrity,
archive done work — over plain Markdown, no database.

**5. Easy to use — just write the text.**
Add `- [ ] fix login` to any file and it's a task. Edit it like text, in any editor.

### 3.3 Versus spec frameworks (Spec Kit, OpenSpec)

Spec Kit and OpenSpec generate a separate folder of files per feature — a spec, a plan, a
task list — driven by their own commands. That folder is a second copy of the project's
intent, kept beside the code and synced to it by hand.

In mdtask the spec and its tasks are one file: the prose on top is the spec, the checkboxes
below are the tasks. Closing a task edits that same file in the same commit as the code, so
the spec stays in sync by construction.

### 3.4 Versus trackers (Jira, Linear, GitHub Issues)

**Easy to use.**
A tracker is a third-party system you set up, sign into, and configure before you can add a
task. In mdtask you write a line in a file that's already in your repo.

**Tasks are tied to commits and specs.**
In a tracker the task sits apart from the code, linked by an ID in the commit message — a
link kept by hand that rots over time. In mdtask a task closes in the same commit as the
code and the spec, so the link lives in git itself.

**You own your tasks, and they're free.**
A tracker keeps your tasks on its servers, usually for a per-seat fee. In mdtask the tasks
are files in your repo — yours, with nothing to pay.

### 3.5 Versus TODO.md

A flat checklist works until you need to find what's blocked, pull everything for one area,
or refer to a task by a stable ID. mdtask keeps the checklist in Markdown and adds IDs,
tags, priority, blockers, and CLI filtering — without turning it into a database.

A TODO.md is also a good starting point: mdtask picks up the checkboxes you already have and
assigns them IDs, so migrating is quick.

### 3.6 Alongside agent loops

mdtask runs the micro-loop: the `mdtask-next` skill takes one task from picked to built to
closed, with the code and the spec update in the same commit. Macro-loops — Ralph, GOAL-style
harness workflows — drive the whole backlog by repeating that step until it's empty. The
macro-loop calls mdtask's per-task loop; mdtask doesn't replace it.

### 3.7 Honest limits

**The one-commit rule is a convention, not a guarantee.**
mdtask doesn't check that the spec was updated when a task is closed — you can tick `[x]`
and leave the prose untouched. It rests on the agent following the skill, not on the tool
enforcing it.

**Judgment calls stop and wait for a human.**
When a task needs a decision only a person can make, mdtask parks it (`#user-required`) and
stops instead of guessing. This is deliberate, but it means there's no run-to-the-end
automation.

**Real-time team coordination isn't the target.**
Several people on one task, a live board, management dashboards — mdtask doesn't do that.
Parallel edits are resolved as ordinary text conflicts in git.

---

## 4. Terms

- The unit is a **spec** — a single Markdown file under **`docs/specs/`**.
- A **task** is a checkbox line inside a spec.
- We do not use "PRD" or `docs/prd/`. "spec" fits spec-driven development and reads better.

Migration note (not landing copy): "PRD" / `docs/prd/` are still wired into the shipped
skills, the README, and the `.mdtaskrc` default path. This decision requires migrating them
to "spec" / `docs/specs/` — tracked as separate mdtask tasks, not part of this document.
