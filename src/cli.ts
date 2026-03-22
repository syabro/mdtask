import { readFileSync } from 'node:fs';
import { CAC } from 'cac';
import p from 'picocolors';
import { findMarkdownFiles } from './files.js';
import { parseMetadata, parseTaskHeader, type Task } from './task.js';

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

function formatPriority(priority: Task['priority']): string {
	if (!priority) return '';

	switch (priority) {
		case 'crit':
			return p.red('!crit');
		case 'high':
			return p.yellow('!high');
		case 'low':
			return p.green('!low');
		default:
			return `!${priority}`;
	}
}

function formatTaskLine(task: Task): string {
	const statusStr = task.status === 'done' ? '[x]' : '[ ]';
	const priorityStr = formatPriority(task.priority);

	if (task.status === 'done') {
		return p.gray(
			`${statusStr} ${task.id}${priorityStr ? ` ${priorityStr}` : ''} ${task.title}`,
		);
	}

	return `${statusStr} ${task.id}${priorityStr ? ` ${priorityStr}` : ''} ${task.title}`;
}

function handleList(options: { all?: boolean }): void {
	const tasks = collectTasks();

	const filteredTasks = options.all
		? tasks
		: tasks.filter((t) => t.status === 'open');

	for (const task of filteredTasks) {
		process.stdout.write(`${formatTaskLine(task)}\n`);
	}
}

export function run(args: string[]): number {
	const cli = new CAC('mdtask');

	cli
		.command('list', 'List tasks')
		.option('--all', 'Show all tasks including done')
		.action((options) => {
			handleList(options);
		});

	cli.command('view <id>', 'View task details').action(() => {
		process.stderr.write("mdtask: command 'view' is not implemented yet\n");
		process.exit(1);
	});

	cli.command('done <id>', 'Toggle task done/open').action(() => {
		process.stderr.write("mdtask: command 'done' is not implemented yet\n");
		process.exit(1);
	});

	cli.command('open <id>', 'Open task in $EDITOR').action(() => {
		process.stderr.write("mdtask: command 'open' is not implemented yet\n");
		process.exit(1);
	});

	cli.command('move <id> <file>', 'Move task to another file').action(() => {
		process.stderr.write("mdtask: command 'move' is not implemented yet\n");
		process.exit(1);
	});

	cli.command('validate', 'Check task integrity').action(() => {
		process.stderr.write("mdtask: command 'validate' is not implemented yet\n");
		process.exit(1);
	});

	cli.help();
	cli.version('0.1.0');

	try {
		cli.parse(['node', 'mdtask', ...args]);
		return 0;
	} catch (err) {
		process.stderr.write(`mdtask: ${err}\n`);
		return 1;
	}
}

// Auto-run when executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	const code = run(process.argv.slice(2));
	process.exit(code);
}
