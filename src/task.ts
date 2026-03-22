export type TaskStatus = 'open' | 'done';

export type TaskHeader = {
	status: TaskStatus;
	id: string;
	title: string;
	rawMetadata: string;
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
