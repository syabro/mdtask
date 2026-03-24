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

describe('mdtask validate', () => {
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

	it('valid file — no errors, no warnings', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Fix bug\n- [ ] TSK-002 Add feature\n',
		);

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toBe('');
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('duplicate ID in same file — error, exit 1', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 First task\n- [ ] TSK-001 Duplicate task\n',
		);

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('error');
		expect(stderr).toContain('TSK-001');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('duplicate ID across files — error, exit 1', () => {
		writeFileSync(join(tempDir, 'a.md'), '- [ ] TSK-001 Task in file a\n');
		writeFileSync(join(tempDir, 'b.md'), '- [ ] TSK-001 Task in file b\n');

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('error');
		expect(stderr).toContain('TSK-001');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('empty tag — warning on stderr, no exit 1', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Task with empty tag\t\t# #valid\n',
		);

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('warning');
		expect(stderr).toContain('empty tag');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('malformed property @key without :value — warning', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 Task with bad prop\t\t@broken\n',
		);

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('warning');
		expect(stderr).toContain('malformed');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('multiple issues — all reported, exit 1 if error present', () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TSK-001 First\n- [ ] TSK-001 Duplicate\n- [ ] TSK-002 Empty tag\t\t# \n',
		);

		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('duplicate');
		expect(stderr).toContain('empty tag');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('no markdown files — clean exit', () => {
		// Empty directory, no .md files
		run(['validate']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toBe('');
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('respects --path option', () => {
		const subDir = join(tempDir, 'sub');
		mkdirSync(subDir);
		writeFileSync(
			join(subDir, 'tasks.md'),
			'- [ ] TSK-001 Task\n- [ ] TSK-001 Duplicate\n',
		);

		run(['validate', '--path', subDir]);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});
