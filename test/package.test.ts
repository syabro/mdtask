import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

describe('package.json npm publishing config', () => {
	it('has bin entry pointing to dist/cli.js', () => {
		expect(pkg.bin).toEqual({ mdtask: './dist/cli.js' });
	});

	it('has files field limiting published content', () => {
		expect(pkg.files).toBeDefined();
		expect(pkg.files).toContain('dist');
	});

	it('has license field', () => {
		expect(pkg.license).toBe('PolyForm-Shield-1.0.0');
	});

	it('has keywords', () => {
		expect(pkg.keywords).toBeDefined();
		expect(pkg.keywords.length).toBeGreaterThan(0);
	});

	it('has repository field', () => {
		expect(pkg.repository).toBeDefined();
	});
});

describe('LICENSE file', () => {
	it('exists at project root', () => {
		expect(existsSync(resolve(ROOT, 'LICENSE'))).toBe(true);
	});

	it('contains PolyForm Shield license text', () => {
		const license = readFileSync(resolve(ROOT, 'LICENSE'), 'utf-8');
		expect(license).toContain('PolyForm Shield License 1.0.0');
	});
});

describe('built CLI', () => {
	it('dist/cli.js has shebang', () => {
		const distPath = resolve(ROOT, 'dist/cli.js');
		expect(existsSync(distPath)).toBe(true);
		const content = readFileSync(distPath, 'utf-8');
		expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
	});
});
