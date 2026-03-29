import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmdirSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('picocolors', () => ({
	default: {
		gray: (s: string) => `\u001b[90m${s}\u001b[39m`,
		red: (s: string) => `\u001b[31m${s}\u001b[39m`,
		yellow: (s: string) => `\u001b[33m${s}\u001b[39m`,
		green: (s: string) => `\u001b[32m${s}\u001b[39m`,
		strikethrough: (s: string) => `\u001b[9m${s}\u001b[29m`,
	},
}));

// Do NOT mock node:child_process — the point is to actually spawn the mock editor

import { run } from '../src/cli.js';

describe('mdtask open — integration with mock editor', () => {
	let tempDir: string;
	let argsFile: string;
	let mockEditorPath: string;
	let originalCwd: string;
	let originalEditor: string | undefined;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Resolve real path to handle macOS /var → /private/var symlink
		tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'mdtask-open-int-')));
		argsFile = join(tempDir, 'editor-args.txt');
		mockEditorPath = join(tempDir, 'mock-editor.sh');

		writeFileSync(
			mockEditorPath,
			`#!/bin/bash\nprintf '%s\\n' "$@" > "${argsFile}"\n`,
		);
		chmodSync(mockEditorPath, 0o755);

		originalCwd = process.cwd();
		process.chdir(tempDir);
		originalEditor = process.env.EDITOR;
		process.env.EDITOR = mockEditorPath;

		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalEditor === undefined) {
			delete process.env.EDITOR;
		} else {
			process.env.EDITOR = originalEditor;
		}
		vi.clearAllMocks();
		vi.restoreAllMocks();

		const cleanUp = (dir: string) => {
			try {
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
			} catch {
				// Directory might not exist
			}
		};
		cleanUp(tempDir);
		try {
			rmdirSync(tempDir);
		} catch {
			// Ignore cleanup errors
		}
	});

	it('mock editor receives +lineNumber and file path', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			'# Tasks\n\n- [ ] TSK-001 Fix the bug\n  Description.\n',
		);

		await run(['open', 'TSK-001']);

		expect(exitSpy).not.toHaveBeenCalled();
		const args = readFileSync(argsFile, 'utf8').trim().split('\n');
		expect(args).toHaveLength(2);
		expect(args[0]).toBe('+3');
		expect(args[1]).toBe(file);
	});

	it('passes correct line number for task deeper in file', async () => {
		const file = join(tempDir, 'tasks.md');
		writeFileSync(
			file,
			`${[
				'# Header',
				'',
				'Some description.',
				'',
				'## Tasks',
				'',
				'- [ ] TSK-001 First task',
				'  Body of first.',
				'',
				'- [ ] TSK-002 Second task',
				'  Body of second.',
			].join('\n')}\n`,
		);

		await run(['open', 'TSK-002']);

		expect(exitSpy).not.toHaveBeenCalled();
		const args = readFileSync(argsFile, 'utf8').trim().split('\n');
		expect(args[0]).toBe('+10');
		expect(args[1]).toBe(file);
	});

	it('handles file paths with spaces', async () => {
		const dir = join(tempDir, 'my project');
		mkdirSync(dir, { recursive: true });
		const file = join(dir, 'task list.md');
		writeFileSync(file, '- [ ] TSK-001 A task\n');

		await run(['open', 'TSK-001']);

		expect(exitSpy).not.toHaveBeenCalled();
		const args = readFileSync(argsFile, 'utf8').trim().split('\n');
		expect(args[0]).toBe('+1');
		expect(args[1]).toBe(file);
	});
});
