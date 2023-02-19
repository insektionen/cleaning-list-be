import { Request } from 'express';
import { getQueryField } from '../../../src/utils/parseQuery';

describe('getQueryField', () => {
	test('Returns string without parser', () => {
		const req = { query: { foo: 'bar' } } as unknown as Request;

		expect(getQueryField(req, 'foo')).toBe('bar');
	});

	test('Returns first string from array without parser', () => {
		const req = { query: { foo: ['bar', 'zot'] } } as unknown as Request;

		expect(getQueryField(req, 'foo')).toBe('bar');
	});

	test('Returns value through parser', () => {
		const req = { query: { foo: '7' } } as unknown as Request;

		expect(getQueryField(req, 'foo', Number)).toBe(7);
	});

	test('Returns undefined for missing query parameter', () => {
		const req = { query: { bar: 'zot' } } as unknown as Request;

		expect(getQueryField(req, 'foo')).toBeUndefined();
	});
});
