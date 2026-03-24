import { readFileSync } from 'node:fs';
import { CAC } from 'cac';
import p from 'picocolors';
import { loadConfig, resolveSearchPath } from './config.js';
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

function formatPriority(priority: Task['priority'], isTTY: boolean): string {
	if (!priority) return '';

	const priorityStr = `!${priority}`;
	if (!isTTY) return priorityStr;

	switch (priority) {
		case 'crit':
			return p.red(priorityStr);
		case 'high':
			return p.yellow(priorityStr);
		case 'low':
			return p.green(priorityStr);
		default:
			return priorityStr;
	}
}

function formatBlocker(id: string, isTTY: boolean): string {
	const text = `@blocked_by:${id}`;
	if (!isTTY) return text;
	return p.red(text);
}

function formatProperties(properties: Record<string, string[]>): string {
	const tokens: string[] = [];
	const keys = Object.keys(properties)
		.filter((k) => k !== 'blocked_by')
		.sort();
	for (const key of keys) {
		for (const value of properties[key]) {
			tokens.push(`@${key}:${value}`);
		}
	}
	return tokens.join(' ');
}

function formatTaskLine(
	task: Task,
	statusMap: Map<string, Task['status']>,
	isTTY: boolean,
): string {
	const statusStr = task.status === 'done' ? '[x]' : '[ ]';
	// Disable priority coloring for done tasks to avoid ANSI reset breaking gray wrapper
	const priorityStr = formatPriority(
		task.priority,
		task.status === 'done' ? false : isTTY,
	);
	const blockedByIds = (task.properties.blocked_by ?? []).filter(
		(id) => statusMap.get(id) !== 'done',
	);
	const blockedByStr = blockedByIds
		.map((id) => formatBlocker(id, isTTY))
		.join(' ');
	const blockedBySuffix = blockedByStr ? ` ${blockedByStr}` : '';
	const propsStr = formatProperties(task.properties);
	const propsSuffix = propsStr ? ` ${propsStr}` : '';

	if (task.status === 'done') {
		// Apply gray to base parts, append colored blockers separately to avoid nesting issues,
		// then append properties in gray
		const basePart = `${statusStr} ${task.id} ${task.title}${priorityStr ? ` ${priorityStr}` : ''}`;
		const grayProps = propsSuffix ? p.gray(propsSuffix) : '';
		return p.gray(basePart) + blockedBySuffix + grayProps;
	}

	return `${statusStr} ${task.id} ${task.title}${priorityStr ? ` ${priorityStr}` : ''}${blockedBySuffix}${propsSuffix}`;
}

function handleList(options: { all?: boolean; path?: string }): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath);
	const statusMap = new Map(tasks.map((t) => [t.id, t.status]));
	const isTTY = process.stdout.isTTY ?? false;

	const filteredTasks = options.all
		? tasks
		: tasks.filter((t) => t.status === 'open');

	for (const task of filteredTasks) {
		process.stdout.write(`${formatTaskLine(task, statusMap, isTTY)}\n`);
	}
}

export function run(args: string[]): number {
	const cli = new CAC('mdtask');

	cli.option('--path <path>', 'Search path for tasks (default: .)');

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
