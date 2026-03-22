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
  --help            Show this help
`);
}

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

	return handleCommand(cmd as Command, args.slice(1));
}
