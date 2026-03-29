import p from 'picocolors';
import type { Task, TaskStatus } from './task.js';

// Strip ANSI escape codes for visual width calculation
const ESC = String.fromCharCode(0x1b);
const ANSI_REGEX = new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]`, 'g');

function stripAnsi(str: string): string {
	return str.replace(ANSI_REGEX, '');
}

function visualWidth(str: string): number {
	return stripAnsi(str).length;
}

function padEnd(str: string, width: number): string {
	const padding = width - visualWidth(str);
	return padding > 0 ? str + ' '.repeat(padding) : str;
}

type ColumnDef = {
	header: string;
	alwaysShow: boolean;
	getValue: (
		task: Task,
		statusMap: Map<string, TaskStatus>,
		isTTY: boolean,
	) => string;
};

const COLUMNS: ColumnDef[] = [
	{
		header: 'ID',
		alwaysShow: true,
		getValue: (task, _sm, isTTY) => {
			const status = task.status === 'done' ? '[x]' : '[ ]';
			const text = `${status} ${task.id}`;
			return isTTY && task.status === 'done' ? p.gray(text) : text;
		},
	},
	{
		header: 'TITLE',
		alwaysShow: true,
		getValue: (task, _sm, isTTY) => {
			return isTTY && task.status === 'done' ? p.gray(task.title) : task.title;
		},
	},
	{
		header: 'PRI',
		alwaysShow: false,
		getValue: (task, _sm, isTTY) => {
			if (!task.priority) return '';
			const s = `!${task.priority}`;
			if (!isTTY) return s;
			if (task.status === 'done') return p.gray(s);
			switch (task.priority) {
				case 'crit':
					return p.red(s);
				case 'high':
					return p.yellow(s);
				case 'low':
					return p.green(s);
				default:
					return s;
			}
		},
	},
	{
		header: 'TAGS',
		alwaysShow: false,
		getValue: (task, _sm, isTTY) => {
			const text = task.tags.join(' ');
			return isTTY && task.status === 'done' && text ? p.gray(text) : text;
		},
	},
	{
		header: 'PROPS',
		alwaysShow: false,
		getValue: (task, statusMap, isTTY) => {
			const blockerIds = (task.properties.blocked_by ?? []).filter(
				(id) => statusMap.get(id) !== 'done',
			);
			const blockerTokens = blockerIds.map((id) => {
				const text = `@blocked_by:${id}`;
				return isTTY ? p.red(text) : text;
			});
			const propTokens: string[] = [];
			const keys = Object.keys(task.properties)
				.filter((k) => k !== 'blocked_by')
				.sort();
			for (const key of keys) {
				for (const value of task.properties[key]) {
					propTokens.push(`@${key}:${value}`);
				}
			}
			if (isTTY && task.status === 'done') {
				const grayProps = propTokens.map((t) => p.gray(t));
				return [...blockerTokens, ...grayProps].join(' ');
			}
			return [...blockerTokens, ...propTokens].join(' ');
		},
	},
];

export function formatTable(
	tasks: Task[],
	statusMap: Map<string, TaskStatus>,
	isTTY: boolean,
): string {
	if (tasks.length === 0) return '';

	// Compute cell values for each task/column
	const cellValues = tasks.map((task) =>
		COLUMNS.map((col) => col.getValue(task, statusMap, isTTY)),
	);

	// Determine active columns (always-show + any with data)
	const activeIndices: number[] = [];
	for (let c = 0; c < COLUMNS.length; c++) {
		if (COLUMNS[c].alwaysShow) {
			activeIndices.push(c);
		} else if (cellValues.some((row) => visualWidth(row[c]) > 0)) {
			activeIndices.push(c);
		}
	}

	// Calculate column widths
	const widths = activeIndices.map((c) => {
		const headerW = COLUMNS[c].header.length;
		const maxDataW = Math.max(...cellValues.map((row) => visualWidth(row[c])));
		return Math.max(headerW, maxDataW);
	});

	// Render header
	const header = ` ${activeIndices
		.map((c, i) => COLUMNS[c].header.padEnd(widths[i]))
		.join(' │ ')}`;

	// Render separator
	const separator = `─${widths.map((w) => '─'.repeat(w)).join('─┼─')}`;

	// Render data rows
	const rows = cellValues.map((row) => {
		const cells = activeIndices.map((c, i) => padEnd(row[c], widths[i]));
		return ` ${cells.join(' │ ')}`;
	});

	const lines = [header, separator, ...rows];
	return `${lines.map((l) => l.replace(/\s+$/, '')).join('\n')}\n`;
}
