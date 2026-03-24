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

describe('mdtask view', () => {
	let tempDir: string;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;

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

	it('outputs full task block (header + body)', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Fix the bug\n  Description line 1.\n  Description line 2.\n',
		);

		run(['view', 'TSK-001']);

		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('- [ ] TSK-001 Fix the bug');
		expect(output).toContain('Description line 1.');
		expect(output).toContain('Description line 2.');
	});

	it('errors on non-existent ID', () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		run(['view', 'NONEXISTENT-999']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('not found');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('outputs header only when task has no body', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 No body task\n- [ ] TSK-002 Next task\n',
		);

		run(['view', 'TSK-001']);

		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('- [ ] TSK-001 No body task');
		// Should not have extra blank lines
		expect(output.trim()).toBe('- [ ] TSK-001 No body task');
	});

	it('preserves metadata in header line', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Task with meta\t\t@iter:mvp @blocked_by:TSK-002 !high\n  Body here.\n',
		);

		run(['view', 'TSK-001']);

		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('@iter:mvp');
		expect(output).toContain('@blocked_by:TSK-002');
		expect(output).toContain('!high');
	});

	it('dedents body content', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Task\n  Line 1\n    Nested line\n  Line 2\n',
		);

		run(['view', 'TSK-001']);

		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('Line 1');
		expect(output).toContain('  Nested line');
		expect(output).toContain('Line 2');
	});

	it('finds task in subdirectory', () => {
		const subDir = join(tempDir, 'docs', 'prd');
		mkdirSync(subDir, { recursive: true });
		writeFileSync(
			join(subDir, 'tasks.md'),
			'- [ ] TSK-001 Nested task\n  Found in subdir.\n',
		);

		run(['view', 'TSK-001']);

		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('TSK-001');
		expect(output).toContain('Found in subdir.');
	});
});
