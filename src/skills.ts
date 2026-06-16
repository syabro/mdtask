import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';

// Skills bundled in the npm package and installable into an agent's skill
// directory. The project-local `check` skill is intentionally not shipped.
export const SHIPPABLE_SKILLS = ['sdd', 'mdtask', 'mdtask-create', 'mdtask-do'];

const STAMP_FILE = '.version';

// Compare dotted numeric versions (e.g. "0.1.13"). Returns -1 / 0 / 1.
// Missing or malformed segments count as 0, so a garbage stamp sorts as oldest.
export function compareVersions(a: string, b: string): number {
	const pa = a.trim().split('.');
	const pb = b.trim().split('.');
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const na = Number.parseInt(pa[i] ?? '0', 10) || 0;
		const nb = Number.parseInt(pb[i] ?? '0', 10) || 0;
		if (na !== nb) return na < nb ? -1 : 1;
	}
	return 0;
}

export function runningVersion(root: string): string {
	try {
		return JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
			.version;
	} catch {
		return 'unknown';
	}
}

// Source of bundled skills. Prefer the canonical docs/skills (source checkout /
// dev), then the generated skills/ shipped in the npm package. Null if neither.
export function bundledSkillsDir(root: string): string | null {
	for (const dir of [join(root, 'docs', 'skills'), join(root, 'skills')]) {
		if (existsSync(dir)) return dir;
	}
	return null;
}

export function userCacheSkillsDir(): string {
	const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
	return join(base, 'mdtask', 'skills');
}

// Walk up from cwd to find the project-local mdtask package whose realpath
// matches our package root. Returns the LOGICAL node_modules/mdtask path (not
// realpath), so installed symlinks survive a dependency version bump. Null if
// mdtask is not a local project dependency (i.e. global, npx, or source/dev).
export function localDepDir(root: string, cwd: string): string | null {
	let rootReal: string;
	try {
		rootReal = realpathSync(root);
	} catch {
		rootReal = root;
	}

	let dir = cwd;
	for (;;) {
		const candidate = join(dir, 'node_modules', 'mdtask');
		if (existsSync(candidate)) {
			try {
				if (realpathSync(candidate) === rootReal) return candidate;
			} catch {
				// unreadable candidate — keep walking up
			}
		}
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function missingSkills(dir: string): string[] {
	return SHIPPABLE_SKILLS.filter((name) => !existsSync(join(dir, name)));
}

// Overwrite the per-user cache with the bundled skills and stamp the version.
// Best-effort, no locks: a single shared cache, newest-version-wins by design.
// Validates the source is complete BEFORE removing the cache, so an incomplete
// bundle never wipes a good cache or leaves a partial one stamped current.
function writeCache(bundled: string, version: string): void {
	const missing = missingSkills(bundled);
	if (missing.length > 0) {
		throw new Error(
			`bundled skills incomplete (missing: ${missing.join(', ')}) — run \`pnpm build\``,
		);
	}
	const cacheDir = userCacheSkillsDir();
	rmSync(cacheDir, { recursive: true, force: true });
	mkdirSync(cacheDir, { recursive: true });
	for (const name of SHIPPABLE_SKILLS) {
		cpSync(join(bundled, name), join(cacheDir, name), { recursive: true });
	}
	writeFileSync(join(cacheDir, STAMP_FILE), version);
}

function cacheStamp(): string | null {
	const stampPath = join(userCacheSkillsDir(), STAMP_FILE);
	if (!existsSync(stampPath)) return null;
	return readFileSync(stampPath, 'utf-8').trim();
}

// Called on every invocation (in cache mode): if the cache already exists and
// its stamp is older than the running version, overwrite it. Only-if-older, so
// an old run never downgrades a cache a newer run produced. Never throws.
export function refreshCacheIfStale(root: string, version: string): void {
	try {
		if (!existsSync(userCacheSkillsDir())) return; // nothing points at it
		const stamp = cacheStamp();
		if (stamp && compareVersions(stamp, version) >= 0) return;
		const bundled = bundledSkillsDir(root);
		if (!bundled) return;
		writeCache(bundled, version);
	} catch {
		// A cache hiccup must never break a command.
	}
}

export type InstallContext = { mode: 'local' | 'cache'; source: string };

// Where install-skills should point. A local project dependency links straight
// into node_modules/mdtask/skills (version pinned by the project). Otherwise
// (global / npx / dev) it links into the per-user cache, which is created if
// missing and refreshed when older.
export function resolveInstallContext(
	root: string,
	cwd: string,
	version: string,
): InstallContext | null {
	const local = localDepDir(root, cwd);
	if (local) {
		return { mode: 'local', source: join(local, 'skills') };
	}

	const bundled = bundledSkillsDir(root);
	if (!bundled) return null;

	const cacheDir = userCacheSkillsDir();
	const stamp = cacheStamp();
	if (!existsSync(cacheDir) || !stamp || compareVersions(stamp, version) < 0) {
		writeCache(bundled, version);
	}
	return { mode: 'cache', source: cacheDir };
}

// True when `target` is `base` or a path beneath it — a real boundary check so
// e.g. ".../skills-old" is not treated as being under ".../skills".
function isUnder(target: string, base: string): boolean {
	return (
		target === base || target.startsWith(base.endsWith(sep) ? base : base + sep)
	);
}

// A symlink is mdtask-managed (safe to replace) when it points into our install
// source, the per-user cache, or any node_modules/mdtask/skills path.
function isManagedLink(linkTarget: string, source: string): boolean {
	return (
		isUnder(linkTarget, source) ||
		isUnder(linkTarget, userCacheSkillsDir()) ||
		/[\\/]node_modules[\\/]mdtask[\\/]skills[\\/]/.test(linkTarget)
	);
}

export type InstallResult = {
	mode: 'local' | 'cache';
	source: string;
	linked: string[];
	skipped: { name: string; reason: string }[];
};

export function installSkills(
	targetDir: string,
	root: string,
	cwd: string,
): InstallResult {
	const version = runningVersion(root);
	const ctx = resolveInstallContext(root, cwd, version);
	if (!ctx) {
		throw new Error(
			'no bundled skills found (run `pnpm build` to generate them)',
		);
	}

	// All shippable skills must be present — never install a partial set.
	const missing = missingSkills(ctx.source);
	if (missing.length > 0) {
		throw new Error(
			`bundled skills incomplete (missing: ${missing.join(', ')}) — run \`pnpm build\``,
		);
	}

	mkdirSync(targetDir, { recursive: true });

	const linked: string[] = [];
	const skipped: { name: string; reason: string }[] = [];

	for (const name of SHIPPABLE_SKILLS) {
		const target = join(targetDir, name);
		const linkTo = join(ctx.source, name);

		let existing: ReturnType<typeof lstatSync> | null = null;
		try {
			existing = lstatSync(target);
		} catch {
			existing = null;
		}

		if (existing) {
			if (!existing.isSymbolicLink()) {
				skipped.push({
					name,
					reason: 'a real file or directory already exists',
				});
				continue;
			}
			let current = '';
			try {
				current = readlinkSync(target);
			} catch {
				// broken symlink — readlink may still resolve; fall through
			}
			if (!isManagedLink(current, ctx.source)) {
				skipped.push({
					name,
					reason: 'existing symlink not managed by mdtask',
				});
				continue;
			}
			unlinkSync(target);
		}

		symlinkSync(linkTo, target);
		linked.push(name);
	}

	return { mode: ctx.mode, source: ctx.source, linked, skipped };
}
