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

	it('returns 0 for --help', () => {
		const code = run(['--help']);
		expect(code).toBe(0);
	});

	it('returns 0 for no args (shows help)', () => {
		const code = run([]);
		expect(code).toBe(0);
	});

	it('returns 0 for unknown command (shows help)', () => {
		const code = run(['bogus']);
		expect(code).toBe(0);
	});

	it('returns 1 for stub commands without required args', () => {
		const code = run(['view']);
		expect(code).toBe(1);
		expect(stderrSpy).toHaveBeenCalled();
	});

	it('returns 0 for subcommand --help', () => {
		const code = run(['list', '--help']);
		expect(code).toBe(0);
	});

	it('returns 0 for subcommand -h', () => {
		const code = run(['view', '-h']);
		expect(code).toBe(0);
	});
});
