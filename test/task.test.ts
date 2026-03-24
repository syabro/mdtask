import { describe, expect, it } from 'vitest';
import {
	collectTaskBody,
	parseMetadata,
	parseTaskHeader,
} from '../src/task.js';

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

describe('parseMetadata', () => {
	describe('all token types', () => {
		it('parses tags', () => {
			const result = parseMetadata('#feature #bug');
			expect(result.tags).toEqual(['#feature', '#bug']);
			expect(result.priority).toBeNull();
			expect(result.properties).toEqual({});
		});

		it('parses priority !crit', () => {
			const result = parseMetadata('!crit');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBe('crit');
			expect(result.properties).toEqual({});
		});

		it('parses priority !high', () => {
			const result = parseMetadata('!high');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBe('high');
			expect(result.properties).toEqual({});
		});

		it('parses priority !low', () => {
			const result = parseMetadata('!low');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBe('low');
			expect(result.properties).toEqual({});
		});

		it('parses property @key:value', () => {
			const result = parseMetadata('@status:blocked');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBeNull();
			expect(result.properties).toEqual({ status: ['blocked'] });
		});
	});

	describe('multiple tokens in one line', () => {
		it('parses mixed metadata', () => {
			const result = parseMetadata('#tag !high @key:value');
			expect(result.tags).toEqual(['#tag']);
			expect(result.priority).toBe('high');
			expect(result.properties).toEqual({ key: ['value'] });
		});

		it('parses multiple tags', () => {
			const result = parseMetadata('#frontend #backend #cli');
			expect(result.tags).toEqual(['#frontend', '#backend', '#cli']);
		});

		it('parses multiple properties', () => {
			const result = parseMetadata('@status:blocked @iter:mvp');
			expect(result.properties).toEqual({
				status: ['blocked'],
				iter: ['mvp'],
			});
		});

		it('parses duplicate property keys as array', () => {
			const result = parseMetadata('@blocked_by:TSK-001 @blocked_by:FLS-001');
			expect(result.properties).toEqual({
				blocked_by: ['TSK-001', 'FLS-001'],
			});
		});
	});

	describe('tags with digits', () => {
		it('parses tag with version number', () => {
			const result = parseMetadata('#v2');
			expect(result.tags).toEqual(['#v2']);
		});

		it('parses tag with only digits', () => {
			const result = parseMetadata('#123');
			expect(result.tags).toEqual(['#123']);
		});

		it('parses mixed tags with digits', () => {
			const result = parseMetadata('#v2 #feature #123');
			expect(result.tags).toEqual(['#v2', '#feature', '#123']);
		});
	});

	describe('edge cases', () => {
		it('returns empty result for empty string', () => {
			const result = parseMetadata('');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBeNull();
			expect(result.properties).toEqual({});
		});

		it('ignores standalone # without tag name', () => {
			const result = parseMetadata('# #tag');
			expect(result.tags).toEqual(['#tag']);
		});

		it('ignores standalone ! without priority', () => {
			const result = parseMetadata('! #tag');
			expect(result.tags).toEqual(['#tag']);
			expect(result.priority).toBeNull();
		});

		it('ignores standalone @ without property', () => {
			const result = parseMetadata('@ #tag');
			expect(result.tags).toEqual(['#tag']);
		});

		it('ignores unknown priority values', () => {
			const result = parseMetadata('!urgent #tag');
			expect(result.priority).toBeNull();
			expect(result.tags).toEqual(['#tag']);
		});

		it('takes first priority when duplicate', () => {
			const result = parseMetadata('!high !low');
			expect(result.priority).toBe('high');
		});

		it('parses property with hyphen in key', () => {
			const result = parseMetadata('@build-status:done');
			expect(result.properties).toEqual({
				'build-status': ['done'],
			});
		});

		it('parses property with underscore in key', () => {
			const result = parseMetadata('@build_status:done');
			expect(result.properties).toEqual({
				build_status: ['done'],
			});
		});

		it('parses property value with special characters', () => {
			const result = parseMetadata('@url:https://example.com/path');
			expect(result.properties).toEqual({
				url: ['https://example.com/path'],
			});
		});

		it('does not parse property embedded in text', () => {
			const result = parseMetadata('user@company:value');
			expect(result.properties).toEqual({});
			expect(result.tags).toEqual([]);
		});

		it('handles constructor as property key', () => {
			const result = parseMetadata('@constructor:value');
			expect(result.properties).toEqual({
				constructor: ['value'],
			});
		});
	});
});

describe('collectTaskBody', () => {
	it('collects multiline body', () => {
		const lines = ['- [ ] TSK-001 Title', '  Body line 1', '  Body line 2'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Body line 1\nBody line 2');
	});

	it('preserves empty lines inside body', () => {
		const lines = ['- [ ] TSK-001 Title', '  Line 1', '', '  Line 2'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Line 1\n\nLine 2');
	});

	it('stops at first non-indented non-empty line', () => {
		const lines = [
			'- [ ] TSK-001 Title',
			'  Body line',
			'- [ ] TSK-002 Next task',
		];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Body line');
	});

	it('returns empty string when no body', () => {
		const lines = ['- [ ] TSK-001 Title', '- [ ] TSK-002 Next task'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('');
	});

	it('returns empty string when header is last line', () => {
		const lines = ['- [ ] TSK-001 Title'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('');
	});

	it('trims trailing empty lines', () => {
		const lines = [
			'- [ ] TSK-001 Title',
			'  Body line',
			'',
			'',
			'- [ ] TSK-002 Next task',
		];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Body line');
	});

	it('dedents by minimum common indent', () => {
		const lines = [
			'- [ ] TSK-001 Title',
			'  Body line 1',
			'    Nested line',
			'  Body line 2',
		];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Body line 1\n  Nested line\nBody line 2');
	});

	it('handles single line body', () => {
		const lines = ['- [ ] TSK-001 Title', '  Single body line'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Single body line');
	});

	it('handles whitespace-only lines as empty', () => {
		const lines = ['- [ ] TSK-001 Title', '  Line 1', '   ', '  Line 2'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Line 1\n\nLine 2');
	});

	it('works with headerIndex in the middle', () => {
		const lines = [
			'# Heading',
			'',
			'- [ ] TSK-001 First task',
			'  First body',
			'- [ ] TSK-002 Second task',
			'  Second body',
		];
		const result = collectTaskBody(lines, 4);
		expect(result).toBe('Second body');
	});

	it('handles CRLF line endings', () => {
		const lines = [
			'- [ ] TSK-001 Title\r',
			'  Body line 1\r',
			'  Body line 2\r',
		];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('Body line 1\nBody line 2');
	});

	it('does not treat tab-only indent as body', () => {
		const lines = ['- [ ] TSK-001 Title', '\tTab indented line'];
		const result = collectTaskBody(lines, 0);
		expect(result).toBe('');
	});
});
