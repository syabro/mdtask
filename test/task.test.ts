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

		it('parses various ID formats', () => {
			expect(parseTaskHeader('- [ ] X-1 Title')?.id).toBe('X-1');
			expect(parseTaskHeader('- [ ] PROJ-99999 Title')?.id).toBe('PROJ-99999');
			expect(parseTaskHeader('- [ ] LONGPREFIX-123 Title')?.id).toBe(
				'LONGPREFIX-123',
			);
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
		it('returns null when metadata starts immediately after ID', () => {
			expect(parseTaskHeader('- [ ] TSK-123 #tag')).toBeNull();
			expect(parseTaskHeader('- [ ] TSK-123 !high')).toBeNull();
			expect(parseTaskHeader('- [ ] TSK-123 @status:blocked')).toBeNull();
		});
	});

	describe('edge cases - hyphenated property keys', () => {
		it('parses property keys with hyphens and underscores', () => {
			const hyphen = parseTaskHeader(
				'- [ ] TSK-123 Title @build-status:blocked',
			);
			expect(hyphen?.title).toBe('Title');
			expect(hyphen?.rawMetadata).toBe('@build-status:blocked');

			const underscore = parseTaskHeader(
				'- [ ] TSK-123 Title @build_status:blocked',
			);
			expect(underscore?.title).toBe('Title');
			expect(underscore?.rawMetadata).toBe('@build_status:blocked');
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
		it('returns null for invalid formats', () => {
			expect(parseTaskHeader('TSK-123 Title')).toBeNull(); // missing checkbox
			expect(parseTaskHeader('- [ ] Title only')).toBeNull(); // missing ID
			expect(parseTaskHeader('- [ ] tsk-123 Title')).toBeNull(); // lowercase ID prefix
			expect(parseTaskHeader('- [ ] TSK-abc Title')).toBeNull(); // non-numeric ID
			expect(parseTaskHeader('- [X] TSK-123 Title')).toBeNull(); // uppercase X in checkbox
			expect(parseTaskHeader('-  [ ] TSK-123 Title')).toBeNull(); // double space after dash
			expect(parseTaskHeader('- [ ]  TSK-123 Title')).toBeNull(); // double space before ID
			expect(parseTaskHeader('')).toBeNull(); // empty line
			expect(parseTaskHeader('   ')).toBeNull(); // whitespace only
			expect(parseTaskHeader('This is just text')).toBeNull(); // regular text
			expect(parseTaskHeader('- Just a list item')).toBeNull(); // markdown list without task
		});
	});

	describe('CRLF handling', () => {
		it('strips carriage return', () => {
			const plain = parseTaskHeader('- [ ] TSK-123 Title\r');
			expect(plain).not.toBeNull();
			expect(plain?.title).toBe('Title');

			const withMeta = parseTaskHeader('- [ ] TSK-123 Title #tag\r');
			expect(withMeta).not.toBeNull();
			expect(withMeta?.rawMetadata).toBe('#tag');
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

		it('parses all priority levels', () => {
			const crit = parseMetadata('!crit');
			expect(crit.tags).toEqual([]);
			expect(crit.priority).toBe('crit');
			expect(crit.properties).toEqual({});

			const high = parseMetadata('!high');
			expect(high.tags).toEqual([]);
			expect(high.priority).toBe('high');
			expect(high.properties).toEqual({});

			const low = parseMetadata('!low');
			expect(low.tags).toEqual([]);
			expect(low.priority).toBe('low');
			expect(low.properties).toEqual({});
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
		it('parses tags with digits', () => {
			expect(parseMetadata('#v2').tags).toEqual(['#v2']);
			expect(parseMetadata('#123').tags).toEqual(['#123']);
			expect(parseMetadata('#v2 #feature #123').tags).toEqual([
				'#v2',
				'#feature',
				'#123',
			]);
		});
	});

	describe('edge cases', () => {
		it('returns empty result for empty string', () => {
			const result = parseMetadata('');
			expect(result.tags).toEqual([]);
			expect(result.priority).toBeNull();
			expect(result.properties).toEqual({});
		});

		it('ignores standalone tokens without names', () => {
			const hash = parseMetadata('# #tag');
			expect(hash.tags).toEqual(['#tag']);
			expect(hash.priority).toBeNull();
			expect(hash.properties).toEqual({});

			const bang = parseMetadata('! #tag');
			expect(bang.tags).toEqual(['#tag']);
			expect(bang.priority).toBeNull();
			expect(bang.properties).toEqual({});

			const at = parseMetadata('@ #tag');
			expect(at.tags).toEqual(['#tag']);
			expect(at.priority).toBeNull();
			expect(at.properties).toEqual({});
		});

		it('parses unknown priority values', () => {
			const result = parseMetadata('!urgent #tag');
			expect(result.priority).toBe('urgent');
			expect(result.tags).toEqual(['#tag']);
		});

		it('takes first priority when multiple specified', () => {
			expect(parseMetadata('!urgent !high').priority).toBe('urgent');
			expect(parseMetadata('!high !urgent').priority).toBe('high');
			expect(parseMetadata('!high !low').priority).toBe('high');
		});

		it('parses property keys with special characters', () => {
			expect(parseMetadata('@build-status:done').properties).toEqual({
				'build-status': ['done'],
			});
			expect(parseMetadata('@build_status:done').properties).toEqual({
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

	it('returns empty string when no body lines', () => {
		expect(
			collectTaskBody(['- [ ] TSK-001 Title', '- [ ] TSK-002 Next task'], 0),
		).toBe('');
		expect(collectTaskBody(['- [ ] TSK-001 Title'], 0)).toBe('');
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
