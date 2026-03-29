import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type FilesConfig = {
	include?: string[];
	exclude?: string[];
};

export type Config = {
	path?: string;
	files?: FilesConfig;
	excludePrefixes?: string[];
};

/**
 * Search for .mdtaskrc file starting from current directory
 * and walking up to filesystem root.
 */
export function findConfigPath(
	startDir: string = process.cwd(),
): string | null {
	let currentDir = resolve(startDir);

	while (true) {
		const configPath = resolve(currentDir, '.mdtaskrc');
		if (existsSync(configPath)) {
			return configPath;
		}

		const parentDir = dirname(currentDir);
		// Stop if we reached root
		if (parentDir === currentDir) {
			return null;
		}
		currentDir = parentDir;
	}
}

function validateStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const filtered = value.filter(
		(item): item is string => typeof item === 'string',
	);
	return filtered.length > 0 ? filtered : undefined;
}

function validateFilesConfig(value: unknown): FilesConfig | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const obj = value as Record<string, unknown>;
	const include = validateStringArray(obj.include);
	const exclude = validateStringArray(obj.exclude);
	if (!include && !exclude) return undefined;
	const files: FilesConfig = {};
	if (include) files.include = include;
	if (exclude) files.exclude = exclude;
	return files;
}

function validateConfig(value: unknown): Config {
	if (typeof value !== 'object' || value === null) {
		return {};
	}
	const obj = value as Record<string, unknown>;
	const config: Config = {};
	if (typeof obj.path === 'string') {
		config.path = obj.path;
	}
	const files = validateFilesConfig(obj.files);
	if (files) {
		config.files = files;
	}
	const excludePrefixes = validateStringArray(obj.excludePrefixes);
	if (excludePrefixes) {
		config.excludePrefixes = excludePrefixes;
	}
	return config;
}

/**
 * Load config from .mdtaskrc file.
 * Returns null if no config file found.
 * Throws if JSON is invalid.
 */
export function loadConfig(startDir?: string): Config | null {
	const configPath = findConfigPath(startDir);
	if (!configPath) {
		return null;
	}

	const content = readFileSync(configPath, 'utf-8');
	try {
		const parsed = JSON.parse(content);
		return validateConfig(parsed);
	} catch (err) {
		if (err instanceof SyntaxError) {
			throw new Error(`Invalid JSON in ${configPath}: ${err.message}`);
		}
		throw err;
	}
}

/**
 * Resolve base path with priority:
 * 1. CLI flag
 * 2. MDTASK_PATH env variable
 * 3. Config file path
 * 4. Default (.)
 */
export function resolveBasePath(
	cliPath: string | undefined,
	config: Config | null,
): string {
	if (cliPath !== undefined && cliPath !== '') {
		return cliPath;
	}

	const envPath = process.env.MDTASK_PATH;
	if (envPath !== undefined && envPath !== '') {
		return envPath;
	}

	if (config?.path !== undefined && config.path !== '') {
		return config.path;
	}

	return '.';
}
