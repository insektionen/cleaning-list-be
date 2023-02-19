import { Role } from '@prisma/client';
import { parseRole } from '../../../src/utils/parser';

describe('parseRole', () => {
	test('Returns same when called with role', () => {
		const role: Role = 'MANAGER';
		expect(parseRole(role)).toBe(role);
	});

	test('Returns undefined when called with non-role', () => {
		const role = 'foo_bar-zot';
		expect(parseRole(role)).toBeUndefined();
	});
});
