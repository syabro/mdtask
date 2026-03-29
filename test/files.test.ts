import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmdirSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findMarkdownFiles } from '../src/files.js';

describe('findMarkdownFiles', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'mdtask-test-'));
	});

	afterEach(() => {
		const cleanUp = (dir: string) => {
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
		};
		cleanUp(tempDir);
		rmdirSync(tempDir);
	});

	describe('basic file discovery', () => {
		it('finds all .md files recursively', () => {
			writeFileSync(join(tempDir, 'root.md'), '# Root');
			writeFileSync(join(tempDir, 'other.txt'), 'not markdown');

			const subDir = join(tempDir, 'subdir');
			mkdirSync(subDir);
			writeFileSync(join(subDir, 'nested.md'), '# Nested');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(2);
			expect(result).toContain(join(tempDir, 'root.md'));
			expect(result).toContain(join(subDir, 'nested.md'));
		});

		it('returns empty array when no .md files found', () => {
			writeFileSync(join(tempDir, 'readme.txt'), 'not markdown');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toEqual([]);
		});

		it('returns sorted array of absolute paths', () => {
			writeFileSync(join(tempDir, 'zebra.md'), '# Z');
			writeFileSync(join(tempDir, 'alpha.md'), '# A');
			writeFileSync(join(tempDir, 'beta.md'), '# B');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toEqual([
				join(tempDir, 'alpha.md'),
				join(tempDir, 'beta.md'),
				join(tempDir, 'zebra.md'),
			]);
		});
	});

	describe('exclusions', () => {
		it('excludes node_modules by default', () => {
			writeFileSync(join(tempDir, 'root.md'), '# Root');

			const nodeModules = join(tempDir, 'node_modules');
			mkdirSync(nodeModules);
			writeFileSync(join(nodeModules, 'pkg.md'), '# Package');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(1);
			expect(result).toContain(join(tempDir, 'root.md'));
			expect(result).not.toContain(join(nodeModules, 'pkg.md'));
		});

		it('excludes .git by default', () => {
			writeFileSync(join(tempDir, 'readme.md'), '# Readme');

			const gitDir = join(tempDir, '.git');
			mkdirSync(gitDir);
			writeFileSync(join(gitDir, 'config.md'), '# Config');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(1);
			expect(result).toContain(join(tempDir, 'readme.md'));
			expect(result).not.toContain(join(gitDir, 'config.md'));
		});

		it('respects MDTASK_EXCLUDE_DIRS environment variable', () => {
			const originalEnv = process.env.MDTASK_EXCLUDE_DIRS;
			process.env.MDTASK_EXCLUDE_DIRS = 'docs,tmp';

			try {
				writeFileSync(join(tempDir, 'root.md'), '# Root');

				const docsDir = join(tempDir, 'docs');
				mkdirSync(docsDir);
				writeFileSync(join(docsDir, 'guide.md'), '# Guide');

				const tmpDir = join(tempDir, 'tmp');
				mkdirSync(tmpDir);
				writeFileSync(join(tmpDir, 'temp.md'), '# Temp');

				const result = findMarkdownFiles({ basePath: tempDir });

				expect(result).toHaveLength(1);
				expect(result).toContain(join(tempDir, 'root.md'));
			} finally {
				if (originalEnv !== undefined) {
					process.env.MDTASK_EXCLUDE_DIRS = originalEnv;
				} else {
					delete process.env.MDTASK_EXCLUDE_DIRS;
				}
			}
		});

		it('respects excludeDirs option', () => {
			writeFileSync(join(tempDir, 'root.md'), '# Root');

			const cacheDir = join(tempDir, 'cache');
			mkdirSync(cacheDir);
			writeFileSync(join(cacheDir, 'cached.md'), '# Cached');

			const result = findMarkdownFiles({
				basePath: tempDir,
				excludeDirs: ['cache'],
			});

			expect(result).toHaveLength(1);
			expect(result).toContain(join(tempDir, 'root.md'));
		});
	});

	describe('hidden directories', () => {
		it('searches hidden directories', () => {
			writeFileSync(join(tempDir, 'visible.md'), '# Visible');

			const hiddenDir = join(tempDir, '.hidden');
			mkdirSync(hiddenDir);
			writeFileSync(join(hiddenDir, 'secret.md'), '# Secret');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(2);
			expect(result).toContain(join(tempDir, 'visible.md'));
			expect(result).toContain(join(hiddenDir, 'secret.md'));
		});
	});

	describe('special characters in paths', () => {
		it('handles spaces in file names', () => {
			writeFileSync(join(tempDir, 'my file.md'), '# My File');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(1);
			expect(result).toContain(join(tempDir, 'my file.md'));
		});

		it('handles special characters in directory names', () => {
			const specialDir = join(tempDir, 'dir-with_underscore.and-dots');
			mkdirSync(specialDir);
			writeFileSync(join(specialDir, 'file.md'), '# File');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(1);
			expect(result).toContain(join(specialDir, 'file.md'));
		});
	});

	describe('include/exclude patterns', () => {
		it('excludes files matching excludePatterns', () => {
			mkdirSync(join(tempDir, 'docs'), { recursive: true });
			mkdirSync(join(tempDir, 'docs', 'prd'), { recursive: true });
			mkdirSync(join(tempDir, 'docs', 'skills'), { recursive: true });
			writeFileSync(join(tempDir, 'docs', 'prd', 'cli.md'), '# CLI');
			writeFileSync(join(tempDir, 'docs', 'skills', 'example.md'), '# Example');

			const result = findMarkdownFiles({
				basePath: tempDir,
				excludePatterns: ['docs/skills/**'],
			});

			expect(result).toContain(join(tempDir, 'docs', 'prd', 'cli.md'));
			expect(result).not.toContain(
				join(tempDir, 'docs', 'skills', 'example.md'),
			);
		});

		it('includes only files matching includePatterns', () => {
			mkdirSync(join(tempDir, 'docs', 'prd'), { recursive: true });
			mkdirSync(join(tempDir, 'other'), { recursive: true });
			writeFileSync(join(tempDir, 'docs', 'prd', 'cli.md'), '# CLI');
			writeFileSync(join(tempDir, 'other', 'notes.md'), '# Notes');
			writeFileSync(join(tempDir, 'root.md'), '# Root');

			const result = findMarkdownFiles({
				basePath: tempDir,
				includePatterns: ['docs/prd/**'],
			});

			expect(result).toContain(join(tempDir, 'docs', 'prd', 'cli.md'));
			expect(result).not.toContain(join(tempDir, 'other', 'notes.md'));
			expect(result).not.toContain(join(tempDir, 'root.md'));
		});

		it('combines include and exclude patterns', () => {
			mkdirSync(join(tempDir, 'docs', 'prd'), { recursive: true });
			mkdirSync(join(tempDir, 'docs', 'drafts'), { recursive: true });
			writeFileSync(join(tempDir, 'docs', 'prd', 'cli.md'), '# CLI');
			writeFileSync(join(tempDir, 'docs', 'drafts', 'wip.md'), '# WIP');

			const result = findMarkdownFiles({
				basePath: tempDir,
				includePatterns: ['docs/**'],
				excludePatterns: ['docs/drafts/**'],
			});

			expect(result).toContain(join(tempDir, 'docs', 'prd', 'cli.md'));
			expect(result).not.toContain(join(tempDir, 'docs', 'drafts', 'wip.md'));
		});

		it('no patterns = all files (default behavior)', () => {
			mkdirSync(join(tempDir, 'a'), { recursive: true });
			writeFileSync(join(tempDir, 'root.md'), '# Root');
			writeFileSync(join(tempDir, 'a', 'nested.md'), '# Nested');

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result).toHaveLength(2);
		});

		it('exclude overrides include when both match', () => {
			mkdirSync(join(tempDir, 'docs', 'prd'), { recursive: true });
			writeFileSync(join(tempDir, 'docs', 'prd', 'secret.md'), '# Secret');
			writeFileSync(join(tempDir, 'docs', 'prd', 'public.md'), '# Public');

			const result = findMarkdownFiles({
				basePath: tempDir,
				includePatterns: ['docs/**'],
				excludePatterns: ['**/secret.md'],
			});

			expect(result).toContain(join(tempDir, 'docs', 'prd', 'public.md'));
			expect(result).not.toContain(join(tempDir, 'docs', 'prd', 'secret.md'));
		});
	});

	describe('symlinks', () => {
		it('follows symlink to md file', () => {
			const realDir = join(tempDir, 'real');
			mkdirSync(realDir);
			writeFileSync(join(realDir, 'target.md'), '- [ ] TSK-001 Real task');

			symlinkSync(join(realDir, 'target.md'), join(tempDir, 'link.md'));

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result.some((f) => f.endsWith('link.md'))).toBe(true);
		});

		it('follows symlink to directory', () => {
			const realDir = join(tempDir, 'real');
			mkdirSync(realDir);
			writeFileSync(
				join(realDir, 'inside.md'),
				'- [ ] TSK-002 Inside symlinked dir',
			);

			symlinkSync(realDir, join(tempDir, 'linked-dir'));

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result.some((f) => f.includes('linked-dir'))).toBe(true);
		});

		it('handles circular symlinks without hanging', () => {
			const dirA = join(tempDir, 'a');
			mkdirSync(dirA);
			writeFileSync(join(dirA, 'task.md'), '- [ ] TSK-003 In dir a');

			// Create circular symlink: a/b -> tempDir (ancestor)
			symlinkSync(tempDir, join(dirA, 'b'));

			const result = findMarkdownFiles({ basePath: tempDir });

			expect(result.some((f) => f.endsWith('task.md'))).toBe(true);
		});

		it('deduplicates when symlink and real file are both in search tree', () => {
			writeFileSync(join(tempDir, 'task.md'), '- [ ] TSK-004 Real file');

			// Symlink in same tree pointing to the same file
			symlinkSync(join(tempDir, 'task.md'), join(tempDir, 'link-to-task.md'));

			const result = findMarkdownFiles({ basePath: tempDir });

			// Should have exactly one entry for this physical file, not two
			const taskFiles = result.filter(
				(f) => f.endsWith('task.md') || f.endsWith('link-to-task.md'),
			);
			expect(taskFiles).toHaveLength(1);
		});
	});

	describe('default base path', () => {
		it('uses current directory when basePath not specified', () => {
			expect(() => findMarkdownFiles()).not.toThrow();
		});
	});
});
