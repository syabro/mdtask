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
		it('lists open tasks from markdown files', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 First task\n- [ ] TSK-002 Second task\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('First task');
			expect(output).toContain('TSK-002');
			expect(output).toContain('Second task');
		});

		it('shows only open tasks by default', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Open task\n- [x] TSK-002 Done task\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Open task');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('Done task');
		});

		it('shows done tasks with --all flag', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Open task\n- [x] TSK-002 Done task\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
		});

		it('formats output as [status] ID Title priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Priority task !high\n- [x] TSK-002 Done no priority\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// Should show status, ID, title, priority
			expect(output).toContain('[ ] TSK-001 Priority task !high');
			expect(output).toContain('[x] TSK-002 Done no priority');
		});
	});

	describe('search in subdirectories', () => {
		it('finds tasks in nested directories', () => {
			const subDir = join(tempDir, 'docs', 'subdir');
			mkdirSync(subDir, { recursive: true });
			writeFileSync(
				join(subDir, 'nested.md'),
				'- [ ] NESTED-001 Task in subdir\n',
			);
			writeFileSync(join(tempDir, 'root.md'), '- [ ] ROOT-001 Task in root\n');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('NESTED-001');
			expect(output).toContain('ROOT-001');
		});
	});

	describe('search in hidden directories', () => {
		it('finds tasks in hidden directories', () => {
			const hiddenDir = join(tempDir, '.hidden');
			mkdirSync(hiddenDir);
			writeFileSync(
				join(hiddenDir, 'secret.md'),
				'- [ ] HIDDEN-001 Secret task\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('HIDDEN-001');
		});
	});

	describe('edge cases', () => {
		it('handles directory with no markdown files', () => {
			writeFileSync(join(tempDir, 'readme.txt'), 'Not markdown');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('handles empty directory', () => {
			const code = run(['list']);
			expect(code).toBe(0);
		});

		it('handles files with no tasks', () => {
			writeFileSync(
				join(tempDir, 'notes.md'),
				'# Just a heading\nSome notes here\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('# Just a heading');
		});

		it('ignores node_modules by default', () => {
			const nodeModules = join(tempDir, 'node_modules');
			mkdirSync(nodeModules);
			writeFileSync(
				join(nodeModules, 'pkg.md'),
				'- [ ] PKG-001 Should not appear\n',
			);
			writeFileSync(join(tempDir, 'root.md'), '- [ ] ROOT-001 Should appear\n');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('ROOT-001');
			expect(output).not.toContain('PKG-001');
		});
	});

	describe('priority display', () => {
		it('shows !crit priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Critical task !crit\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!crit');
			expect(output).toContain('Critical task');
		});

		it('shows !high priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 High task !high\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!high');
		});

		it('shows !low priority', () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Low task !low\n');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!low');
		});

		it('shows no priority tag for medium priority tasks', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Medium priority task\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Medium priority task');
			// Should not have any priority marker between ID and title
			expect(output).toMatch(/TSK-001\s+Medium/);
		});
	});

	describe('blocked_by display', () => {
		it('shows single @blocked_by property', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Blocked task');
			expect(output).toContain('@blocked_by:TSK-002');
		});

		it('hides resolved blockers from output', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n- [x] TSK-002 Done blocker\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Blocked task');
			expect(output).not.toContain('@blocked_by:TSK-002');
		});

		it('shows only open blockers when mixed with resolved ones', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Mixed blockers @blocked_by:TSK-002 @blocked_by:TSK-003\n- [x] TSK-002 Done blocker\n- [ ] TSK-003 Open blocker\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).not.toContain('@blocked_by:TSK-002');
			expect(output).toContain('@blocked_by:TSK-003');
		});

		it('shows open blocker in red', () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:TSK-002\n- [ ] TSK-002 Open blocker\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[31m.*@blocked_by:TSK-002/);
		});

		it('shows non-existent blocker in red', () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Blocked task @blocked_by:NONEXISTENT\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[31m.*@blocked_by:NONEXISTENT/);
		});

		it('shows multiple @blocked_by properties', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-blocked @blocked_by:TSK-002 @blocked_by:FLS-001\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@blocked_by:TSK-002');
			expect(output).toContain('@blocked_by:FLS-001');
		});

		it('shows @blocked_by with priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Urgent blocked !high @blocked_by:TSK-002\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('!high');
			expect(output).toContain('@blocked_by:TSK-002');
		});

		it('shows no @blocked_by for unblocked tasks', () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Free task\n');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('Free task');
			expect(output).not.toContain('@blocked_by');
		});

		it('shows @blocked_by for done tasks', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done blocked @blocked_by:TSK-002\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('@blocked_by:TSK-002');
		});
	});

	describe('sorting', () => {
		it('sorts by priority with --sort=priority (crit → high → medium → low)', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Low task !low',
					'- [ ] TSK-002 Medium task',
					'- [ ] TSK-003 Critical task !crit',
					'- [ ] TSK-004 High task !high',
				].join('\n') + '\n',
			);

			const code = run(['list', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines).toHaveLength(4);
			expect(lines[0]).toContain('TSK-003'); // crit
			expect(lines[1]).toContain('TSK-004'); // high
			expect(lines[2]).toContain('TSK-002'); // medium (no priority)
			expect(lines[3]).toContain('TSK-001'); // low
		});

		it('preserves file order within same priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 First high !high',
					'- [ ] TSK-002 Second high !high',
					'- [ ] TSK-003 Third high !high',
				].join('\n') + '\n',
			);

			const code = run(['list', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines[0]).toContain('TSK-001');
			expect(lines[1]).toContain('TSK-002');
			expect(lines[2]).toContain('TSK-003');
		});

		it('default list (no --sort) preserves file order', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Low task !low',
					'- [ ] TSK-002 Critical task !crit',
					'- [ ] TSK-003 High task !high',
				].join('\n') + '\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines[0]).toContain('TSK-001'); // low, but first in file
			expect(lines[1]).toContain('TSK-002'); // crit, second in file
			expect(lines[2]).toContain('TSK-003'); // high, third in file
		});
	});

	describe('property display', () => {
		it('shows @iter property in list output', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 MVP task @iter:mvp\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('MVP task');
			expect(output).toContain('@iter:mvp');
		});

		it('shows multiple different properties', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-prop task @iter:mvp @status:in-progress\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@iter:mvp');
			expect(output).toContain('@status:in-progress');
		});

		it('shows properties sorted alphabetically by key', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Sorted props @status:wip @iter:mvp\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// iter comes before status alphabetically
			const iterIdx = output.indexOf('@iter:mvp');
			const statusIdx = output.indexOf('@status:wip');
			expect(iterIdx).toBeLessThan(statusIdx);
		});

		it('shows properties with priority and blockers', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Full metadata !high @blocked_by:TSK-002 @iter:mvp\n',
			);

			const code = run(['list']);
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

		it('shows multi-value properties as separate tokens', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Multi-val @tag:cli @tag:parser\n',
			);

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@tag:cli');
			expect(output).toContain('@tag:parser');
		});

		it('shows properties for done tasks in gray', () => {
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				writable: true,
				configurable: true,
			});

			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done with prop @iter:mvp\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// @iter:mvp should be inside gray ANSI codes
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI codes
			expect(output).toMatch(/\u001b\[90m.*@iter:mvp.*\u001b\[39m/);
		});

		it('shows properties after blockers for done tasks', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [x] TSK-001 Done blocked @blocked_by:TSK-002 @iter:mvp\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('@blocked_by:TSK-002');
			expect(output).toContain('@iter:mvp');
			// Blockers come before properties (same order as open tasks)
			const blockerIdx = output.indexOf('@blocked_by:TSK-002');
			const iterIdx = output.indexOf('@iter:mvp');
			expect(blockerIdx).toBeLessThan(iterIdx);
		});

		it('shows no properties for task without any', () => {
			writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Plain task\n');

			const code = run(['list']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('[ ] TSK-001 Plain task\n');
		});
	});

	describe('tag filtering', () => {
		it('filters by single tag', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Backend task #backend',
					'- [ ] TSK-002 Frontend task #frontend',
					'- [ ] TSK-003 Another backend #backend',
				].join('\n') + '\n',
			);

			const code = run(['list', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-003');
			expect(output).not.toContain('TSK-002');
		});

		it('filters by multiple tags with AND logic', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Backend urgent #backend #urgent',
					'- [ ] TSK-002 Backend normal #backend',
					'- [ ] TSK-003 Frontend urgent #frontend #urgent',
				].join('\n') + '\n',
			);

			const code = run(['list', '#backend', '#urgent']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('returns empty output when no tasks match tag', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Backend task #backend\n',
			);

			const code = run(['list', '#nonexistent']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('combines tag filter with --all', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Open backend #backend',
					'- [x] TSK-002 Done backend #backend',
					'- [ ] TSK-003 Open frontend #frontend',
				].join('\n') + '\n',
			);

			const code = run(['list', '--all', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('combines tag filter with --sort=priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Low backend #backend !low',
					'- [ ] TSK-002 High backend #backend !high',
					'- [ ] TSK-003 High frontend #frontend !high',
				].join('\n') + '\n',
			);

			const code = run(['list', '#backend', '--sort=priority']);
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
		it('filters by single priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Critical task !crit',
					'- [ ] TSK-002 High task !high',
					'- [ ] TSK-003 Medium task',
					'- [ ] TSK-004 Low task !low',
				].join('\n') + '\n',
			);

			const code = run(['list', '!high']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-001');
			expect(output).not.toContain('TSK-003');
			expect(output).not.toContain('TSK-004');
		});

		it('filters by multiple priorities with OR logic', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Critical task !crit',
					'- [ ] TSK-002 High task !high',
					'- [ ] TSK-003 Medium task',
					'- [ ] TSK-004 Low task !low',
				].join('\n') + '\n',
			);

			const code = run(['list', '!high', '!crit']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
			expect(output).not.toContain('TSK-004');
		});

		it('returns empty output when no tasks match priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Medium task\n- [ ] TSK-002 Low task !low\n',
			);

			const code = run(['list', '!crit']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toBe('');
		});

		it('combines priority filter with --all', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 Open high !high',
					'- [x] TSK-002 Done high !high',
					'- [ ] TSK-003 Open low !low',
				].join('\n') + '\n',
			);

			const code = run(['list', '--all', '!high']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});

		it('combines priority filter with --sort=priority', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 High task !high',
					'- [ ] TSK-002 Crit task !crit',
					'- [ ] TSK-003 Low task !low',
				].join('\n') + '\n',
			);

			const code = run(['list', '!high', '!crit', '--sort=priority']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			const lines = output.trim().split('\n');
			expect(lines).toHaveLength(2);
			expect(lines[0]).toContain('TSK-002'); // crit first
			expect(lines[1]).toContain('TSK-001'); // high second
			expect(output).not.toContain('TSK-003');
		});

		it('combines priority filter with tag filter', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				[
					'- [ ] TSK-001 High backend !high #backend',
					'- [ ] TSK-002 High frontend !high #frontend',
					'- [ ] TSK-003 Low backend !low #backend',
				].join('\n') + '\n',
			);

			const code = run(['list', '!high', '#backend']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(output).toContain('TSK-001');
			expect(output).not.toContain('TSK-002');
			expect(output).not.toContain('TSK-003');
		});
	});
});
