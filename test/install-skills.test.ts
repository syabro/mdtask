import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('picocolors', () => ({
	default: {
		gray: (s: string) => s,
		red: (s: string) => s,
		yellow: (s: string) => s,
		green: (s: string) => s,
		strikethrough: (s: string) => s,
	},
}));

import { run } from '../src/cli.js';
import { localDepDir, resolveInstallContext } from '../src/skills.js';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const REPO_VERSION = JSON.parse(
	readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'),
).version as string;
const SKILLS = ['sdd', 'mdtask', 'mdtask-create', 'mdtask-next'];

describe('mdtask install-skills', () => {
	let configHome: string; // XDG_CONFIG_HOME
	let agentDir: string; // the agent's skill directory (install target)
	let workCwd: string; // a cwd with no node_modules/mdtask
	let originalCwd: string;
	let originalXdg: string | undefined;
	let _stdoutSpy: ReturnType<typeof vi.spyOn>;
	let stderrSpy: ReturnType<typeof vi.spyOn>;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	const cacheSkillsDir = () => join(configHome, 'mdtask', 'skills');

	beforeEach(() => {
		configHome = mkdtempSync(join(tmpdir(), 'mdtask-xdg-'));
		agentDir = mkdtempSync(join(tmpdir(), 'mdtask-agent-'));
		workCwd = mkdtempSync(join(tmpdir(), 'mdtask-cwd-'));
		originalCwd = process.cwd();
		originalXdg = process.env.XDG_CONFIG_HOME;
		process.env.XDG_CONFIG_HOME = configHome;
		process.chdir(workCwd);
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
		if (originalXdg === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXdg;
		}
		vi.restoreAllMocks();
		for (const dir of [configHome, agentDir, workCwd]) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('symlinks all skills into the agent dir, pointing into the per-user cache', async () => {
		await run(['install-skills', agentDir]);

		for (const name of SKILLS) {
			const link = join(agentDir, name);
			expect(lstatSync(link).isSymbolicLink()).toBe(true);
			expect(readlinkSync(link)).toBe(join(cacheSkillsDir(), name));
			// SKILL.md is reachable through the symlink (real file present).
			expect(existsSync(join(link, 'SKILL.md'))).toBe(true);
		}

		// Cache was populated and stamped with the running version.
		expect(readFileSync(join(cacheSkillsDir(), '.version'), 'utf-8')).toBe(
			REPO_VERSION,
		);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('is idempotent — re-running replaces its own symlinks', async () => {
		await run(['install-skills', agentDir]);
		await run(['install-skills', agentDir]);

		for (const name of SKILLS) {
			expect(lstatSync(join(agentDir, name)).isSymbolicLink()).toBe(true);
		}
		expect(exitSpy).not.toHaveBeenCalledWith(1);
	});

	it('refuses to clobber a real directory and links the rest', async () => {
		mkdirSync(join(agentDir, 'sdd'));
		writeFileSync(join(agentDir, 'sdd', 'user.md'), 'mine');

		await run(['install-skills', agentDir]);

		// sdd left untouched (still a real dir with the user's file).
		expect(lstatSync(join(agentDir, 'sdd')).isDirectory()).toBe(true);
		expect(existsSync(join(agentDir, 'sdd', 'user.md'))).toBe(true);
		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('skipped sdd');
		// The others still got linked.
		for (const name of ['mdtask', 'mdtask-create', 'mdtask-next']) {
			expect(lstatSync(join(agentDir, name)).isSymbolicLink()).toBe(true);
		}
		// A partial install is a failure — automation must not see success.
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('does not replace a symlink it does not manage', async () => {
		const foreign = mkdtempSync(join(tmpdir(), 'mdtask-foreign-'));
		symlinkSync(foreign, join(agentDir, 'mdtask'));

		await run(['install-skills', agentDir]);

		expect(readlinkSync(join(agentDir, 'mdtask'))).toBe(foreign);
		const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
		expect(stderr).toContain('skipped mdtask');
		for (const name of ['sdd', 'mdtask-create', 'mdtask-next']) {
			expect(lstatSync(join(agentDir, name)).isSymbolicLink()).toBe(true);
		}
		expect(exitSpy).toHaveBeenCalledWith(1);
		rmSync(foreign, { recursive: true, force: true });
	});

	describe('local project dependency mode', () => {
		it('detects a local mdtask dep and links to its logical node_modules path, no cache', () => {
			const fakeRoot = mkdtempSync(join(tmpdir(), 'mdtask-root-'));
			const projectDir = mkdtempSync(join(tmpdir(), 'mdtask-proj-'));
			mkdirSync(join(projectDir, 'node_modules'), { recursive: true });
			// node_modules/mdtask resolves (realpath) to the running package root.
			symlinkSync(fakeRoot, join(projectDir, 'node_modules', 'mdtask'));

			const logical = join(projectDir, 'node_modules', 'mdtask');
			expect(localDepDir(fakeRoot, projectDir)).toBe(logical);
			// A cwd without node_modules/mdtask is not a local dep.
			expect(localDepDir(fakeRoot, workCwd)).toBeNull();

			const ctx = resolveInstallContext(fakeRoot, projectDir, '1.0.0');
			expect(ctx).toEqual({
				mode: 'local',
				source: join(logical, 'skills'),
			});
			// Local mode must not create or touch the per-user cache.
			expect(existsSync(cacheSkillsDir())).toBe(false);

			rmSync(fakeRoot, { recursive: true, force: true });
			rmSync(projectDir, { recursive: true, force: true });
		});
	});

	describe('cache auto-refresh on any invocation', () => {
		const seedCache = (version: string) => {
			const dir = cacheSkillsDir();
			mkdirSync(dir, { recursive: true });
			writeFileSync(join(dir, '.version'), version);
			writeFileSync(join(dir, 'stale-marker'), 'old');
		};

		it('refreshes a cache whose stamp is older than the running version', async () => {
			seedCache('0.0.1');

			await run(['list']);

			expect(readFileSync(join(cacheSkillsDir(), '.version'), 'utf-8')).toBe(
				REPO_VERSION,
			);
			for (const name of SKILLS) {
				expect(existsSync(join(cacheSkillsDir(), name, 'SKILL.md'))).toBe(true);
			}
		});

		it('does not downgrade a cache whose stamp is newer', async () => {
			seedCache('99.0.0');

			await run(['list']);

			expect(readFileSync(join(cacheSkillsDir(), '.version'), 'utf-8')).toBe(
				'99.0.0',
			);
		});
	});
});
