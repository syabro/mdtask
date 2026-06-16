---
name: sdd
description: Spec-driven development workflow for projects that use spec files as both product spec and manual. Use when writing specs, implementing tasks from specs, or updating docs after code changes.
disable-model-invocation: false
---

# Spec-Driven Development

No code without a spec. The spec is both the blueprint for the work and the manual for the result.

## Cycle

1. **Spec** — describe what needs to be built as a task in a spec file (`docs/specs/*.md`)
2. **Build** — implement the task
3. **Document** — after the task is done:
   - Mark the task `[x]` and add `**Implemented:**` bullets inside the task body
   - Update the feature description above `# Tasks` based on what was implemented

## Spec structure

Each spec file has two parts:

1. **Feature description** (top) — what the product does, how to use it
2. **Task journal** (bottom) — starts with `# Tasks`; story groups under it use `##` headings

The feature description is the manual.
A reader should understand what's available and how to use it without reading the tasks.

## Example

Imagine building a smart kettle app.

### Step 1 — Spec

We start by creating a spec file with tasks. No code yet, just the spec:

```markdown
# Brewing — Smart Kettle

Wi-Fi kettle with app control.

# Tasks

- [ ] KTL-001 Basic boiling with auto shut-off
  Heat to 100°C, beep on completion.
  Physical button and app trigger.
  Auto shut-off after timeout.

- [ ] KTL-002 Tea presets
  Predefined temperature + steep time for common tea types.
  Allow user-created custom presets.

- [ ] KTL-003 Schedule boiling
  Set a time for the kettle to start automatically.
  Morning routine: wake up to ready water.
```

No feature description yet — nothing is built.

### Step 2 — Build and document KTL-001

We implement boiling. After the task is done, two things happen:
1. The task gets marked `[x]` with an `**Implemented:**` block
2. A feature description appears above `# Tasks`

```markdown
# Brewing — Smart Kettle

Wi-Fi kettle with app control.

## Boiling

Tap "Boil" in the app or press the physical button. Heats water to 100°C,
beeps when done. Auto shut-off after 5 minutes.

# Tasks

- [x] KTL-001 Basic boiling with auto shut-off
  Heat to 100°C, beep on completion.
  Physical button and app trigger.
  Auto shut-off after timeout.

  **Implemented:**
  - Heats to 100°C with ±1° accuracy
  - Dual trigger: hardware button and app "Boil" command
  - Auto shut-off after 5 minutes of inactivity

- [ ] KTL-002 Tea presets
  ...

- [ ] KTL-003 Schedule boiling
  ...
```

### Step 3 — Build and document KTL-002

Tea presets is a different feature — it gets its own section:

```markdown
# Brewing — Smart Kettle

Wi-Fi kettle with app control.

## Boiling

Tap "Boil" in the app or press the physical button. Heats water to 100°C,
beeps when done. Auto shut-off after 5 minutes.

## Tea presets

Three built-in presets:
- Green tea — 75°C, 2 min steep reminder
- Black tea — 95°C, 4 min steep reminder
- Herbal — 100°C, 6 min steep reminder

Custom presets: Settings → Presets → Add. Set temperature (40–100°C)
and steep time (1–15 min).

# Tasks

- [x] KTL-001 Basic boiling with auto shut-off
  ...

- [x] KTL-002 Tea presets
  Predefined temperature + steep time for common tea types.
  Allow user-created custom presets.

  **Implemented:**
  - Three built-in presets (green, black, herbal)
  - Custom presets via Settings → Presets → Add
  - Temperature range 40–100°C, steep time 1–15 min

- [ ] KTL-003 Schedule boiling
  ...
```

KTL-003 is still open — no "Scheduling" section yet. It will appear when the task is done.

## When to create a new section vs update an existing one

- **New feature** → new section. KTL-001 created `## Boiling`, KTL-002 created `## Tea presets`.
- **Extends existing feature** → update the section. If a task added temperature selection to boiling, it would update `## Boiling`, not create a new section.

The rule: match the section to the feature, not to the task.

## What goes in a task

How to write a task — the format and what belongs in the body — lives in the `mdtask` skill, the single source. sdd adds only the rhythm: a task is the spec, written before the code, and documented once it's built (see the Cycle above).
