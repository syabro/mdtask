// Copy the shippable skills from their canonical home (docs/skills) into a
// top-level skills/ directory that ships in the npm package (package.json
// `files`). Run after build via tsup `onSuccess`. The project-local `check`
// skill is intentionally not shipped.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHIPPABLE = ['sdd', 'mdtask', 'mdtask-create', 'mdtask-do'];
const srcBase = join(root, 'docs', 'skills');
const outBase = join(root, 'skills');

rmSync(outBase, { recursive: true, force: true });
mkdirSync(outBase, { recursive: true });

for (const name of SHIPPABLE) {
	const src = join(srcBase, name);
	if (!existsSync(src)) {
		console.error(`bundle-skills: missing source skill ${src}`);
		process.exit(1);
	}
	cpSync(src, join(outBase, name), { recursive: true });
}

console.log(`bundle-skills: copied ${SHIPPABLE.length} skills into skills/`);
