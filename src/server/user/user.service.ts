import { Prisma, ResetToken, Role } from '@prisma/client';
import moment from 'moment';
import prismaClient from '../../prismaClient';
import { generatePasswordHash } from '../../utils/bcrypt';
import nanoid from '../../utils/nanoid';
import { PaginationParams } from '../../utils/pagination';
import { CreateUserProps, MinimalUser, UpdateUserProps, UsableUser, UserToken } from './user.model';

type FindUsersFilter = {
	search?: string;
	role?: Role;
};

export async function findUsers(
	filter: FindUsersFilter = {},
	{ limit, page }: Partial<PaginationParams> = {}
): Promise<MinimalUser[]> {
	const where: Prisma.UserWhereInput = {};
	if (filter.search) {
		if (filter.search.charAt(0) === '@') {
			where.handle = filter.search.slice(1);
		} else {
			where.OR = [
				{ handle: { contains: filter.search, mode: 'insensitive' } },
				{ name: { contains: filter.search, mode: 'insensitive' } },
			];
		}
	}
	if (filter.role) {
		where.role = filter.role;
	}

	return await prismaClient.user.findMany({
		select: { handle: true, name: true, role: true },
		where,
		orderBy: [{ name: 'asc' }, { handle: 'asc' }],
		take: limit,
		skip: limit && page ? limit * (page - 1) : undefined,
	});
}

export async function findUser(handle: string): Promise<UsableUser | null> {
	const user = await prismaClient.user.findUnique({
		where: { handle: handle.toLowerCase() },
		select: USABLE_USER_SELECT,
	});

	return user && (await updateUserToken(user));
}

export async function findUserFromToken(token: string): Promise<UsableUser | null> {
	const found = await prismaClient.userToken.findUnique({
		where: { token },
		select: {
			expiresAt: true,
			user: {
				select: USABLE_USER_SELECT,
			},
		},
	});

	if (!found) return null;
	return { ...found.user, token: { token, expiresAt: found.expiresAt } };
}

export async function findUserFromEmail(email: string): Promise<UsableUser | null> {
	const found = await prismaClient.user.findUnique({
		where: { email },
		select: USABLE_USER_SELECT,
	});

	return found && (await updateUserToken(found));
}

export async function createUser(
	{ password, ...props }: CreateUserProps,
	setSignIn = false
): Promise<UsableUser> {
	const passwordHash = await generatePasswordHash(password);
	return (await prismaClient.user.create({
		data: {
			...props,
			passwordHash,
			lastSignedIn: setSignIn ? new Date() : undefined,
			token: await newToken(),
		},
		select: USABLE_USER_SELECT,
	})) as UsableUser;
}

export async function updateUser(
	handle: string,
	{ password, currentPassword, ...props }: UpdateUserProps
): Promise<UsableUser> {
	const passwordHash = password && (await generatePasswordHash(password));
	const user = await prismaClient.user.update({
		where: { handle },
		data: { ...props, passwordHash, updatedAt: new Date() },
		select: USABLE_USER_SELECT,
	});

	return await updateUserToken(user, !!passwordHash);
}

export async function generateUserResetToken({ handle }: UsableUser): Promise<string> {
	const plainToken = await nanoid();
	const resetToken = await generatePasswordHash(plainToken);
	const validUntil = moment().add(8, 'hours').toDate();
	await prismaClient.user.update({
		where: { handle },
		data: {
			resetToken: {
				upsert: { create: { resetToken, validUntil }, update: { resetToken, validUntil } },
			},
		},
	});

	return `${plainToken}${Buffer.from(handle).toString('base64url')}`;
}

export async function findUserResetToken(handle: string): Promise<ResetToken | null> {
	return await prismaClient.resetToken.findUnique({ where: { userHandle: handle } });
}

export async function setUserLastSignIn(handle: string, time: Date = new Date()): Promise<void> {
	await prismaClient.user.update({ where: { handle }, data: { lastSignedIn: time } });
}

export async function deleteUserResetToken(handle: string) {
	await prismaClient.resetToken.delete({ where: { userHandle: handle } });
}

async function updateUserToken(
	user: Omit<UsableUser, 'token'> & { token: UserToken | null },
	forceUpdate?: boolean
): Promise<UsableUser> {
	const { token, handle } = user;

	if (!token) {
		const updatedUser = await prismaClient.user.update({
			where: { handle },
			data: { token: await newToken() },
			select: USABLE_USER_SELECT,
		});

		return updatedUser as UsableUser;
	}
	if (token.expiresAt < new Date() || forceUpdate) {
		await prismaClient.userToken.delete({ where: { token: token.token } });
		const updatedUser = await prismaClient.user.update({
			where: { handle },
			data: { token: await newToken() },
			select: USABLE_USER_SELECT,
		});

		return updatedUser as UsableUser;
	}

	return user as UsableUser;
}

async function newToken() {
	return {
		create: { token: await nanoid(), expiresAt: moment().add(30, 'days').toDate() },
	};
}

const USABLE_USER_SELECT = {
	handle: true,
	name: true,
	role: true,
	email: true,
	passwordHash: true,
	token: { select: { token: true, expiresAt: true } },
};
