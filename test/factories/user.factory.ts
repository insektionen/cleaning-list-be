import moment from 'moment';
import { faker } from '@faker-js/faker';
import { MinimalUser, UsableUser } from '../../src/server/user/user.model';
import factory from './factory';

export const usableUserFactory = factory<UsableUser>(() => {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();
	return {
		handle: faker.internet.userName(firstName, lastName).replace(/[^\w-]/, ''),
		name: `${firstName} ${lastName}`,
		email: faker.internet.email(firstName, lastName),
		role: 'ADMIN',
		passwordHash: faker.random.alphaNumeric(20),
		token: { token: faker.random.alphaNumeric(20), expiresAt: moment().add(15, 'days').toDate() },
	};
});

export const minimalUserFactory = factory<MinimalUser>(() => {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();
	return {
		handle: faker.internet.userName(firstName, lastName).replace(/[^\w-]/, ''),
		name: `${firstName} ${lastName}`,
		role: 'ADMIN',
	};
});
