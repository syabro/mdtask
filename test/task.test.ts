import { describe, expect, it } from 'vitest';
import { parseTaskHeader } from '../src/task.js';

describe('parseTaskHeader', () => {
	describe('valid headers', () => {
		it('parses open task with simple ID', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title here');
			expect(result).not.toBeNull();
			expect(result?.status).toBe('open');
			expect(result?.id).toBe('TSK-123');
			expect(result?.title).toBe('Title here');
			expect(result?.rawMetadata).toBe('');
		});

		it('parses done task with [x]', () => {
			const result = parseTaskHeader('- [x] ABC-1 Done task');
			expect(result).not.toBeNull();
			expect(result?.status).toBe('done');
			expect(result?.id).toBe('ABC-1');
			expect(result?.title).toBe('Done task');
		});

		it('parses task with single-digit ID', () => {
			const result = parseTaskHeader('- [ ] X-1 Title');
			expect(result?.id).toBe('X-1');
		});

		it('parses task with multi-digit ID', () => {
			const result = parseTaskHeader('- [ ] PROJ-99999 Title');
			expect(result?.id).toBe('PROJ-99999');
		});

		it('parses task with long prefix', () => {
			const result = parseTaskHeader('- [ ] LONGPREFIX-123 Title');
			expect(result?.id).toBe('LONGPREFIX-123');
		});
	});

	describe('metadata parsing', () => {
		it('parses task with tags', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title #feature #bug');
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('#feature #bug');
		});

		it('parses task with priority', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title !high');
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('!high');
		});

		it('parses task with property', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title @status:blocked');
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('@status:blocked');
		});

		it('parses task with mixed metadata', () => {
			const result = parseTaskHeader(
				'- [ ] TSK-123 Title #tag !high @key:value',
			);
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('#tag !high @key:value');
		});

		it('parses task with tab separator before metadata', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title\t\t#tag !high');
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('#tag !high');
		});

		it('handles tag with digits', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title #v2 #123');
			expect(result?.rawMetadata).toBe('#v2 #123');
		});
	});

	describe('edge cases in titles', () => {
		it('handles title with special characters', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title with @#$%^&*()');
			expect(result?.title).toBe('Title with @#$%^&*()');
		});

		it('handles title with numbers', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Fix 404 error on page 500');
			expect(result?.title).toBe('Fix 404 error on page 500');
		});

		it('handles title with unicode', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Задача на русском');
			expect(result?.title).toBe('Задача на русском');
		});
	});

	describe('edge cases - metadata at title start', () => {
		it('returns null when metadata starts immediately after ID (tag)', () => {
			const result = parseTaskHeader('- [ ] TSK-123 #tag');
			expect(result).toBeNull();
		});

		it('returns null when metadata starts immediately after ID (priority)', () => {
			const result = parseTaskHeader('- [ ] TSK-123 !high');
			expect(result).toBeNull();
		});

		it('returns null when metadata starts immediately after ID (property)', () => {
			const result = parseTaskHeader('- [ ] TSK-123 @status:blocked');
			expect(result).toBeNull();
		});
	});

	describe('edge cases - hyphenated property keys', () => {
		it('parses property with hyphen in key', () => {
			const result = parseTaskHeader(
				'- [ ] TSK-123 Title @build-status:blocked',
			);
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('@build-status:blocked');
		});

		it('parses property with underscore in key', () => {
			const result = parseTaskHeader(
				'- [ ] TSK-123 Title @build_status:blocked',
			);
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('@build_status:blocked');
		});
	});

	describe('edge cases - empty metadata after tab separator', () => {
		it('handles double tab with no metadata', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title\t\t');
			expect(result?.title).toBe('Title');
			expect(result?.rawMetadata).toBe('');
		});
	});

	describe('invalid headers', () => {
		it('returns null for missing checkbox', () => {
			const result = parseTaskHeader('TSK-123 Title');
			expect(result).toBeNull();
		});

		it('returns null for missing ID', () => {
			const result = parseTaskHeader('- [ ] Title only');
			expect(result).toBeNull();
		});

		it('returns null for lowercase ID prefix', () => {
			const result = parseTaskHeader('- [ ] tsk-123 Title');
			expect(result).toBeNull();
		});

		it('returns null for lowercase ID number only', () => {
			// This should still match if prefix is uppercase
			const result = parseTaskHeader('- [ ] TSK-abc Title');
			expect(result).toBeNull();
		});

		it('returns null for uppercase X in checkbox', () => {
			const result = parseTaskHeader('- [X] TSK-123 Title');
			expect(result).toBeNull();
		});

		it('returns null for double space after dash', () => {
			const result = parseTaskHeader('-  [ ] TSK-123 Title');
			expect(result).toBeNull();
		});

		it('returns null for double space before ID', () => {
			const result = parseTaskHeader('- [ ]  TSK-123 Title');
			expect(result).toBeNull();
		});

		it('returns null for empty line', () => {
			const result = parseTaskHeader('');
			expect(result).toBeNull();
		});

		it('returns null for whitespace only', () => {
			const result = parseTaskHeader('   ');
			expect(result).toBeNull();
		});

		it('returns null for regular text', () => {
			const result = parseTaskHeader('This is just text');
			expect(result).toBeNull();
		});

		it('returns null for markdown list without task', () => {
			const result = parseTaskHeader('- Just a list item');
			expect(result).toBeNull();
		});
	});

	describe('CRLF handling', () => {
		it('strips carriage return from end', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title\r');
			expect(result).not.toBeNull();
			expect(result?.title).toBe('Title');
		});

		it('strips carriage return with metadata', () => {
			const result = parseTaskHeader('- [ ] TSK-123 Title #tag\r');
			expect(result).not.toBeNull();
			expect(result?.rawMetadata).toBe('#tag');
		});
	});
});
