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
import { run } from '../src/cli.js';

describe('run', () => {
	let stderrSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		stderrSpy = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns 0 for --help', async () => {
		const code = await run(['--help']);
		expect(code).toBe(0);
	});

	it('returns 1 for stub commands without required args', async () => {
		const code = await run(['view']);
		expect(code).toBe(1);
		expect(stderrSpy).toHaveBeenCalled();
	});

	it('returns 0 for subcommand --help', async () => {
		const code = await run(['list', '--help']);
		expect(code).toBe(0);
	});

	it('returns 0 for subcommand -h', async () => {
		const code = await run(['view', '-h']);
		expect(code).toBe(0);
	});
});

describe('default command shortcuts', () => {
	let tempDir: string;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-cli-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
		stdoutSpy = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		stderrSpy = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
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
					} else {
						unlinkSync(fullPath);
					}
				}
				rmdirSync(dir);
			} catch {}
		};
		cleanUp(tempDir);
	});

	it('no args defaults to list', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TST-001 First task\n- [ ] TST-002 Second task\n',
		);
		const code = await run([]);
		expect(code).toBe(0);
		const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
		expect(output).toContain('TST-001');
		expect(output).toContain('TST-002');
	});

	it('sole task ID arg defaults to view', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TST-001 First task\n  Some body text\n',
		);
		vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const code = await run(['TST-001']);
		expect(code).toBe(0);
		const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
		expect(output).toContain('TST-001');
		expect(output).toContain('First task');
	});

	it('plain number arg defaults to view', async () => {
		writeFileSync(
			join(tempDir, 'tasks.md'),
			'- [ ] TST-001 First task\n  Some body text\n',
		);
		vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const code = await run(['1']);
		expect(code).toBe(0);
		const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
		expect(output).toContain('TST-001');
	});

	it('unknown non-command arg returns 1 with error', async () => {
		const code = await run(['bogus']);
		expect(code).toBe(1);
		const errOutput = stderrSpy.mock.calls.map((c) => c[0]).join('');
		expect(errOutput).toContain("unknown command 'bogus'");
	});

	it('unknown arg that looks like lowercase id returns 1', async () => {
		const code = await run(['tsk-001']);
		expect(code).toBe(1);
		const errOutput = stderrSpy.mock.calls.map((c) => c[0]).join('');
		expect(errOutput).toContain("unknown command 'tsk-001'");
	});
});
