import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmdirSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('picocolors', () => ({
	default: {
		gray: (s: string) => `<c>90m${s}<c>39m`,
		red: (s: string) => `<c>31m${s}<c>39m`,
		yellow: (s: string) => `<c>33m${s}<c>39m`,
		green: (s: string) => `<c>32m${s}<c>39m`,
		strikethrough: (s: string) => `<c>9m${s}<c>29m`,
	},
}));

import { run } from '../src/cli.js';

describe('mdtask --json', () => {
	let tempDir: string;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	const output = () => stdoutSpy.mock.calls.map((c) => String(c[0])).join('');

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-test-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
		stdoutSpy = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		stderrSpy = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
		exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);
		Object.defineProperty(process.stdout, 'isTTY', {
			value: undefined,
			configurable: true,
		});
	});

	afterEach(() => {
		process.chdir(originalCwd);
		vi.clearAllMocks();
		vi.restoreAllMocks();
		const cleanUp = (dir: string) => {
			try {
				for (const entry of readdirSync(dir, { withFileTypes: true })) {
					const fullPath = join(dir, entry.name);
					if (entry.isDirectory()) {
						cleanUp(fullPath);
						rmdirSync(fullPath);
					} else {
						unlinkSync(fullPath);
					}
				}
			} catch {
				// Directory might not exist
			}
		};
		cleanUp(tempDir);
		try {
			rmdirSync(tempDir);
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('list --json', () => {
		it('prints a JSON array parseable by JSON.parse', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 First task\n  Body.\n\n- [ ] TSK-002 Second task\n',
			);

			await run(['list', '--json']);

			const parsed = JSON.parse(output());
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed).toHaveLength(2);
			expect(parsed.map((t: { id: string }) => t.id)).toEqual([
				'TSK-001',
				'TSK-002',
			]);
		});

		it('exposes the full field set with correct location', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Fix login #backend #auth !high @iter:mvp\n  Body.\n',
			);

			await run(['list', '--json']);

			const [task] = JSON.parse(output());
			expect(task).toEqual({
				id: 'TSK-001',
				status: 'open',
				title: 'Fix login',
				tags: ['backend', 'auth'],
				priority: 'high',
				properties: { iter: ['mvp'] },
				file: 'tasks.md',
				line: 1,
			});
		});

		it('uses empty defaults when metadata is absent', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Bare task\n');

			await run(['list', '--json']);

			const [task] = JSON.parse(output());
			expect(task.tags).toEqual([]);
			expect(task.priority).toBeNull();
			expect(task.properties).toEqual({});
		});

		it('keeps property values as arrays, including multi-value', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-009 @blocked_by:TSK-010\n',
			);

			// --blocked so the task with unresolved blockers isn't hidden.
			await run(['list', '--blocked', '--json']);

			const [task] = JSON.parse(output());
			expect(task.properties.blocked_by).toEqual(['TSK-009', 'TSK-010']);
		});

		it('strips the leading # from tags', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Tagged #backend\n',
			);

			await run(['list', '--json']);

			const [task] = JSON.parse(output());
			expect(task.tags).toEqual(['backend']);
		});

		it('prints [] for no matching tasks', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [x] TSK-001 Done task\n');

			await run(['list', '--json']);

			expect(JSON.parse(output())).toEqual([]);
		});

		it('emits no notes, warnings, or ANSI codes', async () => {
			// A blocked task (would print a "Note:" line) and an unidentified task
			// (would print a "Warning:" line) in human mode.
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked @blocked_by:TSK-999\n- [ ] No id here\n',
			);

			await run(['list', '--json']);

			const out = output();
			expect(() => JSON.parse(out)).not.toThrow();
			expect(out).not.toContain('Note:');
			expect(out).not.toContain('Warning:');
			expect(out).not.toContain('<c>');
		});

		it('respects --all and --tag filters', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Open #backend\n- [x] TSK-002 Done #backend\n- [ ] TSK-003 Open #frontend\n',
			);

			await run(['list', '--all', '--tag', 'backend', '--json']);

			const ids = JSON.parse(output()).map((t: { id: string }) => t.id);
			expect(ids).toEqual(['TSK-001', 'TSK-002']);
		});
	});

	describe('view --json', () => {
		it('prints a single object including the body', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Fix the bug !high\n  Line one.\n  Line two.\n',
			);

			await run(['view', 'TSK-001', '--json']);

			const task = JSON.parse(output());
			expect(task).toEqual({
				id: 'TSK-001',
				status: 'open',
				title: 'Fix the bug',
				tags: [],
				priority: 'high',
				properties: {},
				file: 'tasks.md',
				line: 1,
				body: 'Line one.\nLine two.',
			});
		});

		it('uses an empty string body when the task has none', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 No body\n');

			await run(['view', 'TSK-001', '--json']);

			const task = JSON.parse(output());
			expect(task.body).toBe('');
		});

		it('resolves by numeric shortcut and reports cwd-relative path', async () => {
			const subDir = join(tempDir, 'docs', 'specs');
			mkdirSync(subDir, { recursive: true });
			writeFileSync(
				join(subDir, 'cli.md'),
				'- [ ] TSK-001 First\n\n- [ ] TSK-002 Nested\n',
			);

			await run(['view', '2', '--json']);

			const task = JSON.parse(output());
			expect(task.id).toBe('TSK-002');
			expect(task.file).toBe('docs/specs/cli.md');
			expect(task.line).toBe(3);
		});

		it('errors to stderr and exits 1 on missing ID, printing no JSON', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

			await run(['view', 'TSK-404', '--json']);

			expect(output()).toBe('');
			expect(stderrSpy).toHaveBeenCalled();
			expect(exitSpy).toHaveBeenCalledWith(1);
		});
	});
});
