---
name: team
description: Create development team for mdtask with lead, dev, qa agents
disable-model-invocation: false
---

# /team - Create development team

Create team `mdtask` with agents for CLI/library development.

## Roles

Role definitions are in `.team/` folder:
- `.team/lead.md` - Tech Lead
- `.team/dev.md` - Developer (parser + CLI)
- `.team/qa.md` - QA

## Execution

1. Create team: `Teammate(operation: "spawnTeam", team_name: "mdtask")`

2. Read each role file from `.team/` folder

3. Spawn agents in parallel using Task tool:
   - `team_name: "mdtask"`
   - `name: "<role-name>"` (lead, dev, qa)
   - `prompt:` content from corresponding `.team/<role>.md` file
   - `run_in_background: true`
   - `allowed_tools: ["Write", "Read", "Edit", "Glob", "Grep", "Bash(rg *)", "Bash(bats *)", "Bash(chmod +x *)", "Bash(mkdir -p *)"]`

4. Confirm team is ready, list agents

5. Wait for user to assign work

## Shutdown

To shutdown team:
1. Send `requestShutdown` to each agent
2. After all confirm, run `Teammate(operation: "cleanup")`
