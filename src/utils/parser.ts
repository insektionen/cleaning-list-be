import { Role } from '@prisma/client';

export function parseRole(role: string): Role | undefined {
	if (!Object.values(Role).includes(role as Role)) return undefined;
	return role as Role;
}
