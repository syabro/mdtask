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
		filePath: string;
		lineNumber: number;
	};

const TASK_HEADER_REGEX = /^- \[([ x])\] ([A-Z]+-\d+) (.*)$/;

// Detects metadata start: beginning of string OR whitespace before #tag, !priority, or @key:value
// Property keys allow hyphens and underscores: @build-status:value
const METADATA_START_REGEX = /(?:^|\s+)(?:(?=#[^\s])|(?=!\w)|(?=@[\w-]+:\S))/;

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
		const metadataMatch = METADATA_START_REGEX.exec(rest);
		if (metadataMatch) {
			title = rest.slice(0, metadataMatch.index).trimEnd();
			rawMetadata = rest.slice(metadataMatch.index).trimStart();
		} else {
			title = rest.trimEnd();
			rawMetadata = '';
		}
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

export function collectTaskBody(lines: string[], headerIndex: number): string {
	const raw: string[] = [];

	for (let i = headerIndex + 1; i < lines.length; i++) {
		const line = lines[i].replace(/\r$/, '');

		if (line.trim() === '') {
			raw.push('');
			continue;
		}

		if (!line.startsWith(' ')) {
			break;
		}

		raw.push(line);
	}

	// Trim trailing empty lines
	while (raw.length > 0 && raw[raw.length - 1] === '') {
		raw.pop();
	}

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

// Matches unidentified task lines: `- [ ] Title` or `- [x] Title` without [A-Z]+-\d+ ID
const UNIDENTIFIED_TASK_REGEX = /^- \[([ x])\] (.+)$/;

// Matches seed prefix lines: `- [ ] CLI- Title` (prefix without number)
const SEED_PREFIX_REGEX = /^- \[([ x])\] ([A-Z]+)- (.+)$/;

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

const TAG_REGEX = /#[\w-]+/g;
export const PRIORITY_REGEX = /!(\w+)/g;
const PROPERTY_REGEX = /(?<=^|\s)@([\w-]+):(\S+)/g;

export const VALID_PRIORITIES = new Set(['crit', 'high', 'low']);

export function parseMetadata(rawMetadata: string): TaskMetadata {
	const tags: string[] = [];
	let priority: string | null = null;
	const properties: Record<string, string[]> = Object.create(null);

	for (const match of rawMetadata.matchAll(TAG_REGEX)) {
		tags.push(match[0]);
	}

	for (const match of rawMetadata.matchAll(PRIORITY_REGEX)) {
		if (priority === null) {
			priority = match[1];
		}
	}

	for (const match of rawMetadata.matchAll(PROPERTY_REGEX)) {
		const key = match[1];
		const value = match[2];
		if (!Object.hasOwn(properties, key)) {
			properties[key] = [];
		}
		properties[key].push(value);
	}

	return {
		tags,
		priority,
		properties,
	};
}
