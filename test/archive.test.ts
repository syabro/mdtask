import {
	existsSync,
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
import { run } from '../src/cli.js';
import { loadConfig } from '../src/config.js';

describe('mdtask archive', () => {
	let tempDir: string;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let _stdoutSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-archive-test-'));
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
			} catch {}
		};
		cleanUp(tempDir);
		try {
			rmdirSync(tempDir);
		} catch {}
	});

	it('archives all done tasks from the base', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [x] TSK-001 Done one\n  Body one.\n\n- [ ] TSK-002 Open task\n\n- [x] TSK-003 Done two\n',
		);

		await run(['archive']);

		const source = readFileSync(join(tempDir, 'tasks.md'), 'utf-8');
		expect(source).not.toContain('TSK-001');
		expect(source).not.toContain('TSK-003');
		expect(source).toContain('TSK-002');

		const archive = readFileSync(join(tempDir, '_archive.md'), 'utf-8');
		expect(archive).toContain('- [x] TSK-001 Done one');
		expect(archive).toContain('  Body one.');
		expect(archive).toContain('- [x] TSK-003 Done two');
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('archives explicit done IDs only', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [x] TSK-001 Done one\n\n- [x] TSK-002 Done two\n\n- [ ] TSK-003 Open task\n',
		);

		await run(['archive', 'TSK-002']);

		const source = readFileSync(join(tempDir, 'tasks.md'), 'utf-8');
		expect(source).toContain('TSK-001');
		expect(source).not.toContain('TSK-002');
		expect(source).toContain('TSK-003');

		const archive = readFileSync(join(tempDir, '_archive.md'), 'utf-8');
		expect(archive).not.toContain('TSK-001');
		expect(archive).toContain('TSK-002');
	});

	it('limits archive to one file with --path', async () => {
		const first = join(tempDir, 'first.md');
		const second = join(tempDir, 'second.md');
		writeFileSync(first, '- [x] TSK-001 Done one\n');
		writeFileSync(second, '- [x] TSK-002 Done two\n');

		await run(['archive', '--path', first]);

		expect(readFileSync(first, 'utf-8')).not.toContain('TSK-001');
		expect(readFileSync(second, 'utf-8')).toContain('TSK-002');
		const archive = readFileSync(join(tempDir, '_archive.md'), 'utf-8');
		expect(archive).toContain('TSK-001');
		expect(archive).not.toContain('TSK-002');
	});

	it('uses archivePath from config', async () => {
		writeFileSync(
			join(tempDir, '.mdtaskrc'),
			JSON.stringify({ archivePath: 'done/archive.md' }),
		);
		writeFileSync(join(tempDir, 'tasks.md'), '- [x] TSK-001 Done one\n');

		await run(['archive']);

		expect(existsSync(join(tempDir, 'done', 'archive.md'))).toBe(true);
		const archive = readFileSync(join(tempDir, 'done', 'archive.md'), 'utf-8');
		expect(archive).toContain('TSK-001');
	});

	it('loads archivePath from config only when it is a string', () => {
		writeFileSync(
			join(tempDir, '.mdtaskrc'),
			JSON.stringify({ archivePath: '_archive.md' }),
		);
		expect(loadConfig()?.archivePath).toBe('_archive.md');

		writeFileSync(
			join(tempDir, '.mdtaskrc'),
			JSON.stringify({ archivePath: 123 }),
		);
		expect(loadConfig()?.archivePath).toBeUndefined();
	});

	it('rejects archivePath outside the scanned base', async () => {
		writeFileSync(
			join(tempDir, '.mdtaskrc'),
			JSON.stringify({ archivePath: '../outside.md' }),
		);
		writeFileSync(join(tempDir, 'tasks.md'), '- [x] TSK-001 Done one\n');

		await run(['archive']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('outside the base directory');
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(readFileSync(join(tempDir, 'tasks.md'), 'utf-8')).toContain(
			'TSK-001',
		);
	});

	it('does not archive from the archive file itself', async () => {
		writeFileSync(join(tempDir, 'tasks.md'), '- [x] TSK-001 Done one\n');
		writeFileSync(
			join(tempDir, '_archive.md'),
			'- [x] TSK-999 Already archived\n',
		);

		await run(['archive']);

		const archive = readFileSync(join(tempDir, '_archive.md'), 'utf-8');
		expect(archive.match(/TSK-999/g)).toHaveLength(1);
		expect(archive).toContain('TSK-001');
	});

	it('rejects open explicit tasks before modifying files', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [x] TSK-001 Done one\n\n- [ ] TSK-002 Open task\n',
		);

		await run(['archive', 'TSK-001', 'TSK-002']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain("task 'TSK-002' is not done");
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(readFileSync(join(tempDir, 'tasks.md'), 'utf-8')).toContain(
			'TSK-001',
		);
		expect(existsSync(join(tempDir, '_archive.md'))).toBe(false);
	});

	it('treats --path as the explicit ID search scope', async () => {
		const first = join(tempDir, 'first.md');
		const second = join(tempDir, 'second.md');
		writeFileSync(first, '- [x] TSK-001 Done one\n');
		writeFileSync(second, '- [x] TSK-002 Done two\n');

		await run(['archive', 'TSK-002', '--path', first]);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain("task 'TSK-002' not found");
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(readFileSync(second, 'utf-8')).toContain('TSK-002');
	});

	it('rejects archive target directories before modifying files', async () => {
		mkdirSync(join(tempDir, '_archive.md'));
		writeFileSync(join(tempDir, 'tasks.md'), '- [x] TSK-001 Done one\n');

		await run(['archive']);

		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('is a directory');
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(readFileSync(join(tempDir, 'tasks.md'), 'utf-8')).toContain(
			'TSK-001',
		);
	});
});
