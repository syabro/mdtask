import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/app.js';

describe('run', () => {
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let stdoutSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		stderrSpy = vi
			.spyOn(process.stderr, 'write')
			.mockImplementation(() => true);
		stdoutSpy = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('prints help with --help', () => {
		const code = run(['--help']);
		expect(code).toBe(0);
		expect(stdoutSpy).toHaveBeenCalled();
		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('list');
		expect(output).toContain('view');
		expect(output).toContain('done');
	});

	it('prints help with no args', () => {
		const code = run([]);
		expect(code).toBe(0);
		expect(stdoutSpy).toHaveBeenCalled();
		const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(output).toContain('mdtask');
	});

	it('returns 1 for unknown command', () => {
		const code = run(['bogus']);
		expect(code).toBe(1);
		expect(stderrSpy).toHaveBeenCalled();
		const err = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(err).toContain('bogus');
	});

	it('returns 1 for stub commands (not implemented)', () => {
		const code = run(['list']);
		expect(code).toBe(1);
		expect(stderrSpy).toHaveBeenCalled();
	});
});
