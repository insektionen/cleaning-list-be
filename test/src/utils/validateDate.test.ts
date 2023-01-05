import validateDate from '../../../src/utils/validateDate';

describe('vadidateDate', () => {
	test('returns date if valid', () => {
		const date = '2022-12-24';

		expect(validateDate(date)).toBe(date);
	});

	test("returns null if date isn't string", () => {
		const date = undefined;

		expect(validateDate(date)).toBeNull();
	});

	test("returns null if date isn't in YYYY-MM-DD format", () => {
		const date = '24/12-2022';

		expect(validateDate(date)).toBeNull();
	});

	test("returns null if date isn't valid", () => {
		const date = '2022-02-29';

		expect(validateDate(date)).toBeNull();
	});
});
