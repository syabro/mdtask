import {
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

vi.mock('node:child_process', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:child_process')>();
	return {
		...actual,
		execFileSync: vi.fn(),
	};
});

import { execFileSync } from 'node:child_process';
import { run } from '../src/cli.js';

describe('mdtask open', () => {
	let tempDir: string;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let _stdoutSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let originalEditor: string | undefined;

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
		originalEditor = process.env.EDITOR;
		process.env.EDITOR = 'vim';
		vi.mocked(execFileSync).mockReset();
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalEditor === undefined) {
			delete process.env.EDITOR;
		} else {
			process.env.EDITOR = originalEditor;
		}
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

	it('opens $EDITOR with +lineNumber and file path', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'# Tasks\n\n- [ ] TSK-001 Fix the bug\n  Description.\n',
		);

		await run(['open', 'TSK-001']);

		expect(execFileSync).toHaveBeenCalledTimes(1);
		const args = vi.mocked(execFileSync).mock.calls[0];
		expect(args[0]).toBe('vim');
		expect(args[1]).toEqual(['+3', expect.stringContaining('tasks.md')]);
		expect(args[2]).toEqual({ stdio: 'inherit' });
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('errors on non-existent ID', async () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		await run(['open', 'NONEXISTENT-999']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('not found');
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(execFileSync).not.toHaveBeenCalled();
	});

	it('uses execFileSync not shell exec to prevent injection', async () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		await run(['open', 'TSK-001']);

		// execFileSync is called (not execSync which would use shell)
		expect(execFileSync).toHaveBeenCalledTimes(1);
		const call = vi.mocked(execFileSync).mock.calls[0];
		// First arg is the editor binary, second is args array — no shell interpretation
		expect(call[0]).toBe('vim');
		expect(Array.isArray(call[1])).toBe(true);
		// No shell: true in options
		expect(call[2]).not.toHaveProperty('shell');
	});

	it('passes $EDITOR with shell metacharacters as literal binary name', async () => {
		process.env.EDITOR = '/usr/bin/my;editor';
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		await run(['open', 'TSK-001']);

		// execFileSync should receive the literal editor path, not shell-interpreted
		expect(execFileSync).toHaveBeenCalledTimes(1);
		const call = vi.mocked(execFileSync).mock.calls[0];
		expect(call[0]).toBe('/usr/bin/my;editor');
	});

	it('errors when $EDITOR is not set', async () => {
		delete process.env.EDITOR;
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		await run(['open', 'TSK-001']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('EDITOR');
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(execFileSync).not.toHaveBeenCalled();
	});
});
