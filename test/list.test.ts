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
		gray: (s: string) => `\u001b[90m${s}\u001b[39m`,
		red: (s: string) => `\u001b[31m${s}\u001b[39m`,
		yellow: (s: string) => `\u001b[33m${s}\u001b[39m`,
		green: (s: string) => `\u001b[32m${s}\u001b[39m`,
		strikethrough: (s: string) => `\u001b[9m${s}\u001b[29m`,
	},
}));

import { run } from '../src/cli.js';

describe('mdtask list', () => {
	let tempDir: string;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;
	let _stderrSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-test-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
		stdoutSpy = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		_stderrSpy = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
		// Mock isTTY to be undefined (non-tty) by default for predictable tests
		Object.defineProperty(process.stdout, 'isTTY', {
			value: undefined,
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		process.chdir(originalCwd);
		vi.clearAllMocks();
		vi.restoreAllMocks();

		const cleanUp = (dir: string) => {
			try {
				const entries = readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
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

	describe('basic list output', () => {
		it('lists open tasks from markdown files', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 First task\n- [ ] TSK-002 Second task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('First task');
			expect(output).toContain('TSK-002');
			expect(output).toContain('Second task');
		});

		it('shows only open tasks by default', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Open task\n- [x] TSK-002 Done task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Open task');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('Done task');
		});

		it('shows done tasks with --all flag', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Open task\n- [x] TSK-002 Done task\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
		});

		it('formats output as [status] ID Title priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Priority task !high\n- [x] TSK-002 Done no priority\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// Should show status, ID, title, priority
			expect(output).toContain('[ ] TSK-001 Priority task !high');
			expect(output).toContain('[x] TSK-002 Done no priority');
		});
	});

	describe('search in subdirectories', () => {
		it('finds tasks in nested directories', async () => {
			const subDir = join(tempDir, 'docs', 'subdir');
			mkdirSync(subDir, { recursive: true });
			writeFileSync(
				join(subDir, 'nested.md'),
				'- [ ] NESTED-001 Task in subdir\n',
			);
			writeFileSync(join(tempDir, 'root.md'), '- [ ] ROOT-001 Task in root\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('NESTED-001');
			expect(output).toContain('ROOT-001');
		});
	});

	describe('search in hidden directories', () => {
		it('finds tasks in hidden directories', async () => {
			const hiddenDir = join(tempDir, '.hidden');
			mkdirSync(hiddenDir);
			writeFileSync(
				join(hiddenDir, 'secret.md'),
				'- [ ] HIDDEN-001 Secret task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('HIDDEN-001');
		});
	});

	describe('edge cases', () => {
		it('handles directory with no markdown files', async () => {
			writeFileSync(join(tempDir, 'readme.txt'), 'Not markdown');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('handles empty directory', async () => {
			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('handles files with no tasks', async () => {
			writeFileSync(
				join(tempDir, 'notes.md'),
				'# Just a heading\nSome notes here\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('# Just a heading');
		});

		it('ignores node_modules by default', async () => {
			const nodeModules = join(tempDir, 'node_modules');
			mkdirSync(nodeModules);
			writeFileSync(
				join(nodeModules, 'pkg.md'),
				'- [ ] PKG-001 Should not appear\n',
			);
			writeFileSync(join(tempDir, 'root.md'), '- [ ] ROOT-001 Should appear\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('ROOT-001');
			expect(output).not.toContain('PKG-001');
		});
	});

	describe('priority display', () => {
		it('shows !crit priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Critical task !crit\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!crit');
			expect(output).toContain('Critical task');
		});

		it('shows !high priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 High task !high\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!high');
		});

		it('shows !low priority', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Low task !low\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!low');
		});

		it('shows no priority tag for medium priority tasks', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Medium priority task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Medium priority task');
			// Should not have any priority marker between ID and title
			expect(output).toMatch(/TSK-001\s+Medium/);
		});
	});

	describe('blocked_by display', () => {
		it('shows single @blocked_by property', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Blocked task');
			expect(output).toContain('@blocked_by:TSK-002');
		});

		it('hides resolved blockers from output', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n- [x] TSK-002 Done blocker\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Blocked task');
			expect(output).not.toContain('@blocked_by:TSK-002');
		});

		it('shows only open blockers when mixed with resolved ones', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Mixed blockers @blocked_by:TSK-002 @blocked_by:TSK-003\n- [x] TSK-002 Done blocker\n- [ ] TSK-003 Open blocker\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('@blocked_by:TSK-002');
			expect(output).toContain('@blocked_by:TSK-003');
		});

		it('shows open blocker in red', async () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n- [ ] TSK-002 Open blocker\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[31m.*@blocked_by:TSK-002/);
		});

		it('shows non-existent blocker in red', async () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:NONEXISTENT\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[31m.*@blocked_by:NONEXISTENT/);
		});

		it('shows multiple @blocked_by properties', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-blocked @blocked_by:TSK-002 @blocked_by:FLS-001\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@blocked_by:TSK-002');
			expect(output).toContain('@blocked_by:FLS-001');
		});

		it('shows @blocked_by with priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Urgent blocked !high @blocked_by:TSK-002\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!high');
			expect(output).toContain('@blocked_by:TSK-002');
		});

		it('shows no @blocked_by for unblocked tasks', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Free task\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Free task');
			expect(output).not.toContain('@blocked_by');
		});

		it('shows @blocked_by for done tasks', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done blocked @blocked_by:TSK-002\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('@blocked_by:TSK-002');
		});
	});

	describe('sorting', () => {
		it('sorts by priority with --sort=priority (crit → high → medium → low)', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Low task !low',
					'- [ ] TSK-002 Medium task',
					'- [ ] TSK-003 Critical task !crit',
					'- [ ] TSK-004 High task !high',
				].join('\n')}\n`,
			);

			const code = await run(['list', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines).toHaveLength(4);
			expect(lines[0]).toContain('TSK-003'); // crit
			expect(lines[1]).toContain('TSK-004'); // high
			expect(lines[2]).toContain('TSK-002'); // medium (no priority)
			expect(lines[3]).toContain('TSK-001'); // low
		});

		it('preserves file order within same priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 First high !high',
					'- [ ] TSK-002 Second high !high',
					'- [ ] TSK-003 Third high !high',
				].join('\n')}\n`,
			);

			const code = await run(['list', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines[0]).toContain('TSK-001');
			expect(lines[1]).toContain('TSK-002');
			expect(lines[2]).toContain('TSK-003');
		});

		it('default list (no --sort) preserves file order', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Low task !low',
					'- [ ] TSK-002 Critical task !crit',
					'- [ ] TSK-003 High task !high',
				].join('\n')}\n`,
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines[0]).toContain('TSK-001'); // low, but first in file
			expect(lines[1]).toContain('TSK-002'); // crit, second in file
			expect(lines[2]).toContain('TSK-003'); // high, third in file
		});
	});

	describe('property display', () => {
		it('shows @iter property in list output', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 MVP task @iter:mvp\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('MVP task');
			expect(output).toContain('@iter:mvp');
		});

		it('shows multiple different properties', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-prop task @iter:mvp @status:in-progress\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@iter:mvp');
			expect(output).toContain('@status:in-progress');
		});

		it('shows properties sorted alphabetically by key', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Sorted props @status:wip @iter:mvp\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// iter comes before status alphabetically
			const iterIdx = output.indexOf('@iter:mvp');
			const statusIdx = output.indexOf('@status:wip');
			expect(iterIdx).toBeLessThan(statusIdx);
		});

		it('shows properties with priority and blockers', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Full metadata !high @blocked_by:TSK-002 @iter:mvp\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!high');
			expect(output).toContain('@blocked_by:TSK-002');
			expect(output).toContain('@iter:mvp');
			// Properties come after blockers
			const blockerIdx = output.indexOf('@blocked_by:TSK-002');
			const iterIdx = output.indexOf('@iter:mvp');
			expect(blockerIdx).toBeLessThan(iterIdx);
		});

		it('shows multi-value properties as separate tokens', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-val @tag:cli @tag:parser\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@tag:cli');
			expect(output).toContain('@tag:parser');
		});

		it('shows properties for done tasks in gray', async () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done with prop @iter:mvp\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// @iter:mvp should be inside gray ANSI codes
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[90m.*@iter:mvp.*\u001b\[39m/);
		});

		it('shows properties after blockers for done tasks', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done blocked @blocked_by:TSK-002 @iter:mvp\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@blocked_by:TSK-002');
			expect(output).toContain('@iter:mvp');
			// Blockers come before properties (same order as open tasks)
			const blockerIdx = output.indexOf('@blocked_by:TSK-002');
			const iterIdx = output.indexOf('@iter:mvp');
			expect(blockerIdx).toBeLessThan(iterIdx);
		});

		it('shows no properties for task without any', async () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Plain task\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('[ ] TSK-001 Plain task\n');
		});
	});

	describe('tag filtering', () => {
		it('filters by single tag', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Backend task #backend',
					'- [ ] TSK-002 Frontend task #frontend',
					'- [ ] TSK-003 Another backend #backend',
				].join('\n')}\n`,
			);

			const code = await run(['list', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-003');
			expect(output).not.toContain('TSK-002');
		});

		it('filters by multiple tags with AND logic', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Backend urgent #backend #urgent',
					'- [ ] TSK-002 Backend normal #backend',
					'- [ ] TSK-003 Frontend urgent #frontend #urgent',
				].join('\n')}\n`,
			);

			const code = await run(['list', '#backend', '#urgent']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('returns empty output when no tasks match tag', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Backend task #backend\n',
			);

			const code = await run(['list', '#nonexistent']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('combines tag filter with --all', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Open backend #backend',
					'- [x] TSK-002 Done backend #backend',
					'- [ ] TSK-003 Open frontend #frontend',
				].join('\n')}\n`,
			);

			const code = await run(['list', '--all', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('combines tag filter with --sort=priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Low backend #backend !low',
					'- [ ] TSK-002 High backend #backend !high',
					'- [ ] TSK-003 High frontend #frontend !high',
				].join('\n')}\n`,
			);

			const code = await run(['list', '#backend', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines).toHaveLength(2);
			expect(lines[0]).toContain('TSK-002'); // high
			expect(lines[1]).toContain('TSK-001'); // low
			expect(output).not.toContain('TSK-003');
		});
	});

	describe('priority filtering', () => {
		it('filters by single priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Critical task !crit',
					'- [ ] TSK-002 High task !high',
					'- [ ] TSK-003 Medium task',
					'- [ ] TSK-004 Low task !low',
				].join('\n')}\n`,
			);

			const code = await run(['list', '!high']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-001');
			expect(output).not.toContain('TSK-003');
			expect(output).not.toContain('TSK-004');
		});

		it('filters by multiple priorities with OR logic', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Critical task !crit',
					'- [ ] TSK-002 High task !high',
					'- [ ] TSK-003 Medium task',
					'- [ ] TSK-004 Low task !low',
				].join('\n')}\n`,
			);

			const code = await run(['list', '!high', '!crit']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
			expect(output).not.toContain('TSK-004');
		});

		it('returns empty output when no tasks match priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Medium task\n- [ ] TSK-002 Low task !low\n',
			);

			const code = await run(['list', '!crit']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('combines priority filter with --all', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Open high !high',
					'- [x] TSK-002 Done high !high',
					'- [ ] TSK-003 Open low !low',
				].join('\n')}\n`,
			);

			const code = await run(['list', '--all', '!high']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('combines priority filter with --sort=priority', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 High task !high',
					'- [ ] TSK-002 Crit task !crit',
					'- [ ] TSK-003 Low task !low',
				].join('\n')}\n`,
			);

			const code = await run(['list', '!high', '!crit', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines).toHaveLength(2);
			expect(lines[0]).toContain('TSK-002'); // crit first
			expect(lines[1]).toContain('TSK-001'); // high second
			expect(output).not.toContain('TSK-003');
		});

		it('combines priority filter with tag filter', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 High backend !high #backend',
					'- [ ] TSK-002 High frontend !high #frontend',
					'- [ ] TSK-003 Low backend !low #backend',
				].join('\n')}\n`,
			);

			const code = await run(['list', '!high', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});
	});

	describe('shell injection protection', () => {
		it('outputs shell metacharacters in titles verbatim', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Fix bug; rm -rf /',
					'- [ ] TSK-002 Check $(whoami) output',
					'- [ ] TSK-003 Test `id` command',
					'- [ ] TSK-004 Pipe |cat /etc/passwd',
				].join('\n')}\n`,
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('Fix bug; rm -rf /');
			expect(output).toContain('Check $(whoami) output');
			expect(output).toContain('Test `id` command');
			expect(output).toContain('Pipe |cat /etc/passwd');
		});

		it('outputs shell metacharacters in properties verbatim', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Task @status:$(whoami)\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@status:$(whoami)');
		});

		it('reads files from directories with shell metacharacters', async () => {
			const dangerDir = join(tempDir, 'docs $(rm)');
			mkdirSync(dangerDir, { recursive: true });
			writeFileSync(
				join(dangerDir, 'tasks.md'),
				'- [ ] TSK-001 Task in dangerous dir\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Task in dangerous dir');
		});

		it('task ID regex prevents shell metacharacters in IDs', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] VALID-001 Valid task',
					'- [ ] $(cmd)-001 Should not parse',
					'- [ ] ;rm-001 Should not parse',
				].join('\n')}\n`,
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('VALID-001');
			// Shell metacharacters should not appear as identified task IDs
			// (they may appear in the unidentified tasks warning section)
			const mainOutput = output.split('Warning:')[0];
			expect(mainOutput).not.toContain('$(cmd)');
			expect(mainOutput).not.toContain(';rm');
		});
	});

	describe('pipe behavior', () => {
		it('outputs no ANSI codes and correct plain text when stdout is not a TTY', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Open task !high',
					'- [x] TSK-002 Done task !low @blocked_by:TSK-003 @iter:mvp',
					'- [ ] TSK-003 Blocker task',
				].join('\n')}\n`,
			);

			// isTTY is already undefined (non-tty) by default in beforeEach
			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes absence
			expect(output).not.toMatch(/\u001b\[/);
			// Done tasks render as plain text with all metadata intact
			expect(output).toContain(
				'[x] TSK-002 Done task !low @blocked_by:TSK-003 @iter:mvp',
			);
		});

		it('output lines are parseable when piped', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				`${[
					'- [ ] TSK-001 Simple task',
					'- [ ] TSK-002 Priority task !high',
					'- [ ] TSK-003 Blocked task @blocked_by:TSK-004',
					'- [x] TSK-005 Done task !low @iter:mvp',
				].join('\n')}\n`,
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');

			// Each line should match: [status] ID Title [!priority] [@key:value...]
			const linePattern = /^\[[ x]\] [A-Z]+-\d+ .+$/;
			for (const line of lines) {
				expect(line).toMatch(linePattern);
			}
		});
	});

	describe('excludePrefixes', () => {
		it('hides tasks matching excluded prefixes', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Real task\n- [ ] EXMPL-001 Example task\n- [ ] EXMPL-002 Another example\n- [ ] TEST-001 Test example\n',
			);
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ excludePrefixes: ['EXMPL', 'TEST'] }),
			);

			await run(['list']);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).not.toContain('EXMPL-001');
			expect(output).not.toContain('EXMPL-002');
			expect(output).not.toContain('TEST-001');
		});
	});

	describe('unidentified tasks warning', () => {
		it('shows warning for tasks without IDs after main list', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Identified task\n- [ ] Basic boiling\n- [ ] Tea presets\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain(
				'Warning: tasks without IDs (run `mdtask ids` to assign):',
			);
			expect(output).toContain('Basic boiling');
			expect(output).toContain('Tea presets');
		});

		it('shows file path and line number for unidentified tasks', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'# Header\n\n- [ ] No ID task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('No ID task');
			expect(output).toContain('tasks.md:3');
		});

		it('shows no warning when all tasks have IDs', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 First task\n- [ ] TSK-002 Second task\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('Warning');
		});

		it('shows no warning when there are no tasks at all', async () => {
			writeFileSync(join(tempDir, 'notes.md'), '# Just notes\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('Warning');
		});

		it('hides done unidentified tasks by default', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] Open unidentified\n- [x] Done unidentified\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('Open unidentified');
			expect(output).not.toContain('Done unidentified');
		});

		it('shows done unidentified tasks with --all', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] Open unidentified\n- [x] Done unidentified\n',
			);

			const code = await run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('Open unidentified');
			expect(output).toContain('Done unidentified');
		});

		it('shows warning regardless of tag/priority filters', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Tagged task #backend\n- [ ] Unidentified task\n',
			);

			const code = await run(['list', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Warning');
			expect(output).toContain('Unidentified task');
		});

		it('excludes unidentified tasks with excluded seed prefixes', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Real task\n- [ ] EXMPL- Example task\n- [ ] Real unidentified\n',
			);
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ excludePrefixes: ['EXMPL'] }),
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('Real unidentified');
			expect(output).not.toContain('Example task');
		});

		it('shows warning with yellow header in TTY mode', async () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] Unidentified task\n');

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// Warning header should be yellow
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[33m.*Warning/);
		});

		it('shows warning only for unidentified tasks, not after identified ones', async () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Identified\n- [ ] Unidentified\n',
			);

			const code = await run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// Warning should come after the identified task
			const identifiedIdx = output.indexOf('TSK-001');
			const warningIdx = output.indexOf('Warning');
			expect(identifiedIdx).toBeLessThan(warningIdx);
		});
	});
});
