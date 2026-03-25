import { describe, expect, it } from 'vitest';
import { resolveTaskId, type Task } from '../src/task.js';

function makeTask(id: string, filePath = 'test.md', lineNumber = 1): Task {
	return {
		status: 'open',
		id,
		title: `Task ${id}`,
		rawMetadata: '',
		tags: [],
		priority: null,
		properties: Object.create(null),
		filePath,
		lineNumber,
	};
}

describe('resolveTaskId', () => {
	const tasks = [
		makeTask('CLI-001'),
		makeTask('CLI-022'),
		makeTask('TSK-038'),
		makeTask('PRJ-029'),
	];

	it('resolves exact ID match', () => {
		const result = resolveTaskId('CLI-022', tasks);
		expect(result.id).toBe('CLI-022');
	});

	it('resolves numeric lookup', () => {
		const result = resolveTaskId('22', tasks);
		expect(result.id).toBe('CLI-022');
	});

	it('resolves numeric lookup with leading zeros', () => {
		const result = resolveTaskId('001', tasks);
		expect(result.id).toBe('CLI-001');
	});

	it('throws on not found (exact)', () => {
		expect(() => resolveTaskId('CLI-999', tasks)).toThrow('not found');
	});

	it('throws on not found (numeric)', () => {
		expect(() => resolveTaskId('999', tasks)).toThrow('not found');
	});

	it('throws on duplicate exact ID', () => {
		const dupes = [makeTask('CLI-001', 'a.md'), makeTask('CLI-001', 'b.md')];
		expect(() => resolveTaskId('CLI-001', dupes)).toThrow('duplicate');
	});

	it('throws on ambiguous numeric ID', () => {
		const ambiguous = [makeTask('CLI-001'), makeTask('TSK-001')];
		expect(() => resolveTaskId('1', ambiguous)).toThrow('ambiguous');
	});

	it('throws on invalid format', () => {
		expect(() => resolveTaskId('foo', tasks)).toThrow('invalid');
	});

	it('throws on empty input', () => {
		expect(() => resolveTaskId('', tasks)).toThrow('invalid');
	});

	it('throws on partial ID format like CLI-', () => {
		expect(() => resolveTaskId('CLI-', tasks)).toThrow('invalid');
	});
});
