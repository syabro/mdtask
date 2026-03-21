# Post-MVP — MDTASK

Deferred features and improvements. Not blocking MVP.

## Search Scope

- [ ] POST-001 Limit search directory		#config
  Options:
  - flag `--path=./docs`
  - config `.mdtaskrc` with `search_paths`
  - env `MDTASK_PATH`

- [ ] POST-002 Filter by file extension		#config
  `MDTASK_EXTENSION=*.todo.md` — search only in files with specific extension.
  Default `*.md`.

## Exit Codes

- [ ] POST-010 Standardize exit codes		#cli
  - 0 — success
  - 1 — error (invalid arguments, IO error)
  - 2 — not found (task/file not found)

## Subtasks

- [ ] POST-020 Auto-complete parent task		#parser
  When all subtasks are `[x]`, automatically mark parent as done.
  Requires parsing subtasks in description block.

## Validation

- [ ] POST-030 Unknown priority tags		#parser
  Unknown `!` tags (not crit/high/low) — warning or ignore?
  Solution: parse any `!\w+`, validate in `mdtask validate` command.

- [ ] POST-031 Empty tag		#parser
  `# ` (hash + space) without tag name.
  Show warning in `mdtask validate`.

## Security

- [ ] POST-040 Shell injection protection		#security
  Check all places where user input reaches shell:
  - task ID in commands
  - file names
  - task content (on output)

  Use proper quoting, avoid eval.

## Edge Cases

- [ ] POST-050 move edge cases		#cli
  - move to same file — no-op or error?
  - move to read-only file — graceful error
  - move to non-existent file — create or error?
  - source file becomes empty — keep or delete?

- [ ] POST-051 Symlinks		#infra
  How to handle:
  - symlink to md file
  - symlink to directory
  - circular symlinks

  Solution: follow symlinks, but detect cycles.

## Testing

- [ ] POST-060 Mock $EDITOR in tests		#test
  Create mock-editor script:
  ```bash
  #!/bin/bash
  echo "$@" > /tmp/editor_args
  ```
  Verify that mdtask open passes correct arguments.
