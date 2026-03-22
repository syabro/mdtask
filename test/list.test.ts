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

		it('formats output as [status] ID priority Title', () => {
			writeFileSync(
				join(tempDir, 'tasks.md'),
				'- [ ] TSK-001 Priority task !high\n- [x] TSK-002 Done no priority\n',
			);

			const code = run(['list', '--all']);
			expect(code).toBe(0);

			const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
			// Should show status, ID, priority, title
			expect(output).toContain('[ ] TSK-001 !high Priority task');
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
});
