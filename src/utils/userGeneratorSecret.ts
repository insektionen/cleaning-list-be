import { Secret } from '@prisma/client';
import prismaClient from '../prismaClient';
import { UsableUser } from '../server/user/user.model';
import { generatePasswordHash } from './bcrypt';
import nanoid from './nanoid';

export const USER_GENERATOR_SECRET = 'USER_GENERATOR_SECRET';

export async function getUserGeneratorSecret(): Promise<Secret | null> {
	return await prismaClient.secret.findUnique({ where: { id: USER_GENERATOR_SECRET } });
}

export async function createNewUserGeneratorSecret(creator: UsableUser): Promise<string> {
	const newSecret = await nanoid();

	const secretHash = await generatePasswordHash(newSecret);

	await prismaClient.secret.upsert({
		where: { id: USER_GENERATOR_SECRET },
		create: { secretHash, id: USER_GENERATOR_SECRET, generatedByHandle: creator.handle },
		update: { secretHash, generatedByHandle: creator.handle },
	});

	return newSecret;
}
