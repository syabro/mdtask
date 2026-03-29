import {
	mkdirSync,
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
		gray: (s: string) => s,
		red: (s: string) => s,
		yellow: (s: string) => s,
		green: (s: string) => s,
		strikethrough: (s: string) => s,
	},
}));

const mockQuestion = vi.fn();
const mockClose = vi.fn();
vi.mock('node:readline/promises', () => ({
	createInterface: () => ({
		question: mockQuestion,
		close: mockClose,
	}),
}));

import { run } from '../src/cli.js';

describe('mdtask ids', () => {
	let tempDir: string;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;
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

	it('assigns ID to a single unidentified task', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Existing task\n- [ ] New task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] CLI-002 New task');
	});

	it('assigns sequential IDs to multiple unidentified tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] CLI-001 Existing\n- [ ] First new\n- [ ] Second new\n',
		);

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] CLI-002 First new');
		expect(content).toContain('- [ ] CLI-003 Second new');
	});

	it('derives prefix from existing tasks in the file', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-010 Existing task\n- [ ] New task here\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] TSK-011 New task here');
	});

	it('uses seed prefix when no existing IDed tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] FTR- New feature task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] FTR-001 New feature task');
	});

	it('errors when file has no prefix source', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] Task without any prefix\n');

		await run(['ids']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('no prefix');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('NNN is globally unique across files', async () => {
		const file1 = join(tempDir, 'cli.md');
		const file2 = join(tempDir, 'task.md');
		writeFileSync(file1, '- [ ] CLI-005 Existing CLI task\n');
		writeFileSync(
			file2,
			'- [ ] TSK-003 Existing TSK task\n- [ ] New TSK task\n',
		);

		await run(['ids']);

		const content2 = readFileSync(file2, 'utf-8');
		// Global max is 5 (from CLI-005), so next should be TSK-006
		expect(content2).toContain('- [ ] TSK-006 New TSK task');
	});

	it('zero-pads IDs to 3 digits', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Existing\n- [ ] New task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('CLI-002');
	});

	it('does not zero-pad beyond existing width', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-1000 Existing\n- [ ] New task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('CLI-1001');
	});

	it('does not modify already-identified tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Keep this\n- [x] CLI-002 And this\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe('- [ ] CLI-001 Keep this\n- [x] CLI-002 And this\n');
	});

	it('preserves metadata on unidentified tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] CLI-001 Existing\n- [ ] New task\t\t#backend !high\n',
		);

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] CLI-002 New task\t\t#backend !high');
	});

	it('handles mixed identified and unidentified tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] CLI-001 First\n- [ ] New one\n- [x] CLI-003 Third\n- [ ] Another new\n',
		);

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] CLI-004 New one');
		expect(content).toContain('- [ ] CLI-005 Another new');
		// Existing tasks unchanged
		expect(content).toContain('- [ ] CLI-001 First');
		expect(content).toContain('- [x] CLI-003 Third');
	});

	it('uses most frequent prefix when file has multiple', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] CLI-001 First\n- [ ] CLI-002 Second\n- [ ] TSK-003 Third\n- [ ] New task\n',
		);

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		// CLI appears twice, TSK once — use CLI
		expect(content).toContain('- [ ] CLI-004 New task');
	});

	it('reports duplicate numeric parts as warnings', async () => {
		const file1 = join(tempDir, 'cli.md');
		const file2 = join(tempDir, 'task.md');
		writeFileSync(file1, '- [ ] CLI-001 CLI task\n');
		writeFileSync(file2, '- [ ] TSK-001 TSK task\n');

		await run(['ids']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('warning');
		expect(stderr).toContain('001');
	});

	it('prints assigned IDs to stdout with checkbox prefix', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Existing\n- [ ] New task\n');

		await run(['ids']);

		const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stdout).toContain('- [ ] CLI-002 New task');
	});

	it('does nothing when no unidentified tasks exist', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Only IDed tasks\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe('- [ ] CLI-001 Only IDed tasks\n');
	});

	it('removes seed prefix marker after assigning ID', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] FTR- Build the feature\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [ ] FTR-001 Build the feature');
		// Should not have "FTR- " leftover in title
		expect(content).not.toContain('FTR- Build');
	});

	it('handles done unidentified tasks', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Open\n- [x] Done task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('- [x] CLI-002 Done task');

		const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stdout).toContain('- [x] CLI-002 Done task');
	});

	it('seed prefix overrides file prefix for that task', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] TSK-001 Existing\n- [ ] CLI- Specific prefix task\n- [ ] Generic task\n',
		);

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		// Seed task uses its own prefix CLI
		expect(content).toContain('- [ ] CLI-002 Specific prefix task');
		// Generic task uses file prefix TSK
		expect(content).toContain('- [ ] TSK-003 Generic task');
	});

	it('does not mutate files when another file has no prefix', async () => {
		const file1 = join(tempDir, 'good.md');
		const file2 = join(tempDir, 'bad.md');
		writeFileSync(file1, '- [ ] CLI-001 Existing\n- [ ] New task\n');
		writeFileSync(file2, '- [ ] Task with no prefix source\n');

		await run(['ids']);

		// file1 should NOT have been mutated because file2 fails validation
		const content1 = readFileSync(file1, 'utf-8');
		expect(content1).toBe('- [ ] CLI-001 Existing\n- [ ] New task\n');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('does not touch indented checkbox lines', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] CLI-001 Parent task\n  - [ ] Not a real task\n');

		await run(['ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toBe(
			'- [ ] CLI-001 Parent task\n  - [ ] Not a real task\n',
		);
	});

	describe('interactive prefix prompt', () => {
		const originalIsTTY = process.stdin.isTTY;

		afterEach(() => {
			process.stdin.isTTY = originalIsTTY;
		});

		it('prompts for prefix when TTY and no prefix source', async () => {
			const file = join(tempDir, 'tasks.md');
			writeFileSync(file, '- [ ] Task without any prefix\n');

			process.stdin.isTTY = true;
			mockQuestion.mockResolvedValueOnce('NEW');

			await run(['ids']);

			const content = readFileSync(file, 'utf-8');
			expect(content).toContain('- [ ] NEW-001 Task without any prefix');
			expect(mockQuestion).toHaveBeenCalledWith(
				expect.stringContaining('Enter prefix for'),
			);
			expect(mockClose).toHaveBeenCalled();
		});

		it('accepts lowercase input and uppercases it', async () => {
			const file = join(tempDir, 'tasks.md');
			writeFileSync(file, '- [ ] Task without any prefix\n');

			process.stdin.isTTY = true;
			mockQuestion.mockResolvedValueOnce('feat');

			await run(['ids']);

			const content = readFileSync(file, 'utf-8');
			expect(content).toContain('- [ ] FEAT-001 Task without any prefix');
		});

		it('errors on empty prefix input', async () => {
			const file = join(tempDir, 'tasks.md');
			writeFileSync(file, '- [ ] Task without any prefix\n');

			process.stdin.isTTY = true;
			mockQuestion.mockResolvedValueOnce('  ');

			await run(['ids']);

			const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(stderr).toContain('invalid prefix');
			expect(exitSpy).toHaveBeenCalledWith(1);
			expect(mockClose).toHaveBeenCalled();
		});

		it('errors on invalid prefix with special characters', async () => {
			const file = join(tempDir, 'tasks.md');
			writeFileSync(file, '- [ ] Task without any prefix\n');

			process.stdin.isTTY = true;
			mockQuestion.mockResolvedValueOnce('AB-CD');

			await run(['ids']);

			const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(stderr).toContain('invalid prefix');
			expect(exitSpy).toHaveBeenCalledWith(1);
		});

		it('still errors in non-TTY mode (pipe)', async () => {
			const file = join(tempDir, 'tasks.md');
			writeFileSync(file, '- [ ] Task without any prefix\n');

			process.stdin.isTTY = undefined as unknown as boolean;

			await run(['ids']);

			const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
			expect(stderr).toContain('no prefix');
			expect(exitSpy).toHaveBeenCalledWith(1);
		});
	});
});
