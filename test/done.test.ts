import {
	mkdtempSync,
	readdirSync,
	readFileSync,
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

describe('mdtask done', () => {
	let tempDir: string;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let _stdoutSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-test-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
		_stdoutSpy = vi
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

	it('toggles open task to done', () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\n');

		run(['done', 'TSK-001']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe('- [x] TSK-001 Fix the bug\n');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('toggles done task back to open', () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [x] TSK-001 Fix the bug\n');

		run(['done', 'TSK-001']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe('- [ ] TSK-001 Fix the bug\n');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('does not corrupt other lines', () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'# Tasks\n\n- [ ] TSK-001 Fix the bug\n  Description body.\n\n- [ ] TSK-002 Another task\n',
		);

		run(['done', 'TSK-001']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe(
			'# Tasks\n\n- [x] TSK-001 Fix the bug\n  Description body.\n\n- [ ] TSK-002 Another task\n',
		);
	});

	it('errors on duplicate ID', () => {
		writeFileSync(
			join(tempDir, 'file1.md'),
			'- [ ] TSK-001 First occurrence\n',
		);
		writeFileSync(
			join(tempDir, 'file2.md'),
			'- [ ] TSK-001 Second occurrence\n',
		);

		run(['done', 'TSK-001']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('errors on non-existent ID', () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		run(['done', 'NONEXISTENT-999']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('not found');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('preserves metadata after toggle', () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] TSK-001 Fix the bug\t\t@iter:mvp !high @blocked_by:TSK-002\n',
		);

		run(['done', 'TSK-001']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe(
			'- [x] TSK-001 Fix the bug\t\t@iter:mvp !high @blocked_by:TSK-002\n',
		);
	});
});
