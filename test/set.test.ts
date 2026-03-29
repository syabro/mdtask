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

import { run } from '../src/cli.js';

describe('mdtask set', () => {
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

	it('adds a single tag to a task', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\n');

		await run(['set', 'TSK-001', '#backend']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('TSK-001');
		expect(content).toContain('#backend');
	});

	it('adds a property to a task', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\n');

		await run(['set', 'TSK-001', '@iter:new-ids']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('@iter:new-ids');
	});

	it('adds multiple tokens at once', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\n');

		await run(['set', 'TSK-001', '#backend', '!high', '@iter:mvp']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('#backend');
		expect(content).toContain('!high');
		expect(content).toContain('@iter:mvp');
	});

	it('sets tokens on multiple IDs', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] TSK-001 First task\n- [ ] TSK-002 Second task\n',
		);

		await run(['set', 'TSK-001', 'TSK-002', '@iter:new-ids']);

		const content = readFileSync(file, 'utf-8');
		const lines = content.split('\n');
		expect(lines[0]).toContain('@iter:new-ids');
		expect(lines[1]).toContain('@iter:new-ids');
	});

	it('supports comma-separated IDs', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'- [ ] TSK-001 First task\n- [ ] TSK-002 Second task\n',
		);

		await run(['set', 'TSK-001,TSK-002', '#feature']);

		const content = readFileSync(file, 'utf-8');
		const lines = content.split('\n');
		expect(lines[0]).toContain('#feature');
		expect(lines[1]).toContain('#feature');
	});

	it('skips duplicate tag', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\t\t#backend\n');

		await run(['set', 'TSK-001', '#backend']);

		const content = readFileSync(file, 'utf-8');
		// Should have exactly one #backend, not two
		const matches = content.match(/#backend/g);
		expect(matches).toHaveLength(1);
	});

	it('does not skip similar but different tag', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\t\t#bug\n');

		await run(['set', 'TSK-001', '#bugfix']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('#bug');
		expect(content).toContain('#bugfix');
	});

	it('does not remove priority-like text from title', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix !important bug\t\t!low\n');

		await run(['set', 'TSK-001', '!high']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('!important');
		expect(content).toContain('!high');
		expect(content).not.toContain('!low');
	});

	it('replaces existing priority', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\t\t!low\n');

		await run(['set', 'TSK-001', '!high']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('!high');
		expect(content).not.toContain('!low');
	});

	it('appends duplicate property key (multiple values allowed)', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\t\t@blocked_by:TSK-002\n');

		await run(['set', 'TSK-001', '@blocked_by:TSK-003']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('@blocked_by:TSK-002');
		expect(content).toContain('@blocked_by:TSK-003');
	});

	it('appends metadata with tab separator when task has none', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(file, '- [ ] TSK-001 Fix the bug\n');

		await run(['set', 'TSK-001', '#backend']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('\t\t#backend');
	});

	it('errors on non-existent ID', async () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [ ] TSK-001 Some task\n');

		await run(['set', 'NONEXISTENT-999', '#tag']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('not found');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('errors on duplicate ID', async () => {
		writeFileSync(
			join(tempDir, 'file1.md'),
			'- [ ] TSK-001 First occurrence\n',
		);
		writeFileSync(
			join(tempDir, 'file2.md'),
			'- [ ] TSK-001 Second occurrence\n',
		);

		await run(['set', 'TSK-001', '#tag']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('duplicate');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('does not corrupt other lines or task body', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'# Tasks\n\n- [ ] TSK-001 Fix the bug\n  Description body.\n\n- [ ] TSK-002 Another task\n',
		);

		await run(['set', 'TSK-001', '#backend']);

		const content = readFileSync(file, 'utf-8');
		expect(content).toContain('Description body.');
		expect(content).toContain('TSK-002 Another task');
		// TSK-002 should NOT have #backend
		const lines = content.split('\n');
		const tsk2Line = lines.find((l) => l.includes('TSK-002'));
		expect(tsk2Line).not.toContain('#backend');
	});
});
