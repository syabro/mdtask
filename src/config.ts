import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type Config = {
	path?: string;
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

function validateConfig(value: unknown): Config {
	if (typeof value !== 'object' || value === null) {
		return {};
	}
	const obj = value as Record<string, unknown>;
	const config: Config = {};
	if (typeof obj.path === 'string') {
		config.path = obj.path;
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
 * Resolve search path with priority:
 * 1. CLI flag
 * 2. MDTASK_PATH env variable
 * 3. Config file path
 * 4. Default (.)
 */
export function resolveSearchPath(
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
