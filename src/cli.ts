import { execFileSync } from 'node:child_process';
import {
	accessSync,
	constants,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CAC } from 'cac';
import p from 'picocolors';
import { type FilesConfig, loadConfig, resolveSearchPath } from './config.js';
import { findMarkdownFiles } from './files.js';
import {
	collectTaskBody,
	PRIORITY_REGEX,
	parseMetadata,
	parseTaskHeader,
	type Task,
	VALID_PRIORITIES,
} from './task.js';

function collectTasks(searchPath?: string, filesConfig?: FilesConfig): Task[] {
	const files = findMarkdownFiles({
		searchPath,
		includePatterns: filesConfig?.include,
		excludePatterns: filesConfig?.exclude,
	});
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

	const basePart = `${statusStr} ${task.id} ${task.title}${priorityStr ? ` ${priorityStr}` : ''}`;

	if (task.status === 'done' && isTTY) {
		// Apply gray to base parts, append colored blockers separately to avoid nesting issues,
		// then append properties in gray
		const grayProps = propsSuffix ? p.gray(propsSuffix) : '';
		return p.gray(basePart) + blockedBySuffix + grayProps;
	}

	return `${basePart}${blockedBySuffix}${propsSuffix}`;
}

function handleView(id: string, options: { path?: string }): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);
	const task = tasks.find((t) => t.id === id);

	if (!task) {
		process.stderr.write(`mdtask: task '${id}' not found\n`);
		process.exit(1);
		return;
	}

	const content = readFileSync(task.filePath, 'utf-8');
	const lines = content.split('\n');
	const headerLine = lines[task.lineNumber - 1];
	const body = collectTaskBody(lines, task.lineNumber - 1);

	process.stdout.write(`${headerLine}\n`);
	if (body) {
		process.stdout.write(`${body}\n`);
	}
}

function handleDone(id: string, options: { path?: string }): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);
	const matches = tasks.filter((t) => t.id === id);

	if (matches.length === 0) {
		process.stderr.write(`mdtask: task '${id}' not found\n`);
		process.exit(1);
		return;
	}

	if (matches.length > 1) {
		process.stderr.write(`mdtask: duplicate ID '${id}'\n`);
		process.exit(1);
		return;
	}

	const task = matches[0];
	const content = readFileSync(task.filePath, 'utf-8');
	const lines = content.split('\n');
	const line = lines[task.lineNumber - 1];

	if (!line.includes(task.id)) {
		process.stderr.write(
			`mdtask: file changed, task '${id}' not at expected line\n`,
		);
		process.exit(1);
		return;
	}

	if (task.status === 'open') {
		lines[task.lineNumber - 1] = line.replace(/^(- )\[ \]/, '$1[x]');
	} else {
		lines[task.lineNumber - 1] = line.replace(/^(- )\[x\]/, '$1[ ]');
	}

	writeFileSync(task.filePath, lines.join('\n'));
}

function handleMove(
	id: string,
	targetFile: string,
	options: { path?: string },
): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);
	const matches = tasks.filter((t) => t.id === id);

	if (matches.length === 0) {
		process.stderr.write(`mdtask: task '${id}' not found\n`);
		process.exit(1);
		return;
	}

	if (matches.length > 1) {
		process.stderr.write(`mdtask: duplicate ID '${id}'\n`);
		process.exit(1);
		return;
	}

	const task = matches[0];
	const resolvedTarget = resolve(targetFile);

	// Compare real paths to handle symlinks (e.g. /tmp → /private/tmp on macOS)
	const realSource = realpathSync(task.filePath);
	const realTarget = existsSync(resolvedTarget)
		? realpathSync(resolvedTarget)
		: resolvedTarget;
	if (realSource === realTarget) {
		return;
	}

	const content = readFileSync(task.filePath, 'utf-8');
	const lines = content.split('\n');
	const headerIndex = task.lineNumber - 1;
	const line = lines[headerIndex];

	if (!line.includes(task.id)) {
		process.stderr.write(
			`mdtask: file changed, task '${id}' not at expected line\n`,
		);
		process.exit(1);
		return;
	}

	// Collect block range: header + indented/empty body lines
	let endIndex = headerIndex + 1;
	while (endIndex < lines.length) {
		const currentLine = lines[endIndex];
		if (currentLine.trim() === '') {
			endIndex++;
			continue;
		}
		if (!currentLine.startsWith(' ')) {
			break;
		}
		endIndex++;
	}

	// Trim trailing empty lines from block
	let blockEnd = endIndex;
	while (blockEnd > headerIndex + 1 && lines[blockEnd - 1].trim() === '') {
		blockEnd--;
	}

	const blockLines = lines.slice(headerIndex, blockEnd);

	// Pre-check: source must be writable
	try {
		accessSync(task.filePath, constants.W_OK);
	} catch {
		process.stderr.write(
			`mdtask: cannot write to '${task.filePath}': permission denied\n`,
		);
		process.exit(1);
		return;
	}

	// Pre-check: target must not be a directory
	if (existsSync(resolvedTarget)) {
		if (statSync(resolvedTarget).isDirectory()) {
			process.stderr.write(`mdtask: '${resolvedTarget}' is a directory\n`);
			process.exit(1);
			return;
		}
		try {
			accessSync(resolvedTarget, constants.W_OK);
		} catch {
			process.stderr.write(
				`mdtask: cannot write to '${resolvedTarget}': permission denied\n`,
			);
			process.exit(1);
			return;
		}
	} else {
		// Ensure parent directories exist
		mkdirSync(dirname(resolvedTarget), { recursive: true });
	}

	// Write target first (safer: avoids data loss if target write fails)
	let targetContent = '';
	if (existsSync(resolvedTarget)) {
		targetContent = readFileSync(resolvedTarget, 'utf-8');
	}

	if (targetContent.length > 0 && !targetContent.endsWith('\n')) {
		targetContent += '\n';
	}
	if (targetContent.length > 0) {
		targetContent += '\n';
	}

	targetContent += `${blockLines.join('\n')}\n`;
	writeFileSync(resolvedTarget, targetContent);

	// Remove block from source
	lines.splice(headerIndex, blockEnd - headerIndex);
	writeFileSync(task.filePath, lines.join('\n'));
}

function handleOpen(id: string, options: { path?: string }): void {
	const editor = process.env.EDITOR;
	if (!editor) {
		process.stderr.write('mdtask: $EDITOR is not set\n');
		process.exit(1);
		return;
	}

	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);
	const task = tasks.find((t) => t.id === id);

	if (!task) {
		process.stderr.write(`mdtask: task '${id}' not found\n`);
		process.exit(1);
		return;
	}

	execFileSync(editor, [`+${task.lineNumber}`, task.filePath], {
		stdio: 'inherit',
	});
}

const EMPTY_TAG_REGEX = /(?:^|\s)#(?:\s|$)/;
const MALFORMED_PROPERTY_REGEX = /(?:^|\s)@([\w-]+)(?![:\w])/;

function handleValidate(options: { path?: string }): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);

	let hasErrors = false;

	// Check duplicate IDs
	const idMap = new Map<string, Task[]>();
	for (const task of tasks) {
		const existing = idMap.get(task.id) ?? [];
		existing.push(task);
		idMap.set(task.id, existing);
	}

	for (const [id, dupes] of idMap) {
		if (dupes.length > 1) {
			hasErrors = true;
			const locations = dupes
				.map((t) => `${t.filePath}:${t.lineNumber}`)
				.join(', ');
			process.stderr.write(`error: duplicate ID '${id}' in ${locations}\n`);
		}
	}

	// Check empty tags and malformed metadata
	for (const task of tasks) {
		const raw = task.rawMetadata;

		if (EMPTY_TAG_REGEX.test(raw)) {
			process.stderr.write(
				`warning: empty tag in ${task.filePath}:${task.lineNumber} (${task.id})\n`,
			);
		}

		if (MALFORMED_PROPERTY_REGEX.test(raw)) {
			process.stderr.write(
				`warning: malformed metadata in ${task.filePath}:${task.lineNumber} (${task.id})\n`,
			);
		}

		for (const match of raw.matchAll(PRIORITY_REGEX)) {
			if (!VALID_PRIORITIES.has(match[1])) {
				process.stderr.write(
					`warning: unknown priority !${match[1]} in ${task.filePath}:${task.lineNumber} (${task.id})\n`,
				);
			}
		}
	}

	if (hasErrors) {
		process.exit(1);
		return;
	}
}

const PRIORITY_WEIGHT: Record<string, number> = {
	crit: 0,
	high: 1,
	low: 3,
};
const DEFAULT_PRIORITY_WEIGHT = 2; // medium (no priority)

function sortByPriority(tasks: Task[]): Task[] {
	return [...tasks].sort((a, b) => {
		const wa = a.priority
			? (PRIORITY_WEIGHT[a.priority] ?? DEFAULT_PRIORITY_WEIGHT)
			: DEFAULT_PRIORITY_WEIGHT;
		const wb = b.priority
			? (PRIORITY_WEIGHT[b.priority] ?? DEFAULT_PRIORITY_WEIGHT)
			: DEFAULT_PRIORITY_WEIGHT;
		return wa - wb;
	});
}

function handleList(
	filters: string[],
	options: {
		all?: boolean;
		sort?: string;
		path?: string;
	},
): void {
	const config = loadConfig();
	const searchPath = resolveSearchPath(options.path, config);
	const tasks = collectTasks(searchPath, config?.files);
	const statusMap = new Map(tasks.map((t) => [t.id, t.status]));
	const isTTY = process.stdout.isTTY ?? false;

	const tagFilters = filters.filter((f) => f.startsWith('#'));
	const priorityFilters = filters
		.filter((f) => f.startsWith('!'))
		.map((f) => f.slice(1));

	let filteredTasks = options.all
		? tasks
		: tasks.filter((t) => t.status === 'open');

	if (tagFilters.length > 0) {
		filteredTasks = filteredTasks.filter((t) =>
			tagFilters.every((tag) => t.tags.includes(tag)),
		);
	}

	if (priorityFilters.length > 0) {
		filteredTasks = filteredTasks.filter(
			(t) => t.priority !== null && priorityFilters.includes(t.priority),
		);
	}

	if (options.sort === 'priority') {
		filteredTasks = sortByPriority(filteredTasks);
	}

	for (const task of filteredTasks) {
		process.stdout.write(`${formatTaskLine(task, statusMap, isTTY)}\n`);
	}
}

export function run(args: string[]): number {
	const cli = new CAC('mdtask');

	cli.option('--path <path>', 'Search path for tasks (default: .)');

	cli
		.command('list [...filters]', 'List tasks')
		.option('--all', 'Show all tasks including done')
		.option('--sort <field>', 'Sort tasks (e.g. --sort=priority)')
		.action((filters: string[], options) => {
			handleList(filters, options);
		});

	cli.command('view <id>', 'View task details').action((id, options) => {
		handleView(id, options);
	});

	cli.command('done <id>', 'Toggle task done/open').action((id, options) => {
		handleDone(id, options);
	});

	cli.command('open <id>', 'Open task in $EDITOR').action((id, options) => {
		handleOpen(id, options);
	});

	cli
		.command('move <id> <file>', 'Move task to another file')
		.action((id, file, options) => {
			handleMove(id, file, options);
		});

	cli.command('validate', 'Check task integrity').action((options) => {
		handleValidate(options);
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
