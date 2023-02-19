import { minimalUserFactory, usableUserFactory } from '../../factories/user.factory';
import serverGenerator from '../../../src/server';
import supertest from 'supertest';
import { when } from 'jest-when';
import { tokenAuthentication, tokenPermissions } from '../../../src/utils/authentication';
import {
	createUser,
	deleteUserResetToken,
	findUser,
	findUserFromEmail,
	findUserResetToken,
	findUsers,
	generateUserResetToken,
	setUserLastSignIn,
	updateUser,
} from '../../../src/server/user/user.service';
import { faker } from '@faker-js/faker';
import { NoTokenUser, UsableUser } from '../../../src/server/user/user.model';
import {
	createNewUserGeneratorSecret,
	getUserGeneratorSecret,
	USER_GENERATOR_SECRET,
} from '../../../src/utils/userGeneratorSecret';
import { comparePasswordHash } from '../../../src/utils/bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { sendEmail } from '../../../src/utils/passwordRecovery';
import moment from 'moment';

const server = serverGenerator(false);

const primary = usableUserFactory();

jest.mock('../../../src/server/user/user.service', () => ({
	__esModule: true,
	createUser: jest.fn(),
	deleteUserResetToken: jest.fn(),
	findUser: jest.fn(),
	findUserFromEmail: jest.fn(),
	findUserResetToken: jest.fn(),
	findUsers: jest.fn(),
	generateUserResetToken: jest.fn(),
	updateUser: jest.fn(),
	setUserLastSignIn: jest.fn(),
}));

jest.mock('../../../src/utils/authentication', () => {
	const original = jest.requireActual('../../../src/utils/authentication');
	return {
		...original,
		__esmodule: true,
		tokenAuthentication: jest.fn(),
		tokenPermissions: jest.fn(),
	};
});

jest.mock('../../../src/utils/userGeneratorSecret', () => {
	const original = jest.requireActual('../../../src/utils/userGeneratorSecret');
	return {
		...original,
		__esmodule: true,
		createNewUserGeneratorSecret: jest.fn(),
		getUserGeneratorSecret: jest.fn(),
	};
});

jest.mock('../../../src/utils/bcrypt', () => ({
	__esmodule: true,
	comparePasswordHash: jest.fn(),
}));

jest.mock('../../../src/utils/passwordRecovery', () => ({
	__esmodule: true,
	sendEmail: jest.fn(),
}));

describe('GET /users', () => {
	it('returns 200 for correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const users = minimalUserFactory([{}, {}, {}]);
		when(findUsers).calledWith({}, {}).mockResolvedValue(users);

		const response = await supertest(server).get('/users');

		expect(response.status).toBe(200);
		expect(response.body).toEqual(users);
		expect(findUsers).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).get('/users');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('GET /users/:handle', () => {
	it('returns 200 for correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const target = usableUserFactory();
		when(findUser).calledWith(target.handle).mockResolvedValue(target);

		const response = await supertest(server).get(`/users/${target.handle}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(target, false));
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 404 if user can't be found", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const handle = faker.internet.userName();
		when(findUser).calledWith(handle).mockResolvedValue(null);

		const response = await supertest(server).get(`/users/${handle}`);

		expect(response.status).toBe(404);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).get('/users/handle');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('POST /users', () => {
	it('returns 201 for correct request', async () => {
		when(tokenPermissions).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		when(createUser).calledWith(props).mockResolvedValue(user);

		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(201);
		expect(response.body).toEqual(comparableUser(user, false));
		expect(createUser).toHaveBeenCalledTimes(1);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid props', async () => {
		when(tokenPermissions).mockResolvedValue(primary);

		const props = { handle: faker.internet.userName() };
		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(422);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid handle', async () => {
		when(tokenPermissions).mockResolvedValue(primary);

		const props = {
			handle: '€€.{]',
			password: faker.internet.password(),
			name: faker.name.fullName(),
		};
		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(422);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when creating an admin as a moderator', async () => {
		const primary = usableUserFactory({ role: 'MOD' });
		when(tokenPermissions).mockResolvedValue(primary);

		const props = {
			handle: 'handle',
			password: 'password',
			name: 'Name Namesson',
			role: 'ADMIN',
		};
		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(403);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 409 when a collision occurs in the database', async () => {
		when(tokenPermissions).mockResolvedValue(primary);
		const props = {
			handle: 'handle',
			password: 'password',
			name: 'Name Namesson',
		};
		when(createUser)
			.calledWith(props)
			.mockRejectedValue(
				new PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '4.8.0' })
			);

		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(409);
		expect(createUser).toHaveBeenCalledTimes(1);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when database communication fails unexpectedly', async () => {
		when(tokenPermissions).mockResolvedValue(primary);
		const props = {
			handle: 'handle',
			password: 'password',
			name: 'Name Namesson',
		};
		when(createUser).calledWith(props).mockRejectedValue(new Error());

		const response = await supertest(server).post('/users').send(props);

		expect(response.status).toBe(500);
		expect(createUser).toHaveBeenCalledTimes(1);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenPermissions).mockResolvedValue(null);

		const response = await supertest(server).post('/users').send();

		expect(response.status).toBe(500);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});
});

describe('POST /users/secret', () => {
	const secret = faker.random.alphaNumeric(20);
	const secretHash = faker.random.alphaNumeric(20);
	const ugSecret = {
		id: USER_GENERATOR_SECRET,
		secretHash,
		generatedByHandle: primary.handle,
	};

	it('returns 201 for correct request', async () => {
		when(getUserGeneratorSecret).calledWith().mockResolvedValue(ugSecret);
		when(comparePasswordHash).calledWith(secret, secretHash).mockResolvedValue(true);
		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		when(createUser).calledWith(props, true).mockResolvedValue(user);

		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(201);
		expect(response.body).toEqual(comparableUser(user));
		expect(getUserGeneratorSecret).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(createUser).toHaveBeenCalledTimes(1);
	});

	it('returns 422 if no secret provided', async () => {
		const response = await supertest(server).post('/users/secret').send();

		expect(response.status).toBe(422);
	});

	it('returns 422 for invalid props', async () => {
		const props = { handle: faker.internet.userName() };
		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(422);
	});

	it('returns 422 for invalid handle', async () => {
		const props = {
			handle: '€€.{]',
			password: faker.internet.password(),
			name: faker.name.fullName(),
		};
		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(422);
	});

	it("returns 500 if secret doesn't exist", async () => {
		when(getUserGeneratorSecret).calledWith().mockResolvedValue(null);

		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(500);
	});

	it('returns 400 for incorrect secret', async () => {
		when(getUserGeneratorSecret).calledWith().mockResolvedValue(ugSecret);
		when(comparePasswordHash).calledWith(secret, secretHash).mockResolvedValue(false);

		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(400);
		expect(getUserGeneratorSecret).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
	});

	it('returns 409 when provided handle is already in use', async () => {
		when(getUserGeneratorSecret).calledWith().mockResolvedValue(ugSecret);
		when(comparePasswordHash).calledWith(secret, secretHash).mockResolvedValue(true);
		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		when(createUser)
			.calledWith(props, true)
			.mockRejectedValue(
				new PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '4.8.0' })
			);

		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(409);
		expect(getUserGeneratorSecret).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(createUser).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when database communication fails unexpectedly', async () => {
		when(getUserGeneratorSecret).calledWith().mockResolvedValue(ugSecret);
		when(comparePasswordHash).calledWith(secret, secretHash).mockResolvedValue(true);
		const user = usableUserFactory({ role: 'BASE' });
		const props = { password: faker.internet.password(), handle: user.handle, name: user.name };
		when(createUser).calledWith(props, true).mockRejectedValue(new Error());

		const response = await supertest(server)
			.post('/users/secret')
			.set('Authorization', secret)
			.send(props);

		expect(response.status).toBe(500);
		expect(getUserGeneratorSecret).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(createUser).toHaveBeenCalledTimes(1);
	});
});

describe('PATCH /users/:handle', () => {
	it('returns 200 for correct request (other user)', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const props = { email: faker.internet.email(...user.name.split(' ')) };
		const expectedUser = { ...user, ...props };
		when(updateUser).calledWith(user.handle, props).mockResolvedValue(expectedUser);

		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(expectedUser, false));
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 200 for correct request (own user)', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findUser).calledWith(primary.handle).mockResolvedValue(primary);
		const props = { email: faker.internet.email(...primary.name.split(' ')) };
		const expectedUser = { ...primary, ...props };
		when(updateUser).calledWith(primary.handle, props).mockResolvedValue(expectedUser);

		const response = await supertest(server).patch(`/users/${primary.handle}`).send(props);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(expectedUser));
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid props', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);

		const props = { email: 9 };
		const response = await supertest(server).patch('/users/handle').send(props);

		expect(response.status).toBe(422);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 403 is primary isn't allowed to edit user", async () => {
		const primary = usableUserFactory({ role: 'BASE', handle: 'primary' });
		when(tokenAuthentication).mockResolvedValue(primary);

		const props = { name: 'Name Namesson' };
		const response = await supertest(server).patch('/users/handle').send(props);

		expect(response.status).toBe(403);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 404 if user doesn't exist", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findUser).calledWith('handle').mockResolvedValue(null);

		const props = { name: 'Name Namesson' };
		const response = await supertest(server).patch('/users/handle').send(props);

		expect(response.status).toBe(404);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("Returns 403 when user doesn't have lower role than primary", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory();
		when(findUser).calledWith(user.handle).mockResolvedValue(user);

		const props = { comment: 'test' };
		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(403);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when non-mod tries to change their role', async () => {
		const primary = usableUserFactory({ role: 'BASE' });
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findUser).calledWith(primary.handle).mockResolvedValue(primary);

		const props = { role: 'MANAGER' };
		const response = await supertest(server).patch(`/users/${primary.handle}`).send(props);

		expect(response.status).toBe(403);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when a mod tries to change a role to mod or admin', async () => {
		const primary = usableUserFactory({ role: 'MOD' });
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);

		const props = { role: 'MOD' };
		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(403);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 200 when trying to change own password', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findUser).calledWith(primary.handle).mockResolvedValue(primary);
		const currentPassword = faker.internet.password();
		when(comparePasswordHash)
			.calledWith(currentPassword, primary.passwordHash)
			.mockResolvedValue(true);
		const props = { password: faker.internet.password(), currentPassword };
		const updatedUser = { ...primary, passwordHash: faker.random.alphaNumeric(20) };
		when(updateUser).calledWith(primary.handle, props).mockResolvedValue(updatedUser);

		const response = await supertest(server).patch(`/users/${primary.handle}`).send(props);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(updatedUser));
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when trying to change user password not as an ADMIN', async () => {
		const primary = usableUserFactory({ role: 'MOD' });
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);

		const props = { password: faker.internet.password() };
		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(403);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 422 when changing user password without providing primary's password", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);

		const props = { password: faker.internet.password() };
		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(422);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when changing user password and incorrect primary password', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const primaryPassword = faker.internet.password();
		when(comparePasswordHash)
			.calledWith(primaryPassword, primary.passwordHash)
			.mockResolvedValue(false);

		const props = { password: faker.internet.password(), currentPassword: primaryPassword };
		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(403);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 409 when a collision occurs', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const props = { email: faker.internet.email(...user.name.split(' ')) };
		when(updateUser)
			.calledWith(user.handle, props)
			.mockRejectedValue(
				new PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '4.8.0' })
			);

		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(409);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when database communication fails unexpectedly', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const user = usableUserFactory({ role: 'BASE' });
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const props = { email: faker.internet.email(...user.name.split(' ')) };
		when(updateUser).calledWith(user.handle, props).mockRejectedValue(new Error());

		const response = await supertest(server).patch(`/users/${user.handle}`).send(props);

		expect(response.status).toBe(500);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).patch('/users/handle');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('GET /authenticate', () => {
	it('Returns 200 for correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(setUserLastSignIn).mockResolvedValue();

		const response = await supertest(server).get('/authenticate');

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(primary));
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
		expect(setUserLastSignIn).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).get('/authenticate');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('POST /users/login', () => {
	it('Returns 200 for correct request', async () => {
		const user = usableUserFactory();
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const password = faker.internet.password();
		when(comparePasswordHash).calledWith(password, user.passwordHash).mockResolvedValue(true);
		when(setUserLastSignIn).mockResolvedValue();

		const response = await supertest(server)
			.post('/users/login')
			.send({ username: user.handle, password });

		expect(response.status).toBe(200);
		expect(response.body).toEqual(comparableUser(user));
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(setUserLastSignIn).toHaveBeenCalledTimes(1);
	});

	it('Returns 422 when no username is provided', async () => {
		const password = faker.internet.password();

		const response = await supertest(server).post('/users/login').send({ password });

		expect(response.status).toBe(422);
	});

	it('Returns 422 when no password is provided', async () => {
		const username = faker.internet.userName();

		const response = await supertest(server).post('/users/login').send({ username });

		expect(response.status).toBe(422);
	});

	it("Returns 404 when user doesn't exist", async () => {
		const username = faker.internet.userName();
		const password = faker.internet.password();
		when(findUser).calledWith(username).mockResolvedValue(null);

		const response = await supertest(server).post('/users/login').send({ username, password });

		expect(response.status).toBe(404);
		expect(findUser).toHaveBeenCalledTimes(1);
	});

	it('Returns 401 for incorrect password', async () => {
		const user = usableUserFactory();
		when(findUser).calledWith(user.handle).mockResolvedValue(user);
		const password = faker.internet.password();
		when(comparePasswordHash).calledWith(password, user.passwordHash).mockResolvedValue(false);

		const response = await supertest(server)
			.post('/users/login')
			.send({ username: user.handle, password });

		expect(response.status).toBe(401);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
	});
});

describe('POST /users/new-secret', () => {
	it('Returns 201 for correct request', async () => {
		when(tokenPermissions).mockResolvedValue(primary);
		const password = faker.internet.password();
		when(comparePasswordHash).calledWith(password, primary.passwordHash).mockResolvedValue(true);
		const newSecret = faker.random.alphaNumeric(20);
		when(createNewUserGeneratorSecret).calledWith(primary).mockResolvedValue(newSecret);

		const response = await supertest(server).post('/users/new-secret').send({ password });

		expect(response.status).toBe(201);
		expect(response.text).toBe(newSecret);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(createNewUserGeneratorSecret).toHaveBeenCalledTimes(1);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 422 when no password is provided', async () => {
		when(tokenPermissions).mockResolvedValue(primary);

		const response = await supertest(server).post('/users/new-secret').send({});

		expect(response.status).toBe(422);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('Returns 400 when provided password is incorrect', async () => {
		when(tokenPermissions).mockResolvedValue(primary);
		const password = faker.internet.password();
		when(comparePasswordHash).calledWith(password, primary.passwordHash).mockResolvedValue(false);

		const response = await supertest(server).post('/users/new-secret').send({ password });

		expect(response.status).toBe(400);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenPermissions).mockResolvedValue(null);

		const response = await supertest(server).post('/users/new-secret').send();

		expect(response.status).toBe(500);
		expect(tokenPermissions).toHaveBeenCalledTimes(1);
	});
});

describe('POST /users/forgot-password', () => {
	it('Returns 200 for correct request', async () => {
		const user = usableUserFactory();
		when(findUserFromEmail).calledWith(user.email!).mockResolvedValue(user);
		const resetToken = faker.random.alphaNumeric(20);
		when(generateUserResetToken).calledWith(user).mockResolvedValue(resetToken);
		when(sendEmail).calledWith(user, resetToken).mockResolvedValue();

		const response = await supertest(server)
			.post('/users/forgot-password')
			.send({ email: user.email });

		expect(response.status).toBe(200);
		expect(findUserFromEmail).toHaveBeenCalledTimes(1);
		expect(generateUserResetToken).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledWith(user, resetToken);
	});

	it("Returns 422 if email isn't a string", async () => {
		const response = await supertest(server).post('/users/forgot-password').send({ email: 9 });

		expect(response.status).toBe(422);
	});

	it("Returns 422 if email isn't valid", async () => {
		const response = await supertest(server)
			.post('/users/forgot-password')
			.send({ email: 'invalid#email:5' });

		expect(response.status).toBe(422);
	});

	it('Returns 404 if no user has provided email', async () => {
		const email = faker.internet.email();
		when(findUserFromEmail).calledWith(email).mockResolvedValue(null);

		const response = await supertest(server).post('/users/forgot-password').send({ email });

		expect(response.status).toBe(404);
		expect(findUserFromEmail).toHaveBeenCalledTimes(1);
	});

	it('Returns 500 if email fails to send', async () => {
		const user = usableUserFactory();
		when(findUserFromEmail).calledWith(user.email!).mockResolvedValue(user);
		const resetToken = faker.random.alphaNumeric(20);
		when(generateUserResetToken).calledWith(user).mockResolvedValue(resetToken);
		when(sendEmail).calledWith(user, resetToken).mockRejectedValue(new Error());

		const response = await supertest(server)
			.post('/users/forgot-password')
			.send({ email: user.email });

		expect(response.status).toBe(500);
		expect(findUserFromEmail).toHaveBeenCalledTimes(1);
		expect(generateUserResetToken).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledWith(user, resetToken);
	});
});

describe('POST /users/reset-password', () => {
	it('Returns 200 for correct request', async () => {
		const user = usableUserFactory();
		const b64Handle = Buffer.from(user.handle, 'utf8').toString('base64url');
		const resetToken = faker.random.alphaNumeric(32);
		const resetTokenHash = faker.random.alphaNumeric(20);
		when(findUserResetToken)
			.calledWith(user.handle)
			.mockResolvedValue({
				resetToken: resetTokenHash,
				userHandle: user.handle,
				validUntil: moment().add(4, 'hours').toDate(),
			});
		when(comparePasswordHash).calledWith(resetToken, resetTokenHash).mockResolvedValue(true);
		const password = faker.internet.password();
		when(updateUser).calledWith(user.handle, { password }).mockResolvedValue(user);
		when(deleteUserResetToken).calledWith(user.handle).mockResolvedValue();

		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token: resetToken + b64Handle, password });

		expect(response.status).toBe(200);
		expect(findUserResetToken).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledWith(user.handle, { password });
		expect(deleteUserResetToken).toHaveBeenCalledTimes(1);
		expect(deleteUserResetToken).toHaveBeenCalledWith(user.handle);
	});

	it("returns 422 when token isn't as string", async () => {
		const password = faker.internet.password();
		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token: 9, password });

		expect(response.status).toBe(422);
	});

	it("returns 422 when password isn't as string", async () => {
		const token = faker.random.alphaNumeric(32 + 8);
		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token, password: 9 });

		expect(response.status).toBe(422);
	});

	it("Returns 422 if token doesn't exist", async () => {
		const user = usableUserFactory();
		const b64Handle = Buffer.from(user.handle, 'utf8').toString('base64url');
		const resetToken = faker.random.alphaNumeric(32);
		when(findUserResetToken).calledWith(user.handle).mockResolvedValue(null);
		const password = faker.internet.password();

		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token: resetToken + b64Handle, password });

		expect(response.status).toBe(422);
		expect(findUserResetToken).toHaveBeenCalledTimes(1);
	});

	it('Returns 422 if token has expired', async () => {
		const user = usableUserFactory();
		const b64Handle = Buffer.from(user.handle, 'utf8').toString('base64url');
		const resetToken = faker.random.alphaNumeric(32);
		const resetTokenHash = faker.random.alphaNumeric(20);
		when(findUserResetToken)
			.calledWith(user.handle)
			.mockResolvedValue({
				resetToken: resetTokenHash,
				userHandle: user.handle,
				validUntil: moment().subtract(4, 'hours').toDate(),
			});
		const password = faker.internet.password();

		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token: resetToken + b64Handle, password });

		expect(response.status).toBe(422);
		expect(findUserResetToken).toHaveBeenCalledTimes(1);
	});

	it('Returns 200 for correct request', async () => {
		const user = usableUserFactory();
		const b64Handle = Buffer.from(user.handle, 'utf8').toString('base64url');
		const resetToken = faker.random.alphaNumeric(32);
		const resetTokenHash = faker.random.alphaNumeric(20);
		when(findUserResetToken)
			.calledWith(user.handle)
			.mockResolvedValue({
				resetToken: resetTokenHash,
				userHandle: user.handle,
				validUntil: moment().add(4, 'hours').toDate(),
			});
		when(comparePasswordHash).calledWith(resetToken, resetTokenHash).mockResolvedValue(false);
		const password = faker.internet.password();

		const response = await supertest(server)
			.post('/users/reset-password')
			.send({ token: resetToken + b64Handle, password });

		expect(response.status).toBe(422);
		expect(findUserResetToken).toHaveBeenCalledTimes(1);
		expect(comparePasswordHash).toHaveBeenCalledTimes(1);
	});
});

function comparableUser(
	user: UsableUser,
	withToken: boolean = true
): (Omit<UsableUser, 'token'> & { token: { token: string; expiresAt: string } }) | NoTokenUser {
	const { token, ...rest } = user;

	if (withToken) {
		return {
			...rest,
			token: { token: user.token.token, expiresAt: user.token.expiresAt.toISOString() },
		};
	}

	return rest;
}
