import * as bcrypt from 'bcrypt';

export const SALT_ROUNDS = 4;

export async function generatePasswordHash(password: string) {
	const hash = await bcrypt.hash(password, SALT_ROUNDS);
	return hash;
}

export async function comparePasswordHash(password: string, hash: string) {
	const result = await bcrypt.compare(password, hash);
	return result;
}
