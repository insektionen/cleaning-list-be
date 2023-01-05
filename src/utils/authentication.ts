import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { UsableUser } from '../server/user/user.model';
import { findUserFromToken } from '../server/user/user.service';

export async function tokenAuthentication(req: Request, res: Response): Promise<UsableUser | null> {
	const token = req.headers.authorization;
	if (!token) return res.status(400).send('No token provided') && null;

	const user = await findUserFromToken(token);
	if (!user) return res.status(404).send('No user with that token exists') && null;

	if (user.token.expiresAt < new Date()) return res.status(401).send('Session has expired') && null;

	return user;
}

export async function tokenPermissions(
	req: Request,
	res: Response,
	minimalRole: Role
): Promise<UsableUser | null> {
	const user = await tokenAuthentication(req, res);
	if (!user) return null;

	if (roleIsAtLeast(user.role, minimalRole)) return user;

	res.status(403).send('User is not allowed to access this content');
	return null;
}

export const ROLE_ORDER: Role[] = [Role.BASE, Role.MANAGER, Role.MOD, Role.ADMIN];

export function roleIsAtLeast(role: Role, minimalRole: Role): boolean {
	const targetRoleValue = ROLE_ORDER.indexOf(role);
	const minRequiredValue = ROLE_ORDER.indexOf(minimalRole);

	return targetRoleValue >= minRequiredValue;
}
