import { describe, expect, it } from 'vitest';
import { compareVersions } from '../src/skills.js';

describe('compareVersions', () => {
	it('orders by numeric segments', () => {
		expect(compareVersions('0.1.13', '0.1.13')).toBe(0);
		expect(compareVersions('0.1.12', '0.1.13')).toBe(-1);
		expect(compareVersions('0.2.0', '0.1.99')).toBe(1);
		expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
	});

	it('treats missing trailing segments as zero', () => {
		expect(compareVersions('1', '1.0.0')).toBe(0);
		expect(compareVersions('1.2', '1.2.1')).toBe(-1);
	});

	it('treats empty or malformed stamps as oldest, and trims', () => {
		expect(compareVersions('', '0.0.1')).toBe(-1);
		expect(compareVersions('garbage', '0.0.1')).toBe(-1);
		expect(compareVersions('  0.1.13  ', '0.1.13')).toBe(0);
	});
});
