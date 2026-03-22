import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export type FindOptions = {
	searchPath?: string;
	excludeDirs?: string[];
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

function tryRipgrep(
	searchPath: string,
	excludeDirs: string[],
): string[] | null {
	const excludeArgs = excludeDirs.flatMap((dir) => ['-g', `!**/${dir}/**`]);
	const args = [
		'--files',
		'-g',
		'*.md',
		'--hidden',
		'--no-ignore',
		...excludeArgs,
		searchPath,
	];
	const result = spawnSync('rg', args, {
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'ignore'],
	});

	if (result.error) {
		return null;
	}

	if (result.status === 0 || result.status === 1) {
		return parseOutput(result.stdout);
	}

	return null;
}

function tryFind(searchPath: string, excludeDirs: string[]): string[] | null {
	const args = [searchPath];
	for (const dir of excludeDirs) {
		args.push('-type', 'd', '-name', dir, '-prune', '-o');
	}
	args.push('-type', 'f', '-name', '*.md', '-print');
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

	const results =
		tryRipgrep(resolvedPath, excludeDirs) ??
		tryFind(resolvedPath, excludeDirs) ??
		[];

	return results.sort();
}
