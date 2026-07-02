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
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import * as rl from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { CAC } from 'cac';
import p from 'picocolors';
import {
	type Config,
	type FilesConfig,
	loadConfig,
	loadProjectConfig,
	resolveBasePath,
	resolveProjectBasePath,
} from './config.js';
import { findMarkdownFiles } from './files.js';
import {
	installSkills,
	localDepDir,
	refreshCacheIfStale,
	runningVersion,
	userCacheSkillsDir,
} from './skills.js';
import { formatTable, formatTaskValue } from './table.js';
import {
	collectTaskBody,
	computeFenceMask,
	extractNumericPart,
	extractPriorityTokens,
	findTaskBlockRange,
	hasUnresolvedBlockers,
	parseMetadata,
	parseTaskHeader,
	parseUnidentifiedTaskLine,
	resolveTaskId,
	TASK_ID_REGEX,
	type Task,
	type TaskStatus,
	type UnidentifiedTask,
	unresolvedBlockerIds,
	VALID_PRIORITIES,
} from './task.js';

function readFileTasks(file: string, excluded?: string[]): Task[] {
	const content = readFileSync(file, 'utf-8');
	const lines = content.split('\n');
	const mask = computeFenceMask(lines);
	const tasks: Task[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (mask[i]) continue;
		const line = lines[i];
		const header = parseTaskHeader(line);
		if (header) {
			if (excluded?.some((prefix) => header.id.startsWith(prefix))) {
				continue;
			}
			const metadata = parseMetadata(header.rawMetadata);
			const body = collectTaskBody(lines, i);
			tasks.push({
				status: header.status,
				id: header.id,
				title: header.title,
				rawMetadata: header.rawMetadata,
				value: body.split('\n')[0]?.trim() ?? '',
				tags: metadata.tags,
				priority: metadata.priority,
				properties: metadata.properties,
				filePath: file,
				lineNumber: i + 1,
			});
		}
	}

	return tasks;
}

function taskFiles(basePath?: string, filesConfig?: FilesConfig): string[] {
	const includePatterns = filesConfig?.include;
	const excludePatterns = filesConfig?.exclude;
	return findMarkdownFiles({ basePath, includePatterns, excludePatterns });
}

function collectTasks(
	basePath?: string,
	filesConfig?: FilesConfig,
	excludePrefixes?: string[],
): Task[] {
	const files = taskFiles(basePath, filesConfig);
	const tasks: Task[] = [];

	for (const filePath of files) {
		try {
			tasks.push(...readFileTasks(filePath, excludePrefixes));
		} catch (err) {
			process.stderr.write(
				`mdtask: warning: could not read ${filePath}: ${err}\n`,
			);
		}
	}

	return tasks;
}

function existingPathFile(pathOption: string | undefined): string | null {
	if (pathOption === undefined || pathOption === '') return null;

	const resolvedPath = resolve(pathOption);
	try {
		return statSync(resolvedPath).isFile() ? realpathSync(resolvedPath) : null;
	} catch {
		return null;
	}
}

function pathConfigContext(pathOption: string | undefined): {
	config: Config | null;
	root?: string;
} {
	const filePath = existingPathFile(pathOption);
	if (!filePath) return { config: loadConfig() };

	const project = loadProjectConfig(dirname(filePath));
	return { config: project.config, root: project.root };
}

function taskSearchContext(pathOption: string | undefined): {
	config: Config | null;
	basePath: string;
} {
	const filePath = existingPathFile(pathOption);
	if (!filePath) {
		const config = loadConfig();
		return { config, basePath: resolveBasePath(pathOption, config) };
	}

	const project = loadProjectConfig(dirname(filePath));
	return {
		config: project.config,
		basePath: resolveProjectBasePath(project.config, project.root),
	};
}

type UnidentifiedTaskLocation = {
	status: Task['status'];
	title: string;
	filePath: string;
	lineNumber: number;
};

function collectUnidentifiedTasks(
	basePath?: string,
	filesConfig?: FilesConfig,
	excludePrefixes?: string[],
): UnidentifiedTaskLocation[] {
	const files = findMarkdownFiles({
		basePath,
		includePatterns: filesConfig?.include,
		excludePatterns: filesConfig?.exclude,
	});
	const result: UnidentifiedTaskLocation[] = [];

	for (const filePath of files) {
		try {
			const content = readFileSync(filePath, 'utf-8');
			const lines = content.split('\n');
			const mask = computeFenceMask(lines);

			for (let i = 0; i < lines.length; i++) {
				if (mask[i]) continue;
				const ut = parseUnidentifiedTaskLine(lines[i], i);
				if (ut) {
					if (
						ut.seedPrefix &&
						excludePrefixes?.some((prefix) => ut.seedPrefix?.startsWith(prefix))
					) {
						continue;
					}
					result.push({
						status: ut.status,
						title: ut.title,
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

	return result;
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
	const blockedByStr = unresolvedBlockerIds(task, statusMap)
		.map((id) => formatBlocker(id, isTTY))
		.join(' ');
	const blockedBySuffix = blockedByStr ? ` ${blockedByStr}` : '';
	const propsStr = formatProperties(task.properties);
	const propsSuffix = propsStr ? ` ${propsStr}` : '';

	const basePart = `${statusStr} ${task.id} ${task.title}${priorityStr ? ` ${priorityStr}` : ''}`;
	const valueLine = task.value ? `\n    ${formatTaskValue(task.value)}` : '';

	if (task.status === 'done' && isTTY) {
		// Apply gray to base parts, append colored blockers separately to avoid nesting issues,
		// then append properties in gray
		const grayProps = propsSuffix ? p.gray(propsSuffix) : '';
		return p.gray(basePart) + blockedBySuffix + grayProps + valueLine;
	}

	return `${basePart}${blockedBySuffix}${propsSuffix}${valueLine}`;
}

type TaskJson = {
	id: string;
	status: TaskStatus;
	title: string;
	tags: string[];
	priority: string | null;
	properties: Record<string, string[]>;
	file: string;
	line: number;
};

// Stable machine-readable shape for --json. Tags drop the leading '#' so they
// match priority (stored without '!') and property keys (without '@'); file is
// cwd-relative, the same path shown in human output.
function taskToJson(task: Task): TaskJson {
	return {
		id: task.id,
		status: task.status,
		title: task.title,
		tags: task.tags.map((tag) => tag.replace(/^#/, '')),
		priority: task.priority,
		properties: task.properties,
		file: relative(process.cwd(), task.filePath) || task.filePath,
		line: task.lineNumber,
	};
}

function handleView(
	id: string,
	options: { path?: string; json?: boolean },
): void {
	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);

	let task: Task;
	try {
		task = resolveTaskId(id, tasks);
	} catch (err: unknown) {
		process.stderr.write(
			`mdtask: ${err instanceof Error ? err.message : err}\n`,
		);
		process.exit(1);
		return;
	}

	if (options.json) {
		const lines = readFileSync(task.filePath, 'utf-8').split('\n');
		const body = collectTaskBody(lines, task.lineNumber - 1);
		process.stdout.write(
			`${JSON.stringify({ ...taskToJson(task), body }, null, 2)}\n`,
		);
		return;
	}

	const isTTY = process.stdout.isTTY ?? false;
	const relPath = relative(process.cwd(), task.filePath) || task.filePath;
	const location = `${relPath}:${task.lineNumber}`;
	process.stdout.write(`${isTTY ? p.gray(location) : location}\n`);

	const content = readFileSync(task.filePath, 'utf-8');
	const lines = content.split('\n');
	const headerLine = lines[task.lineNumber - 1];
	const body = collectTaskBody(lines, task.lineNumber - 1);

	process.stdout.write(`${headerLine}\n`);
	if (body) {
		const indented = body.replace(/^(?!$)/gm, '      ');
		process.stdout.write(`${indented}\n`);
	}
}

function handleMove(
	id: string,
	targetFile: string,
	options: { path?: string },
): void {
	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);

	let task: Task;
	try {
		task = resolveTaskId(id, tasks);
	} catch (err: unknown) {
		process.stderr.write(
			`mdtask: ${err instanceof Error ? err.message : err}\n`,
		);
		process.exit(1);
		return;
	}

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
	const { end: blockEnd } = findTaskBlockRange(lines, headerIndex);
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

type TaskBlock = {
	task: Task;
	headerIndex: number;
	blockEnd: number;
	lines: string[];
};

function isInsideBase(targetPath: string, basePath: string): boolean {
	const rel = relative(basePath, targetPath);
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function archiveBaseAndFiles(
	pathOption: string | undefined,
	config: ReturnType<typeof loadConfig>,
	root?: string,
): { basePath: string; files: string[] } {
	const rawPath = resolveBasePath(pathOption, config, root);
	const resolvedPath = resolve(rawPath);
	try {
		const stats = statSync(resolvedPath);
		if (stats.isFile()) {
			return { basePath: dirname(resolvedPath), files: [resolvedPath] };
		}
	} catch {
		// Missing paths are handled by the normal scanner, matching other commands.
	}

	return {
		basePath: resolvedPath,
		files: taskFiles(resolvedPath, config?.files),
	};
}

function handleArchive(ids: string[], options: { path?: string }): void {
	const { config, root } = pathConfigContext(options.path);
	const { basePath, files } = archiveBaseAndFiles(options.path, config, root);
	const archivePath = resolve(basePath, config?.archivePath ?? '_archive.md');

	if (!isInsideBase(archivePath, basePath)) {
		process.stderr.write(
			`mdtask: archive path '${archivePath}' is outside the base directory\n`,
		);
		process.exit(1);
		return;
	}

	if (existsSync(archivePath) && statSync(archivePath).isDirectory()) {
		process.stderr.write(`mdtask: '${archivePath}' is a directory\n`);
		process.exit(1);
		return;
	}

	const sourceFiles = files.filter(
		(filePath) => !sameFile(filePath, archivePath),
	);
	const tasks = sourceFiles.flatMap((filePath) =>
		readFileTasks(filePath, config?.excludePrefixes),
	);
	const selected: Task[] = [];

	if (ids.length > 0) {
		for (const id of ids) {
			try {
				selected.push(resolveTaskId(id, tasks));
			} catch (err: unknown) {
				process.stderr.write(
					`mdtask: ${err instanceof Error ? err.message : err}\n`,
				);
				process.exit(1);
				return;
			}
		}
	} else {
		selected.push(...tasks.filter((task) => task.status === 'done'));
	}

	for (const task of selected) {
		if (task.status !== 'done') {
			process.stderr.write(`mdtask: task '${task.id}' is not done\n`);
			process.exit(1);
			return;
		}
	}

	if (selected.length === 0) return;

	const sorted = [...selected].sort((a, b) => {
		if (a.filePath === b.filePath) return a.lineNumber - b.lineNumber;
		return a.filePath.localeCompare(b.filePath);
	});
	const blocks: TaskBlock[] = [];

	for (const task of sorted) {
		const fileLines = readFileSync(task.filePath, 'utf-8').split('\n');
		const headerIndex = task.lineNumber - 1;
		if (!fileLines[headerIndex]?.includes(task.id)) {
			process.stderr.write(
				`mdtask: file changed, task '${task.id}' not at expected line\n`,
			);
			process.exit(1);
			return;
		}
		const { end } = findTaskBlockRange(fileLines, headerIndex);
		blocks.push({
			task,
			headerIndex,
			blockEnd: end,
			lines: fileLines.slice(headerIndex, end),
		});
	}

	const sourcePaths = [...new Set(blocks.map((block) => block.task.filePath))];
	for (const sourcePath of sourcePaths) {
		try {
			accessSync(sourcePath, constants.W_OK);
		} catch {
			process.stderr.write(
				`mdtask: cannot write to '${sourcePath}': permission denied\n`,
			);
			process.exit(1);
			return;
		}
	}

	if (existsSync(archivePath)) {
		try {
			accessSync(archivePath, constants.W_OK);
		} catch {
			process.stderr.write(
				`mdtask: cannot write to '${archivePath}': permission denied\n`,
			);
			process.exit(1);
			return;
		}
	} else {
		mkdirSync(dirname(archivePath), { recursive: true });
	}

	let archiveContent = existsSync(archivePath)
		? readFileSync(archivePath, 'utf-8')
		: '';
	if (archiveContent.length > 0 && !archiveContent.endsWith('\n'))
		archiveContent += '\n';
	if (archiveContent.length > 0) archiveContent += '\n';
	archiveContent += `${blocks.map((block) => block.lines.join('\n')).join('\n\n')}\n`;
	writeFileSync(archivePath, archiveContent);

	const byFile = new Map<string, TaskBlock[]>();
	for (const block of blocks) {
		const existing = byFile.get(block.task.filePath) ?? [];
		existing.push(block);
		byFile.set(block.task.filePath, existing);
	}

	for (const [filePath, fileBlocks] of byFile) {
		const content = readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');
		for (const block of [...fileBlocks].sort(
			(a, b) => b.headerIndex - a.headerIndex,
		)) {
			lines.splice(block.headerIndex, block.blockEnd - block.headerIndex);
		}
		writeFileSync(filePath, lines.join('\n'));
	}
}

function handleOpen(id: string, options: { path?: string }): void {
	const editor = process.env.EDITOR;
	if (!editor) {
		process.stderr.write('mdtask: $EDITOR is not set\n');
		process.exit(1);
		return;
	}

	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);

	let task: Task;
	try {
		task = resolveTaskId(id, tasks);
	} catch (err: unknown) {
		process.stderr.write(
			`mdtask: ${err instanceof Error ? err.message : err}\n`,
		);
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
	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);

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

	// Warn on the same numeric part used by different prefixes (e.g. CLI-001 and
	// PRJ-001). Short numeric lookup (`mdtask view 1`) then becomes ambiguous.
	// extractNumericPart mirrors how that lookup resolves, so the check matches
	// exactly what would break. Full IDs still work, so this is a warning.
	const numericMap = new Map<number, Task[]>();
	for (const task of tasks) {
		const num = extractNumericPart(task.id);
		const group = numericMap.get(num) ?? [];
		group.push(task);
		numericMap.set(num, group);
	}

	for (const [num, group] of numericMap) {
		const prefixes = new Set(group.map((t) => t.id.replace(/-\d+$/, '')));
		if (prefixes.size < 2) continue;

		// Group locations by full ID so an exact duplicate isn't listed twice.
		const byId = new Map<string, string[]>();
		for (const t of group) {
			const locs = byId.get(t.id) ?? [];
			locs.push(`${t.filePath}:${t.lineNumber}`);
			byId.set(t.id, locs);
		}
		const conflicts = [...byId.entries()]
			.map(([id, locs]) => `${id} (${locs.join(', ')})`)
			.join(', ');
		process.stderr.write(
			`warning: duplicate numeric part ${String(num).padStart(3, '0')} across prefixes: ${conflicts}\n`,
		);
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

		for (const value of extractPriorityTokens(raw)) {
			if (!VALID_PRIORITIES.has(value)) {
				process.stderr.write(
					`warning: unknown priority !${value} in ${task.filePath}:${task.lineNumber} (${task.id})\n`,
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
		blocked?: boolean;
		sort?: string;
		path?: string;
		tag?: string | string[];
		priority?: string | string[];
		json?: boolean;
	},
): void {
	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);
	const statusMap = new Map(tasks.map((t) => [t.id, t.status]));
	const isTTY = process.stdout.isTTY ?? false;

	// cac yields a string for one occurrence and a string[] for repeats; a
	// numeric-looking value may arrive as a number, so coerce with String.
	const toArray = (v: string | string[] | undefined): string[] =>
		v === undefined ? [] : (Array.isArray(v) ? v : [v]).map(String);

	// --tag/--priority flags need no shell quoting; merge them with the
	// positional #tag / !priority filters using the same semantics.
	const tagFilters = [
		...filters.filter((f) => f.startsWith('#')),
		...toArray(options.tag).map((t) => `#${t.replace(/^#/, '')}`),
	];
	const priorityFilters = [
		...filters.filter((f) => f.startsWith('!')).map((f) => f.slice(1)),
		...toArray(options.priority).map((p) => p.replace(/^!/, '')),
	];

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

	const hiddenBlockedTasks = options.blocked
		? []
		: filteredTasks.filter((t) => hasUnresolvedBlockers(t, statusMap));
	const visibleTasks = options.blocked
		? filteredTasks
		: filteredTasks.filter((t) => !hasUnresolvedBlockers(t, statusMap));

	// JSON output is the machine contract: only the task array, no TTY table,
	// no hidden-blocked note, no unidentified warning — all of which would break
	// JSON.parse. Filters and sort above still apply.
	if (options.json) {
		process.stdout.write(
			`${JSON.stringify(visibleTasks.map(taskToJson), null, 2)}\n`,
		);
		return;
	}

	if (isTTY) {
		process.stdout.write(formatTable(visibleTasks, statusMap, isTTY));
	} else {
		for (const task of visibleTasks) {
			process.stdout.write(`${formatTaskLine(task, statusMap, isTTY)}\n`);
		}
	}

	if (hiddenBlockedTasks.length > 0) {
		const noun = hiddenBlockedTasks.length === 1 ? 'task' : 'tasks';
		process.stdout.write(
			`Note: ${hiddenBlockedTasks.length} blocked ${noun} hidden. Use mdtask list --blocked to show them.\n`,
		);
	}

	// Show unidentified tasks warning (not affected by tag/priority filters)
	let unidentified = collectUnidentifiedTasks(
		basePath,
		config?.files,
		config?.excludePrefixes,
	);
	if (!options.all) {
		unidentified = unidentified.filter((t) => t.status === 'open');
	}
	if (unidentified.length > 0) {
		const header = 'Warning: tasks without IDs (run `mdtask ids` to assign):';
		process.stdout.write(`\n${isTTY ? p.yellow(header) : header}\n`);
		// Compute max title width for alignment
		const entries = unidentified.map((t) => {
			const checkbox = t.status === 'done' ? '[x]' : '[ ]';
			const left = `- ${checkbox} ${t.title}`;
			const location = `${relative(process.cwd(), t.filePath) || t.filePath}:${t.lineNumber}`;
			return { left, location };
		});
		const maxLeft = Math.max(...entries.map((e) => e.left.length));
		for (const { left, location } of entries) {
			const padding = ' '.repeat(maxLeft - left.length + 4);
			const locationStr = isTTY ? p.gray(location) : location;
			process.stdout.write(`${left}${padding}${locationStr}\n`);
		}
	}
}

function isToken(arg: string): boolean {
	return arg.startsWith('#') || arg.startsWith('!') || arg.startsWith('@');
}

function handleSet(args: string[], options: { path?: string }): void {
	// Split comma-separated args and flatten
	const allArgs = args.flatMap((a) => a.split(',').filter(Boolean));

	const ids = allArgs.filter((a) => !isToken(a));
	const tokens = allArgs.filter((a) => isToken(a));

	if (ids.length === 0) {
		process.stderr.write('mdtask: no task IDs provided\n');
		process.exit(1);
		return;
	}

	if (tokens.length === 0) {
		process.stderr.write('mdtask: no metadata tokens provided\n');
		process.exit(1);
		return;
	}

	const { config, basePath } = taskSearchContext(options.path);
	const tasks = collectTasks(basePath, config?.files, config?.excludePrefixes);

	// Validate all IDs first
	const matched: Task[] = [];
	for (const id of ids) {
		try {
			matched.push(resolveTaskId(id, tasks));
		} catch (err: unknown) {
			process.stderr.write(
				`mdtask: ${err instanceof Error ? err.message : err}\n`,
			);
			process.exit(1);
			return;
		}
	}

	// Group by file to minimize reads/writes
	const byFile = new Map<string, Task[]>();
	for (const task of matched) {
		const existing = byFile.get(task.filePath) ?? [];
		existing.push(task);
		byFile.set(task.filePath, existing);
	}

	const newTags = tokens.filter((t) => t.startsWith('#'));
	const newPriority = tokens.find((t) => t.startsWith('!'));
	const newProps = tokens.filter((t) => t.startsWith('@'));

	for (const [filePath, fileTasks] of byFile) {
		const content = readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');

		for (const task of fileTasks) {
			const lineIdx = task.lineNumber - 1;
			const line = lines[lineIdx];

			if (!line.includes(task.id)) {
				process.stderr.write(
					`mdtask: file changed, task '${task.id}' not at expected line\n`,
				);
				process.exit(1);
				return;
			}

			// Parse existing metadata to check for duplicates
			const existingMeta = parseMetadata(task.rawMetadata);

			// Build tokens to add
			const addTokens: string[] = [];

			for (const tag of newTags) {
				if (!existingMeta.tags.includes(tag)) {
					addTokens.push(tag);
				}
			}

			for (const prop of newProps) {
				addTokens.push(prop);
			}

			// Handle priority: remove existing from metadata, add new
			let updatedLine = line;
			if (newPriority) {
				if (existingMeta.priority !== null) {
					// Remove existing priority token from metadata portion only
					const oldPriority = `!${existingMeta.priority}`;
					const metaStart = updatedLine.lastIndexOf(oldPriority);
					if (metaStart !== -1) {
						const before = updatedLine.slice(0, metaStart).replace(/\s+$/, '');
						const after = updatedLine.slice(metaStart + oldPriority.length);
						updatedLine = before + after;
					}
				}
				addTokens.push(newPriority);
			}

			if (addTokens.length === 0) {
				continue;
			}

			const suffix = addTokens.join(' ');

			// Append tokens
			const doubleTabIdx = updatedLine.indexOf('\t\t');
			if (doubleTabIdx !== -1) {
				// Has tab separator — append after existing metadata
				updatedLine = `${updatedLine.trimEnd()} ${suffix}`;
			} else if (task.rawMetadata) {
				// Has metadata without tab separator — append with space
				updatedLine = `${updatedLine.trimEnd()} ${suffix}`;
			} else {
				// No metadata — add with tab separator
				updatedLine = `${updatedLine.trimEnd()}\t\t${suffix}`;
			}

			lines[lineIdx] = updatedLine;
		}

		writeFileSync(filePath, lines.join('\n'));
	}
}

function normalizeIdsPrefix(input: string | undefined): string | null {
	if (input === undefined) return null;

	const prefix = input.trim().toUpperCase();
	return /^[A-Z][A-Z0-9]*$/.test(prefix) ? prefix : null;
}

type IdsPath = { base?: string; file?: string; error?: string };

function resolveIdsPath(input: string | undefined): IdsPath {
	if (input === undefined || input === '') return {};

	const resolved = resolve(input);
	try {
		const stats = statSync(resolved);
		if (stats.isFile()) return { file: resolved };
		if (stats.isDirectory()) return { base: input };
		return { error: input };
	} catch {
		return { error: input };
	}
}

function sameFile(a: string, b: string): boolean {
	try {
		return realpathSync(a) === realpathSync(b);
	} catch {
		return resolve(a) === resolve(b);
	}
}

function hasTaskFromFile(tasks: Task[], filePath: string): boolean {
	return tasks.some((task) => sameFile(task.filePath, filePath));
}

type IdsOptions = { path?: string; prefix?: string };

async function handleIds(options: IdsOptions): Promise<void> {
	const explicitPrefix = normalizeIdsPrefix(options.prefix);
	if (options.prefix !== undefined && !explicitPrefix) {
		process.stderr.write(
			`mdtask: invalid prefix "${options.prefix}" — must be uppercase alphanumeric starting with a letter\n`,
		);
		process.exit(1);
		return;
	}

	const idsPath = resolveIdsPath(options.path);
	if (idsPath.error) {
		process.stderr.write(
			`mdtask: --path ${idsPath.error} does not exist or is not a file/directory\n`,
		);
		process.exit(1);
		return;
	}

	let config: Config | null;
	let basePath: string;
	if (idsPath.file) {
		const project = loadProjectConfig(dirname(idsPath.file));
		config = project.config;
		basePath = resolveProjectBasePath(config, project.root);
	} else {
		config = loadConfig();
		basePath = resolveBasePath(idsPath.base, config);
	}
	const filesConfig = config?.files;
	const excludePrefixes = config?.excludePrefixes;

	const targetFile = idsPath.file;
	const existingTasks = collectTasks(basePath, filesConfig, excludePrefixes);
	if (targetFile && !hasTaskFromFile(existingTasks, targetFile)) {
		try {
			existingTasks.push(...readFileTasks(targetFile, excludePrefixes));
		} catch (err) {
			process.stderr.write(
				`mdtask: warning: could not read ${targetFile}: ${err}\n`,
			);
		}
	}

	// Find global max NNN across all existing IDs
	let globalMax = 0;
	for (const task of existingTasks) {
		const num = extractNumericPart(task.id);
		if (num > globalMax) globalMax = num;
	}

	// Detect duplicate numeric parts across prefixes
	const numericMap = new Map<number, string[]>();
	for (const task of existingTasks) {
		const num = extractNumericPart(task.id);
		const existing = numericMap.get(num) ?? [];
		existing.push(task.id);
		numericMap.set(num, existing);
	}
	for (const [num, ids] of numericMap) {
		if (ids.length > 1) {
			const prefixes = [...new Set(ids.map((id) => id.replace(/-\d+$/, '')))];
			if (prefixes.length > 1) {
				process.stderr.write(
					`warning: duplicate numeric part ${String(num).padStart(3, '0')} across prefixes: ${ids.join(', ')}\n`,
				);
			}
		}
	}

	// Scan target files for unidentified tasks.
	const files = targetFile ? [targetFile] : taskFiles(basePath, filesConfig);

	// Determine minimum padding width from existing IDs (at least 3)
	let padWidth = 3;
	for (const task of existingTasks) {
		const match = /(\d+)$/.exec(task.id);
		if (match && match[1].length > padWidth) {
			padWidth = match[1].length;
		}
	}

	// Pass 1: parse all files, determine prefixes, validate before any mutations
	type FileWork = {
		filePath: string;
		lines: string[];
		unidentified: UnidentifiedTask[];
		filePrefix: string;
	};
	const workItems: FileWork[] = [];
	let iface: rl.Interface | undefined;

	for (const filePath of files) {
		let content: string;
		try {
			content = readFileSync(filePath, 'utf-8');
		} catch {
			continue;
		}

		const lines = content.split('\n');
		const mask = computeFenceMask(lines);
		const unidentified: UnidentifiedTask[] = [];

		for (let i = 0; i < lines.length; i++) {
			if (mask[i]) continue;
			const ut = parseUnidentifiedTaskLine(lines[i], i);
			if (ut) {
				unidentified.push(ut);
			}
		}

		if (unidentified.length === 0) continue;

		// Determine prefix for this file
		// 1. From existing IDed tasks in this file
		const sameTargetFile = (task: Task) => sameFile(task.filePath, filePath);
		const fileExisting = existingTasks.filter(sameTargetFile);
		let filePrefix: string | null = null;

		if (fileExisting.length > 0) {
			const prefixCounts = new Map<string, number>();
			for (const t of fileExisting) {
				const p = t.id.replace(/-\d+$/, '');
				prefixCounts.set(p, (prefixCounts.get(p) ?? 0) + 1);
			}
			let maxCount = 0;
			for (const [p, count] of prefixCounts) {
				if (count > maxCount) {
					maxCount = count;
					filePrefix = p;
				}
			}
		}

		// 2. Fallback: seed prefix from unidentified tasks
		if (!filePrefix) {
			const seed = unidentified.find((ut) => ut.seedPrefix);
			if (seed) {
				filePrefix = seed.seedPrefix as string;
			}
		}

		if (!filePrefix && explicitPrefix) {
			filePrefix = explicitPrefix;
		}

		if (!filePrefix) {
			if (!process.stdin.isTTY) {
				const missing = unidentified[0];
				const displayPath = relative(process.cwd(), filePath) || filePath;
				process.stderr.write(
					`mdtask: ${displayPath}:${missing.lineIndex + 1}: no prefix found for task "${missing.rawLine}" — add a task with an ID, use a seed line like '- [ ] PRJ- Task title', or pass --prefix PRJ\n`,
				);
				process.exit(1);
				return;
			}

			if (!iface) {
				iface = rl.createInterface({
					input: process.stdin,
					output: process.stderr,
				});
			}
			const displayPath = relative(process.cwd(), filePath) || filePath;
			const answer = await iface.question(`Enter prefix for ${displayPath}: `);
			const normalizedAnswer = normalizeIdsPrefix(answer);
			if (!normalizedAnswer) {
				iface.close();
				process.stderr.write(
					`mdtask: invalid prefix "${answer.trim().toUpperCase()}" — must be uppercase alphanumeric starting with a letter\n`,
				);
				process.exit(1);
				return;
			}
			filePrefix = normalizedAnswer;
		}

		workItems.push({ filePath, lines, unidentified, filePrefix });
	}
	iface?.close();

	// Pass 2: assign IDs and write files (all prefixes validated)
	let nextNum = globalMax + 1;
	const assigned: string[] = [];

	for (const { filePath, lines, unidentified, filePrefix } of workItems) {
		for (const ut of unidentified) {
			const activePrefix = ut.seedPrefix ?? filePrefix;
			const id = `${activePrefix}-${String(nextNum).padStart(padWidth, '0')}`;
			const checkbox = ut.status === 'done' ? '[x]' : '[ ]';

			const formatted = `- ${checkbox} ${id} ${ut.title}`;
			lines[ut.lineIndex] = formatted;

			assigned.push(formatted);
			nextNum++;
		}

		writeFileSync(filePath, lines.join('\n'));
	}

	for (const line of assigned) {
		process.stdout.write(`${line}\n`);
	}
}

const KNOWN_COMMANDS = new Set([
	'list',
	'view',
	'show',
	'open',
	'move',
	'archive',
	'validate',
	'set',
	'ids',
	'install-skills',
	'help',
]);

function cliRoot(): string {
	return resolve(fileURLToPath(import.meta.url), '..', '..');
}

function handleInstallSkills(dir: string): void {
	try {
		const result = installSkills(resolve(dir), cliRoot(), process.cwd());
		if (result.linked.length > 0) {
			process.stdout.write(
				`Linked ${result.linked.join(', ')} into ${dir} (from ${result.source})\n`,
			);
		}
		for (const s of result.skipped) {
			process.stderr.write(`mdtask: skipped ${s.name} — ${s.reason}\n`);
		}
		// Any skipped skill means the agent dir is incomplete — fail so setup
		// automation doesn't treat a partial install as success.
		if (result.skipped.length > 0) {
			process.exit(1);
		}
	} catch (err) {
		process.stderr.write(
			`mdtask: ${err instanceof Error ? err.message : String(err)}\n`,
		);
		process.exit(1);
	}
}

export async function run(args: string[]): Promise<number> {
	const root = cliRoot();
	const pkgVersion = runningVersion(root);

	// Keep the shared skills cache current — global/npx installs symlink into it,
	// so any run refreshes it after a version bump or bundled-skill rename. Skip
	// when mdtask is a local project dependency (those link directly into
	// node_modules and must not mutate a global cache) and when no cache exists
	// (nothing points at it).
	if (existsSync(userCacheSkillsDir()) && !localDepDir(root, process.cwd())) {
		refreshCacheIfStale(root, pkgVersion);
	}

	const cli = new CAC('mdtask');

	cli.option(
		'--path <path>',
		'Base directory or file path for tasks (default: .)',
	);

	cli
		.command(
			'list [...filters]',
			'List workable tasks. Use --blocked to include blocked tasks. Filter by tag/priority: --tag backend --priority high (no quoting needed), or positional "#backend" "!high"',
		)
		.option('--all', 'Show all tasks including done')
		.option('--blocked', 'Show tasks with unresolved @blocked_by dependencies')
		.option('--sort <field>', 'Sort tasks (e.g. --sort=priority)')
		.option(
			'--tag <tag>',
			'Filter by tag, e.g. --tag backend (repeatable; tags AND together)',
		)
		.option(
			'--priority <priority>',
			'Filter by priority: crit, high, or low (repeatable; priorities OR together)',
		)
		.option('--json', 'Output tasks as JSON (machine-readable, no colors)')
		.action((filters: string[], options) => {
			handleList(filters, options);
		});

	cli
		.command('view <id>', 'View task details')
		.alias('show')
		.option(
			'--json',
			'Output the task as JSON (machine-readable, includes body)',
		)
		.action((id, options) => {
			handleView(id, options);
		});

	cli.command('open <id>', 'Open task in $EDITOR').action((id, options) => {
		handleOpen(id, options);
	});

	cli
		.command('move <id> <file>', 'Move task to another file')
		.action((id, file, options) => {
			handleMove(id, file, options);
		});

	cli
		.command('archive [...ids]', 'Move done tasks into the archive file')
		.action((ids: string[], options) => {
			handleArchive(ids, options);
		});

	cli.command('validate', 'Check task integrity').action((options) => {
		handleValidate(options);
	});

	cli
		.command(
			'install-skills <dir>',
			"Symlink mdtask's skills into an agent's skill directory (pass the agent's own skill folder)",
		)
		.action((dir) => {
			handleInstallSkills(dir);
		});

	cli
		.command(
			'set <...args>',
			'Add metadata to tasks: #tag, !priority, @key:value',
		)
		.action((args: string[], options) => {
			handleSet(args, options);
		});

	cli
		.command(
			'ids',
			'Auto-assign IDs to unidentified tasks (--path <file> limits assignment to one file)',
		)
		.option('--prefix <prefix>', 'Fallback prefix for ID assignment')
		.action((options) => {
			return handleIds(options);
		});

	cli.help();
	cli.version(pkgVersion);

	// Default shortcuts: no args → list, task ID → view
	if (args.length === 0) {
		args = ['list'];
	} else if (!args[0].startsWith('-') && !KNOWN_COMMANDS.has(args[0])) {
		if (TASK_ID_REGEX.test(args[0])) {
			args = ['view', ...args];
		} else {
			process.stderr.write(`mdtask: unknown command '${args[0]}'\n`);
			cli.outputHelp();
			return 1;
		}
	}

	try {
		cli.parse(['node', 'mdtask', ...args], { run: false });
		await cli.runMatchedCommand();
		return 0;
	} catch (err) {
		process.stderr.write(`mdtask: ${err}\n`);
		return 1;
	}
}

// Auto-run when executed directly (not imported)
const __filename = fileURLToPath(import.meta.url);
if (realpathSync(__filename) === realpathSync(process.argv[1])) {
	run(process.argv.slice(2)).then((code) => process.exit(code));
}
