import { readFileSync } from 'node:fs';
import { findMarkdownFiles } from './files.js';
import { parseMetadata, parseTaskHeader, type Task } from './task.js';

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
	list: `Usage: mdtask list [options]

List tasks. By default shows open tasks only.

Options:
  --all             Show all tasks including done
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

function collectTasks(searchPath?: string): Task[] {
	const files = findMarkdownFiles(searchPath ? { searchPath } : undefined);
	const tasks: Task[] = [];

	for (const filePath of files) {
		try {
			const content = readFileSync(filePath, 'utf-8');
			const lines = content.split('\n');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const header = parseTaskHeader(line);
				if (header) {
					const metadata = parseMetadata(header.rawMetadata);
					tasks.push({
						status: header.status,
						id: header.id,
						title: header.title,
						rawMetadata: header.rawMetadata,
						tags: metadata.tags,
						priority: metadata.priority,
						properties: metadata.properties,
						filePath,
						lineNumber: i + 1,
					});
				}
			}
		} catch (err) {
			process.stderr.write(
				`mdtask: warning: could not read ${filePath}: ${err}\n`,
			);
		}
	}

	return tasks;
}

const COLORS = {
	reset: '\u001b[0m',
	red: '\u001b[31m',
	yellow: '\u001b[33m',
	green: '\u001b[32m',
	gray: '\u001b[90m',
};

function formatPriority(priority: Task['priority'], useColor: boolean): string {
	if (!priority) return '';

	if (!useColor) return `!${priority}`;

	switch (priority) {
		case 'crit':
			return `${COLORS.red}!crit${COLORS.reset}`;
		case 'high':
			return `${COLORS.yellow}!high${COLORS.reset}`;
		case 'low':
			return `${COLORS.green}!low${COLORS.reset}`;
		default:
			return `!${priority}`;
	}
}

function formatTaskLine(task: Task, useColor: boolean): string {
	const statusStr = task.status === 'done' ? '[x]' : '[ ]';
	const priorityStr = formatPriority(task.priority, useColor);

	if (useColor && task.status === 'done') {
		return `${COLORS.gray}${statusStr} ${task.id}${priorityStr ? ` ${priorityStr}` : ''} ${task.title}${COLORS.reset}`;
	}

	return `${statusStr} ${task.id}${priorityStr ? ` ${priorityStr}` : ''} ${task.title}`;
}

function handleList(args: string[]): number {
	const showAll = args.includes('--all');
	const useColor = process.stdout.isTTY === true;

	const tasks = collectTasks();

	const filteredTasks = showAll
		? tasks
		: tasks.filter((t) => t.status === 'open');

	for (const task of filteredTasks) {
		process.stdout.write(`${formatTaskLine(task, useColor)}\n`);
	}

	return 0;
}

function handleCommand(cmd: Command, args: string[]): number {
	switch (cmd) {
		case 'list':
			return handleList(args);
		default:
			process.stderr.write(`mdtask: command '${cmd}' is not implemented yet\n`);
			return 1;
	}
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
