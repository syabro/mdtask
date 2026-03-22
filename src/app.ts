const COMMANDS = ['list', 'view', 'done', 'open', 'move', 'validate'] as const;

type Command = (typeof COMMANDS)[number];

function printHelp(): void {
	process.stdout.write(`mdtask — File-first markdown task system

Usage: mdtask <command> [options]

Commands:
  list              List tasks
  view <ID>         View task details
  done <ID>         Toggle task done/open
  open <ID>         Open task in $EDITOR
  move <ID> <file>  Move task to another file
  validate          Check task integrity

Options:
  --help, -h        Show this help
  mdtask <cmd> -h   Show command help
`);
}

const COMMAND_HELP: Record<Command, string> = {
	list: `Usage: mdtask list [options] [#tag] [!priority]

List tasks. By default shows open tasks only.

Options:
  --all             Show all tasks including done
  --sort=priority   Sort by priority (crit > high > med > low)

Filters:
  #tag              Filter by tag
  !priority         Filter by priority (crit, high, med, low)
`,
	view: `Usage: mdtask view <ID>

Print full task block by ID.
`,
	done: `Usage: mdtask done <ID>

Toggle task checkbox: [ ] → [x] or [x] → [ ].
File modified in-place.
`,
	open: `Usage: mdtask open <ID>

Open file with task in $EDITOR at task line.
`,
	move: `Usage: mdtask move <ID> <file>

Move task to another file. Creates target file if it doesn't exist.
`,
	validate: `Usage: mdtask validate

Check task integrity:
  - ID uniqueness across all files
  - empty tags, malformed metadata
`,
};

function handleCommand(cmd: Command, _args: string[]): number {
	process.stderr.write(`mdtask: command '${cmd}' is not implemented yet\n`);
	return 1;
}

export function run(args: string[]): number {
	if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
		printHelp();
		return 0;
	}

	const cmd = args[0];

	if (!(COMMANDS as readonly string[]).includes(cmd)) {
		process.stderr.write(`mdtask: unknown command '${cmd}'\n`);
		process.stderr.write(`Run 'mdtask --help' for usage.\n`);
		return 1;
	}

	if (args.includes('--help') || args.includes('-h')) {
		process.stdout.write(COMMAND_HELP[cmd as Command]);
		return 0;
	}

	return handleCommand(cmd as Command, args.slice(1));
}
