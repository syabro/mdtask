import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export type FindOptions = {
	searchPath?: string;
	excludeDirs?: string[];
	includePatterns?: string[];
	excludePatterns?: string[];
};

const DEFAULT_EXCLUDES = ['node_modules', '.git'];

function getExcludeDirs(options?: FindOptions): string[] {
	const fromOptions = options?.excludeDirs ?? [];
	const fromEnv =
		process.env.MDTASK_EXCLUDE_DIRS?.split(',')
			.map((s) => s.trim())
			.filter(Boolean) ?? [];
	return [...DEFAULT_EXCLUDES, ...fromOptions, ...fromEnv];
}

function parseOutput(stdout: string): string[] {
	return stdout
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function normalizePattern(pattern: string): string {
	return pattern.replace(/^\.\//, '').replace(/^\//, '');
}

function tryRipgrep(
	searchPath: string,
	excludeDirs: string[],
	includePatterns?: string[],
	excludePatterns?: string[],
): string[] | null {
	const excludeDirArgs = excludeDirs.flatMap((dir) => ['-g', `!**/${dir}/**`]);
	const includeArgs =
		includePatterns && includePatterns.length > 0
			? includePatterns.flatMap((p) => ['-g', normalizePattern(p)])
			: [];
	const excludeArgs =
		excludePatterns && excludePatterns.length > 0
			? excludePatterns.flatMap((p) => ['-g', `!${normalizePattern(p)}`])
			: [];
	const args = [
		'--files',
		'--type-add',
		'mdtask:*.md',
		'-t',
		'mdtask',
		'--hidden',
		'--no-ignore',
		...includeArgs,
		...excludeDirArgs,
		...excludeArgs,
		'.',
	];
	const result = spawnSync('rg', args, {
		cwd: searchPath,
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'ignore'],
	});

	if (result.error) {
		return null;
	}

	if (result.status === 0 || result.status === 1) {
		return parseOutput(result.stdout).map((p) => resolve(searchPath, p));
	}

	return null;
}

function globToFindPath(pattern: string): string {
	return `*/${normalizePattern(pattern).replace(/\*\*/g, '*')}`;
}

function tryFind(
	searchPath: string,
	excludeDirs: string[],
	includePatterns?: string[],
	excludePatterns?: string[],
): string[] | null {
	const args = [searchPath];
	for (const dir of excludeDirs) {
		args.push('-type', 'd', '-name', dir, '-prune', '-o');
	}
	args.push('-type', 'f', '-name', '*.md');

	// Exclude patterns: ! -path
	if (excludePatterns && excludePatterns.length > 0) {
		for (const pattern of excludePatterns) {
			args.push('!', '-path', globToFindPath(pattern));
		}
	}

	// Include patterns: grouped with -o
	if (includePatterns && includePatterns.length > 0) {
		args.push('(');
		for (let i = 0; i < includePatterns.length; i++) {
			if (i > 0) args.push('-o');
			args.push('-path', globToFindPath(includePatterns[i]));
		}
		args.push(')');
	}

	args.push('-print');
	const result = spawnSync('find', args, {
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'ignore'],
	});

	if (result.error) {
		return null;
	}

	if (result.status === 0) {
		return parseOutput(result.stdout);
	}

	return null;
}

export function findMarkdownFiles(options?: FindOptions): string[] {
	const searchPath = options?.searchPath ?? '.';
	const resolvedPath = resolve(searchPath);
	const excludeDirs = getExcludeDirs(options);

	const includePatterns = options?.includePatterns;
	const excludePatterns = options?.excludePatterns;

	const results =
		tryRipgrep(resolvedPath, excludeDirs, includePatterns, excludePatterns) ??
		tryFind(resolvedPath, excludeDirs, includePatterns, excludePatterns) ??
		[];

	return results.sort();
}
