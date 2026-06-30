export type TaskStatus = 'open' | 'done';

export type TaskHeader = {
	status: TaskStatus;
	id: string;
	title: string;
	rawMetadata: string;
};

export type TaskMetadata = {
	tags: string[];
	priority: string | null;
	properties: Record<string, string[]>;
};

export type Task = TaskHeader &
	TaskMetadata & {
		value?: string;
		filePath: string;
		lineNumber: number;
	};

const ID_PREFIX = '[A-Z][A-Z0-9]*';
const TASK_ID = `${ID_PREFIX}-\\d+`;

const TASK_HEADER_REGEX = new RegExp(`^- \\[([ x])\\] (${TASK_ID}) (.*)$`);
export const TASK_ID_REGEX = new RegExp(`^(?:${TASK_ID}|\\d+)$`);

// Metadata tokens, matched against a whole whitespace-delimited token.
// Tags must start with a letter so issue references like #123 are never tags.
// Property keys allow hyphens and underscores: @build-status:value
const TAG_TOKEN_REGEX = /^#[A-Za-z][\w-]*$/;
const PRIORITY_TOKEN_REGEX = /^![A-Za-z]\w*$/;
const PROPERTY_TOKEN_REGEX = /^@([\w-]+):(\S+)$/;

function isMetadataToken(token: string): boolean {
	return (
		TAG_TOKEN_REGEX.test(token) ||
		PRIORITY_TOKEN_REGEX.test(token) ||
		PROPERTY_TOKEN_REGEX.test(token)
	);
}

export function parseTaskHeader(line: string): TaskHeader | null {
	const lineNoCR = line.replace(/\r$/, '');

	const match = TASK_HEADER_REGEX.exec(lineNoCR);
	if (!match) {
		return null;
	}

	const checkbox = match[1];
	const id = match[2];
	const rest = match[3];

	const status: TaskStatus = checkbox === 'x' ? 'done' : 'open';

	const doubleTabIndex = rest.indexOf('\t\t');
	let title: string;
	let rawMetadata: string;

	if (doubleTabIndex !== -1) {
		title = rest.slice(0, doubleTabIndex).trimEnd();
		rawMetadata = rest.slice(doubleTabIndex + 2).trimStart();
	} else {
		// Metadata is the trailing run of metadata tokens at the end of the line.
		// Scan tokens right-to-left; stop at the first non-metadata token. A
		// `#`/`!`/`@` earlier in the line stays in the title.
		let boundary = rest.length;
		for (const m of [...rest.matchAll(/\S+/g)].reverse()) {
			if (!isMetadataToken(m[0])) break;
			boundary = m.index;
		}
		title = rest.slice(0, boundary).trimEnd();
		rawMetadata = rest.slice(boundary).trimEnd();
	}

	if (title.length === 0) {
		return null;
	}

	return {
		status,
		id,
		title,
		rawMetadata,
	};
}

// A fenced code block opens with >=3 backticks or >=3 tildes, indented 0-3
// spaces (CommonMark; a tab does NOT count as fence indentation). It closes on a
// line with the same fence character, at least as long, indented 0-3 spaces, and
// only whitespace after the marker. An unclosed fence runs to the end of the file.
const FENCE_REGEX = /^( {0,3})(`{3,}|~{3,})(.*)$/;

// Returns a boolean per line: true when the line is inside (or is the marker of)
// a fenced code block. Checkbox lines inside fences are documentation examples,
// never real tasks, so every command that scans for tasks skips masked lines.
export function computeFenceMask(lines: string[]): boolean[] {
	const mask = new Array<boolean>(lines.length).fill(false);
	let open: { char: string; len: number } | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].replace(/\r$/, '');
		const match = FENCE_REGEX.exec(line);

		if (open === null) {
			if (match) {
				const marker = match[2];
				const info = match[3];
				// A backtick opener's info string may not contain a backtick.
				if (marker[0] === '`' && info.includes('`')) {
					continue;
				}
				open = { char: marker[0], len: marker.length };
				mask[i] = true;
			}
			continue;
		}

		// Inside a fence: this line is masked regardless.
		mask[i] = true;
		if (
			match &&
			match[2][0] === open.char &&
			match[2].length >= open.len &&
			match[3].trim() === ''
		) {
			open = null;
		}
	}

	return mask;
}

// Boundary of a task block: header line plus its indented/blank body lines,
// with trailing blank lines trimmed. Single source of block geometry, shared by
// view (collectTaskBody), move, and archive.
export function findTaskBlockRange(
	lines: string[],
	headerIndex: number,
): { start: number; end: number } {
	let endIndex = headerIndex + 1;
	while (endIndex < lines.length) {
		const line = lines[endIndex];
		if (line.trim() === '') {
			endIndex++;
			continue;
		}
		if (!line.startsWith(' ')) break;
		endIndex++;
	}

	let end = endIndex;
	while (end > headerIndex + 1 && lines[end - 1].trim() === '') {
		end--;
	}

	return { start: headerIndex, end };
}

export function collectTaskBody(lines: string[], headerIndex: number): string {
	const { end } = findTaskBlockRange(lines, headerIndex);
	const raw = lines.slice(headerIndex + 1, end).map((line) => {
		const stripped = line.replace(/\r$/, '');
		return stripped.trim() === '' ? '' : stripped;
	});

	if (raw.length === 0) return '';

	// Dedent by minimum common indent (non-empty lines only)
	let minIndent = Number.POSITIVE_INFINITY;
	for (const line of raw) {
		if (line === '') continue;
		const indent = line.length - line.trimStart().length;
		if (indent < minIndent) minIndent = indent;
	}

	const dedented = raw.map((line) =>
		line === '' ? '' : line.slice(minIndent),
	);

	return dedented.join('\n');
}

const UNIDENTIFIED_TASK_REGEX = /^- \[([ x])\] (.+)$/;
const SEED_PREFIX_REGEX = new RegExp(`^- \\[([ x])\\] (${ID_PREFIX})- (.+)$`);

export type UnidentifiedTask = {
	status: TaskStatus;
	title: string;
	rawLine: string;
	lineIndex: number;
	seedPrefix?: string;
};

export function parseUnidentifiedTaskLine(
	line: string,
	lineIndex: number,
): UnidentifiedTask | null {
	const lineNoCR = line.replace(/\r$/, '');

	// Skip if it's already an identified task
	if (TASK_HEADER_REGEX.test(lineNoCR)) {
		return null;
	}

	// Check for seed prefix first (e.g. `- [ ] CLI- Title`)
	const seedMatch = SEED_PREFIX_REGEX.exec(lineNoCR);
	if (seedMatch) {
		return {
			status: seedMatch[1] === 'x' ? 'done' : 'open',
			title: seedMatch[3],
			rawLine: lineNoCR,
			lineIndex,
			seedPrefix: seedMatch[2],
		};
	}

	// Check for plain unidentified task
	const match = UNIDENTIFIED_TASK_REGEX.exec(lineNoCR);
	if (!match) {
		return null;
	}

	return {
		status: match[1] === 'x' ? 'done' : 'open',
		title: match[2],
		rawLine: lineNoCR,
		lineIndex,
	};
}

export function extractNumericPart(id: string): number {
	const match = /\d+$/.exec(id);
	return match ? Number.parseInt(match[0], 10) : 0;
}

const EXACT_ID_REGEX = new RegExp(`^${TASK_ID}$`);
const NUMERIC_REGEX = /^\d+$/;

export function resolveTaskId(input: string, tasks: Task[]): Task {
	const isExact = EXACT_ID_REGEX.test(input);
	const isNumeric = NUMERIC_REGEX.test(input);

	if (!isExact && !isNumeric) {
		throw new Error(`invalid task ID format: '${input}'`);
	}

	if (isExact) {
		const matches = tasks.filter((t) => t.id === input);
		if (matches.length === 0) throw new Error(`task '${input}' not found`);
		if (matches.length > 1) throw new Error(`duplicate ID '${input}'`);
		return matches[0];
	}

	const searchNum = Number.parseInt(input, 10);
	const matches = tasks.filter((t) => extractNumericPart(t.id) === searchNum);

	if (matches.length === 0) throw new Error(`task '${input}' not found`);

	const uniqueIds = [...new Set(matches.map((t) => t.id))];
	if (uniqueIds.length > 1) {
		throw new Error(
			`ambiguous numeric ID '${input}' matches: ${uniqueIds.join(', ')}`,
		);
	}
	if (matches.length > 1) {
		throw new Error(`duplicate ID '${matches[0].id}'`);
	}

	return matches[0];
}

export const VALID_PRIORITIES = new Set(['crit', 'high', 'low']);

export function unresolvedBlockerIds(
	task: Task,
	statusMap: Map<string, TaskStatus>,
): string[] {
	return (task.properties.blocked_by ?? []).filter(
		(id) => statusMap.get(id) !== 'done',
	);
}

export function hasUnresolvedBlockers(
	task: Task,
	statusMap: Map<string, TaskStatus>,
): boolean {
	return (
		task.status === 'open' && unresolvedBlockerIds(task, statusMap).length > 0
	);
}

// Used by `validate`: the values of all whole priority tokens in raw metadata.
// Token-based so a `!word` inside a property value (e.g. a URL) is not flagged.
export function extractPriorityTokens(rawMetadata: string): string[] {
	const values: string[] = [];
	for (const token of rawMetadata.split(/\s+/)) {
		if (PRIORITY_TOKEN_REGEX.test(token)) {
			values.push(token.slice(1));
		}
	}
	return values;
}

export function parseMetadata(rawMetadata: string): TaskMetadata {
	const tags: string[] = [];
	let priority: string | null = null;
	const properties: Record<string, string[]> = Object.create(null);

	// Classify each whole token, so a `#` or `!` inside a property value (e.g. a
	// URL fragment) is never mistaken for a tag or priority.
	for (const token of rawMetadata.split(/\s+/)) {
		if (token === '') continue;

		if (TAG_TOKEN_REGEX.test(token)) {
			tags.push(token);
			continue;
		}

		if (PRIORITY_TOKEN_REGEX.test(token)) {
			if (priority === null) {
				priority = token.slice(1);
			}
			continue;
		}

		const property = PROPERTY_TOKEN_REGEX.exec(token);
		if (property) {
			const key = property[1];
			const value = property[2];
			if (!Object.hasOwn(properties, key)) {
				properties[key] = [];
			}
			properties[key].push(value);
		}
	}

	return {
		tags,
		priority,
		properties,
	};
}
