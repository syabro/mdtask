import { describe, expect, it, vi } from 'vitest';

vi.mock('picocolors', () => ({
	default: {
		gray: (s: string) => `\u001b[90m${s}\u001b[39m`,
		red: (s: string) => `\u001b[31m${s}\u001b[39m`,
		yellow: (s: string) => `\u001b[33m${s}\u001b[39m`,
		green: (s: string) => `\u001b[32m${s}\u001b[39m`,
		strikethrough: (s: string) => `\u001b[9m${s}\u001b[29m`,
	},
}));

import { formatTable } from '../src/table.js';
import type { Task, TaskStatus } from '../src/task.js';

function makeTask(
	overrides: Partial<Task> & { id: string; title: string },
): Task {
	return {
		status: 'open' as TaskStatus,
		rawMetadata: '',
		tags: [],
		priority: null,
		properties: {},
		filePath: '/test/tasks.md',
		lineNumber: 1,
		...overrides,
	};
}

const ESC = String.fromCharCode(0x1b);
const ANSI_REGEX = new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]`, 'g');

function stripAnsi(str: string): string {
	return str.replace(ANSI_REGEX, '');
}

describe('formatTable', () => {
	it('renders table with header, separator, and data rows', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'First task' }),
			makeTask({ id: 'TSK-002', title: 'Second task' }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		const lines = output.trimEnd().split('\n');

		expect(lines).toHaveLength(4);
		expect(lines[0]).toContain('ID');
		expect(lines[0]).toContain('TITLE');
		expect(lines[1]).toContain('─');
		expect(lines[1]).toContain('┼');
		expect(lines[2]).toContain('[ ] TSK-001');
		expect(lines[2]).toContain('First task');
		expect(lines[3]).toContain('[ ] TSK-002');
		expect(lines[3]).toContain('Second task');
	});

	it('returns empty string for empty task list', () => {
		expect(formatTable([], new Map(), false)).toBe('');
	});

	it('auto-sizes columns to content width', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'Short' }),
			makeTask({ id: 'TSK-002', title: 'A much longer task title' }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		const lines = output.trimEnd().split('\n');

		// Pipe positions should align across all rows (header + data)
		const pipePos0 = lines[0].indexOf('│');
		expect(pipePos0).toBeGreaterThan(0);
		for (let i = 2; i < lines.length; i++) {
			expect(lines[i].indexOf('│')).toBe(pipePos0);
		}
		// Separator ┼ should align with │
		expect(lines[1].indexOf('┼')).toBe(pipePos0);
	});

	it('hides priority column when no tasks have priority', () => {
		const tasks = [makeTask({ id: 'TSK-001', title: 'No priority' })];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).not.toContain('PRI');
	});

	it('shows priority column when any task has priority', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'Has priority', priority: 'high' }),
			makeTask({ id: 'TSK-002', title: 'No priority' }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).toContain('PRI');
		expect(output).toContain('!high');
	});

	it('hides tags column when no tasks have tags', () => {
		const tasks = [makeTask({ id: 'TSK-001', title: 'No tags' })];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).not.toContain('TAGS');
	});

	it('shows tags column when any task has tags', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'Has tag', tags: ['#backend'] }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).toContain('TAGS');
		expect(output).toContain('#backend');
	});

	it('hides props column when no tasks have properties', () => {
		const tasks = [makeTask({ id: 'TSK-001', title: 'No props' })];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).not.toContain('PROPS');
	});

	it('shows blockers and other properties in props column', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Blocked',
				properties: { blocked_by: ['TSK-002'], iter: ['mvp'] },
			}),
			makeTask({ id: 'TSK-002', title: 'Blocker' }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).toContain('PROPS');
		expect(output).toContain('@blocked_by:TSK-002');
		expect(output).toContain('@iter:mvp');
	});

	it('hides resolved blockers', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Blocked',
				properties: { blocked_by: ['TSK-002'] },
			}),
		];
		const statusMap = new Map<string, TaskStatus>([
			['TSK-001', 'open'],
			['TSK-002', 'done'],
		]);
		const output = formatTable(tasks, statusMap, false);
		expect(output).not.toContain('@blocked_by');
	});

	it('aligns columns across rows with different content widths', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'Short' }),
			makeTask({
				id: 'LONGERPREFIX-002',
				title: 'A much longer task title here',
			}),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		const lines = output.trimEnd().split('\n');

		// First │ should be at the same position in all rows
		const pipePositions = lines.map((l) => l.indexOf('│'));
		expect(pipePositions[0]).toBe(pipePositions[2]);
		expect(pipePositions[0]).toBe(pipePositions[3]);
	});

	it('colors priority in TTY mode', () => {
		const tasks = [
			makeTask({ id: 'TSK-001', title: 'Crit task', priority: 'crit' }),
			makeTask({ id: 'TSK-002', title: 'High task', priority: 'high' }),
			makeTask({ id: 'TSK-003', title: 'Low task', priority: 'low' }),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, true);

		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[31m!crit\u001b\[39m/);
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[33m!high\u001b\[39m/);
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[32m!low\u001b\[39m/);
	});

	it('applies gray to done task cells in TTY mode', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Done task',
				status: 'done' as TaskStatus,
			}),
		];
		const statusMap = new Map<string, TaskStatus>([['TSK-001', 'done']]);
		const output = formatTable(tasks, statusMap, true);

		// ID cell should be gray
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[90m\[x\] TSK-001\u001b\[39m/);
		// Title cell should be gray
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[90mDone task\u001b\[39m/);
	});

	it('shows done task with [x] status', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Done task',
				status: 'done' as TaskStatus,
			}),
		];
		const statusMap = new Map<string, TaskStatus>([['TSK-001', 'done']]);
		const output = formatTable(tasks, statusMap, false);
		expect(stripAnsi(output)).toContain('[x] TSK-001');
	});

	it('shows multiple tags space-separated', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Tagged',
				tags: ['#backend', '#urgent'],
			}),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		expect(output).toContain('#backend #urgent');
	});

	it('shows all columns when tasks have all metadata', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Full task',
				priority: 'high',
				tags: ['#backend'],
				properties: { iter: ['mvp'] },
			}),
		];
		const statusMap = new Map<string, TaskStatus>(
			tasks.map((t) => [t.id, t.status]),
		);
		const output = formatTable(tasks, statusMap, false);
		const header = output.split('\n')[0];
		expect(header).toContain('ID');
		expect(header).toContain('TITLE');
		expect(header).toContain('PRI');
		expect(header).toContain('TAGS');
		expect(header).toContain('PROPS');
	});

	it('blocker stays red for done tasks in TTY mode', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Done blocked',
				status: 'done' as TaskStatus,
				properties: { blocked_by: ['TSK-002'] },
			}),
		];
		const statusMap = new Map<string, TaskStatus>([['TSK-001', 'done']]);
		const output = formatTable(tasks, statusMap, true);

		// Blocker should be red, not gray
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[31m@blocked_by:TSK-002\u001b\[39m/);
	});

	it('other properties are gray for done tasks in TTY mode', () => {
		const tasks = [
			makeTask({
				id: 'TSK-001',
				title: 'Done with prop',
				status: 'done' as TaskStatus,
				properties: { iter: ['mvp'] },
			}),
		];
		const statusMap = new Map<string, TaskStatus>([['TSK-001', 'done']]);
		const output = formatTable(tasks, statusMap, true);

		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
		expect(output).toMatch(/\u001b\[90m@iter:mvp\u001b\[39m/);
	});
});
