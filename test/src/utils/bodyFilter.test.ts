import bodyFilter from '../../../src/utils/bodyFilter';

describe('bodyFilter', () => {
	it('Returns filtered object', () => {
		const allowedKeys = ['foo', 'bar', 'zot'];
		const validObject = { foo: 'foo', bar: 0, zot: null };
		const invalidProperties = { baz: 'baz', qux: { foo: 99 } };

		expect(bodyFilter({ ...validObject, ...invalidProperties }, allowedKeys)).toEqual(validObject);
	});

	it('Returns null if provided body is not object', () => {
		expect(bodyFilter(9, [])).toBeNull();
	});
});
