import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, resolveSearchPath } from '../src/config.js';

describe('loadConfig', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-config-test-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe('files include/exclude config', () => {
		it('loads files.include and files.exclude arrays', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({
					files: {
						include: ['docs/prd/**'],
						exclude: ['docs/skills/**'],
					},
				}),
			);

			const config = loadConfig();
			expect(config?.files).toEqual({
				include: ['docs/prd/**'],
				exclude: ['docs/skills/**'],
			});
		});

		it('loads files with only include', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({
					files: { include: ['docs/**'] },
				}),
			);

			const config = loadConfig();
			expect(config?.files).toEqual({ include: ['docs/**'] });
		});

		it('loads files with only exclude', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({
					files: { exclude: ['test/**'] },
				}),
			);

			const config = loadConfig();
			expect(config?.files).toEqual({ exclude: ['test/**'] });
		});

		it('ignores non-array include/exclude values', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({
					files: { include: 'not-array', exclude: 123 },
				}),
			);

			const config = loadConfig();
			expect(config?.files).toBeUndefined();
		});

		it('filters out non-string items in arrays', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({
					files: { include: ['docs/**', 123, null], exclude: ['test/**'] },
				}),
			);

			const config = loadConfig();
			expect(config?.files).toEqual({
				include: ['docs/**'],
				exclude: ['test/**'],
			});
		});

		it('ignores files when not an object', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ files: 'not-object' }),
			);

			const config = loadConfig();
			expect(config?.files).toBeUndefined();
		});
	});

	describe('excludePrefixes config', () => {
		it('loads excludePrefixes array', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ excludePrefixes: ['EXMPL', 'TEST'] }),
			);

			const config = loadConfig();
			expect(config?.excludePrefixes).toEqual(['EXMPL', 'TEST']);
		});

		it('ignores non-array excludePrefixes', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ excludePrefixes: 'not-array' }),
			);

			const config = loadConfig();
			expect(config?.excludePrefixes).toBeUndefined();
		});

		it('filters out non-string items', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ excludePrefixes: ['EXMPL', 123, null] }),
			);

			const config = loadConfig();
			expect(config?.excludePrefixes).toEqual(['EXMPL']);
		});
	});

	describe('config file loading', () => {
		it('returns null when no config file exists', () => {
			const config = loadConfig();
			expect(config).toBeNull();
		});

		it('loads path from .mdtaskrc JSON file', () => {
			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ path: './docs' }),
			);

			const config = loadConfig();
			expect(config).toEqual({ path: './docs' });
		});

		it('loads config from parent directory when not found in current', () => {
			const subDir = join(tempDir, 'subdir');
			mkdirSync(subDir);
			process.chdir(subDir);

			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ path: './src' }),
			);

			const config = loadConfig();
			expect(config).toEqual({ path: './src' });
		});

		it('prefers config in current directory over parent', () => {
			const subDir = join(tempDir, 'subdir');
			mkdirSync(subDir);

			writeFileSync(
				join(tempDir, '.mdtaskrc'),
				JSON.stringify({ path: './parent' }),
			);
			writeFileSync(
				join(subDir, '.mdtaskrc'),
				JSON.stringify({ path: './child' }),
			);

			process.chdir(subDir);
			const config = loadConfig();
			expect(config).toEqual({ path: './child' });
		});

		it('throws error for invalid JSON', () => {
			writeFileSync(join(tempDir, '.mdtaskrc'), 'not valid json');

			expect(() => loadConfig()).toThrow();
		});

		it('ignores non-string path values', () => {
			writeFileSync(join(tempDir, '.mdtaskrc'), JSON.stringify({ path: 123 }));

			const config = loadConfig();
			expect(config).toEqual({});
		});
	});
});

describe('resolveSearchPath', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.MDTASK_PATH;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('uses CLI flag when provided', () => {
		process.env.MDTASK_PATH = './from-env';
		const config = { path: './from-config' };

		const result = resolveSearchPath('./from-flag', config);
		expect(result).toBe('./from-flag');
	});

	it('uses env variable when no CLI flag', () => {
		process.env.MDTASK_PATH = './from-env';
		const config = { path: './from-config' };

		const result = resolveSearchPath(undefined, config);
		expect(result).toBe('./from-env');
	});

	it('uses config when no CLI flag or env', () => {
		const config = { path: './from-config' };

		const result = resolveSearchPath(undefined, config);
		expect(result).toBe('./from-config');
	});

	it('uses default (.) when nothing provided', () => {
		const result = resolveSearchPath(undefined, null);
		expect(result).toBe('.');
	});

	it('CLI flag takes precedence over env', () => {
		process.env.MDTASK_PATH = './from-env';

		const result = resolveSearchPath('./from-flag', null);
		expect(result).toBe('./from-flag');
	});

	it('env takes precedence over config', () => {
		process.env.MDTASK_PATH = './from-env';
		const config = { path: './from-config' };

		const result = resolveSearchPath(undefined, config);
		expect(result).toBe('./from-env');
	});

	it('empty string CLI flag is treated as undefined', () => {
		process.env.MDTASK_PATH = './from-env';

		const result = resolveSearchPath('', null);
		expect(result).toBe('./from-env');
	});
});
