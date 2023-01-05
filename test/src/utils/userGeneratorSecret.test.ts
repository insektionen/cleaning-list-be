import { faker } from '@faker-js/faker';
import { Secret } from '@prisma/client';
import { when } from 'jest-when';
import prismaClient from '../../../src/prismaClient';
import { generatePasswordHash } from '../../../src/utils/bcrypt';
import nanoid from '../../../src/utils/nanoid';
import {
	createNewUserGeneratorSecret,
	getUserGeneratorSecret,
	USER_GENERATOR_SECRET,
} from '../../../src/utils/userGeneratorSecret';
import { usableUserFactory } from '../../factories/user.factory';

jest.mock('../../../src/prismaClient', () => ({
	__esModule: true,
	default: {
		secret: {
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
	},
}));

jest.mock('../../../src/utils/nanoid', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('../../../src/utils/bcrypt', () => ({
	__esmodule: true,
	generatePasswordHash: jest.fn(),
}));

const secret: Secret = {
	id: USER_GENERATOR_SECRET,
	generatedByHandle: 'admin',
	secretHash: 'much secret',
};

describe('getUserGeneratorSecret', () => {
	it('returns secret', async () => {
		when(
			prismaClient.secret.findUnique as unknown as (arg: {
				where: { id: string };
			}) => Promise<Secret>
		)
			.calledWith({ where: { id: USER_GENERATOR_SECRET } })
			.mockResolvedValue(secret);

		const result = await getUserGeneratorSecret();

		expect(result).toEqual(secret);
		expect(prismaClient.secret.findUnique).toHaveBeenCalledTimes(1);
	});

	it('returns null when there is no secret', async () => {
		when(prismaClient.secret.findUnique as unknown as (arg: any) => Promise<null>)
			.calledWith({ where: { id: USER_GENERATOR_SECRET } })
			.mockResolvedValue(null);

		const result = await getUserGeneratorSecret();

		expect(result).toBe(null);
		expect(prismaClient.secret.findUnique).toHaveBeenCalledTimes(1);
	});
});

describe('createNewUserGeneratorSecret', () => {
	it('generates a new secret', async () => {
		const user = usableUserFactory();

		const newSecret = faker.random.alphaNumeric(20);
		when(nanoid).calledWith().mockResolvedValue(newSecret);
		const secretHash = faker.random.alphaNumeric(20);
		when(generatePasswordHash).calledWith(newSecret).mockResolvedValue(secretHash);
		when(prismaClient.secret.upsert as unknown as (arg: any) => Promise<Secret>)
			.calledWith({
				where: { id: USER_GENERATOR_SECRET },
				update: { generatedByHandle: user.handle, secretHash },
				create: {
					id: USER_GENERATOR_SECRET,
					generatedByHandle: user.handle,
					secretHash,
				},
			})
			.mockResolvedValue({ ...secret, generatedByHandle: user.handle, secretHash });

		const result = await createNewUserGeneratorSecret(user);

		expect(result).toEqual(newSecret);
		expect(nanoid).toHaveBeenCalledTimes(1);
		expect(generatePasswordHash).toHaveBeenCalledTimes(1);
		expect(generatePasswordHash).toHaveBeenLastCalledWith(newSecret);
		expect(prismaClient.secret.upsert).toHaveBeenCalledTimes(1);
	});
});
