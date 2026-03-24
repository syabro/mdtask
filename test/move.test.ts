import {
	existsSync,
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

describe('mdtask move', () => {
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

	it('removes task from source file', () => {
		const source = join(tempDir, 'source.md');
		const target = join(tempDir, 'target.md');
		writeFileSync(
			source,
			'# Tasks\n\n- [ ] TSK-001 Fix the bug\n\n- [ ] TSK-002 Another task\n',
		);
		writeFileSync(target, '# Target\n');

		run(['move', 'TSK-001', target]);

		const content = readFileSync(source, 'utf-8');
		expect(content).not.toContain('TSK-001');
		expect(content).toContain('TSK-002');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('adds task to target file', () => {
		const source = join(tempDir, 'source.md');
		const target = join(tempDir, 'target.md');
		writeFileSync(source, '- [ ] TSK-001 Fix the bug\n');
		writeFileSync(target, '# Target\n');

		run(['move', 'TSK-001', target]);

		const content = readFileSync(target, 'utf-8');
		expect(content).toContain('- [ ] TSK-001 Fix the bug');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('moves entire block (header + body)', () => {
		const source = join(tempDir, 'source.md');
		const target = join(tempDir, 'target.md');
		writeFileSync(
			source,
			'- [ ] TSK-001 Fix the bug\n  Description line 1.\n  Description line 2.\n',
		);
		writeFileSync(target, '# Target\n');

		run(['move', 'TSK-001', target]);

		const sourceContent = readFileSync(source, 'utf-8');
		expect(sourceContent).not.toContain('TSK-001');
		expect(sourceContent).not.toContain('Description line 1');

		const targetContent = readFileSync(target, 'utf-8');
		expect(targetContent).toContain('- [ ] TSK-001 Fix the bug');
		expect(targetContent).toContain('  Description line 1.');
		expect(targetContent).toContain('  Description line 2.');
	});

	it('creates target file if it does not exist', () => {
		const source = join(tempDir, 'source.md');
		const target = join(tempDir, 'new-target.md');
		writeFileSync(source, '- [ ] TSK-001 Fix the bug\n');

		expect(existsSync(target)).toBe(false);

		run(['move', 'TSK-001', target]);

		expect(existsSync(target)).toBe(true);
		const content = readFileSync(target, 'utf-8');
		expect(content).toContain('- [ ] TSK-001 Fix the bug');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('is a no-op when moving to same file', () => {
		const source = join(tempDir, 'source.md');
		const originalContent = '- [ ] TSK-001 Fix the bug\n  Description.\n';
		writeFileSync(source, originalContent);

		run(['move', 'TSK-001', source]);

		const content = readFileSync(source, 'utf-8');
		expect(content).toBe(originalContent);
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('errors on non-existent ID', () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');
		const target = join(tempDir, 'target.md');

		run(['move', 'NONEXISTENT-999', target]);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('not found');
		expect(exitSpy).toHaveBeenCalledWith(1);
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
		const target = join(tempDir, 'target.md');

		run(['move', 'TSK-001', target]);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('keeps source file when it becomes empty after move', () => {
		const source = join(tempDir, 'source.md');
		writeFileSync(source, '- [ ] TSK-001 Fix the bug\n');
		const target = join(tempDir, 'target.md');
		writeFileSync(target, '# Target\n');

		run(['move', 'TSK-001', target]);

		expect(existsSync(source)).toBe(true);
	});

	it('preserves task metadata after move', () => {
		const source = join(tempDir, 'source.md');
		const target = join(tempDir, 'target.md');
		writeFileSync(
			source,
			'- [ ] TSK-001 Fix the bug\t\t@iter:mvp !high @blocked_by:TSK-002\n',
		);
		writeFileSync(target, '# Target\n');

		run(['move', 'TSK-001', target]);

		const content = readFileSync(target, 'utf-8');
		expect(content).toContain(
			'- [ ] TSK-001 Fix the bug\t\t@iter:mvp !high @blocked_by:TSK-002',
		);
	});
});
