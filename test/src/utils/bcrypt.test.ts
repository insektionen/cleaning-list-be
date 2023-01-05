import { comparePasswordHash, generatePasswordHash } from '../../../src/utils/bcrypt';

describe('generatePasswordHash', () => {
	it('Generates a hashed password', async () => {
		const demo = 'demo';
		const hashedDemo = await generatePasswordHash(demo);
		expect(hashedDemo).toHaveLength(60);
	});
});

describe('comparePasswordHash', () => {
	const hash = '$2b$04$AciBGu.dy7LBJokkh3fXZ.NWksOwL9ebi3ij4Nn11nRM8OIAaLqm2';

	it('Correct password returns true', async () => {
		const demo = 'demo';
		const result = await comparePasswordHash(demo, hash);
		expect(result).toBe(true);
	});

	it('Incorrect password returns false', async () => {
		const demo = 'omed';
		const result = await comparePasswordHash(demo, hash);
		expect(result).toBe(false);
	});
});
