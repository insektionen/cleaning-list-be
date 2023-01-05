import { Role } from '@prisma/client';
import { emailRegex } from '../../utils/regex';

export type MinimalUser = {
	handle: string;
	name: string;
	role: Role;
};

export type UsableUser = {
	handle: string;
	name: string;
	role: Role;
	email: string | null;
	passwordHash: string;
	token: UserToken;
};

export type NoTokenUser = Omit<UsableUser, 'token'>;

export type CreateUserProps = {
	handle: string;
	name: string;
	email?: string;
	password: string;
	role?: Role;
};

export type UpdateUserProps = {
	name?: string;
	email?: string;
	role?: Role;
	password?: string;
	currentPassword?: string;
};

export type CreateUserWithSecretProps = {
	handle: string;
	name: string;
	email?: string;
	password: string;
};

export function isCreateUserProps(props: any): props is CreateUserProps {
	const userProps = props as CreateUserProps;
	return (
		typeof userProps === 'object' &&
		typeof userProps.handle === 'string' &&
		typeof userProps.name === 'string' &&
		(userProps.email === undefined || emailRegex.test(userProps.email)) &&
		typeof userProps.password === 'string' &&
		[Role.ADMIN, Role.MOD, Role.MANAGER, Role.BASE, undefined].includes(userProps.role)
	);
}

export function isUpdateUserProps(props: any): props is UpdateUserProps {
	const userProps = props as UpdateUserProps;
	return (
		typeof userProps === 'object' &&
		['string', 'undefined'].includes(typeof userProps.name) &&
		(userProps.email === undefined || emailRegex.test(userProps.email)) &&
		[Role.ADMIN, Role.MOD, Role.MANAGER, Role.BASE, undefined].includes(userProps.role) &&
		['string', 'undefined'].includes(typeof userProps.password) &&
		['string', 'undefined'].includes(typeof userProps.currentPassword)
	);
}

export function isCreateUserWithSecretProps(props: any): props is CreateUserWithSecretProps {
	const userProps = props as CreateUserWithSecretProps;
	return (
		typeof userProps === 'object' &&
		typeof userProps.handle === 'string' &&
		typeof userProps.name === 'string' &&
		typeof userProps.password === 'string'
	);
}

export type UserToken = {
	token: string;
	expiresAt: Date;
};
