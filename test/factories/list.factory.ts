import { faker } from '@faker-js/faker';
import { MinimalList, UsableList } from '../../src/server/list/list.model';
import { MinimalUser } from '../../src/server/user/user.model';
import factory from './factory';

export const minimalListFactory = factory<MinimalList>(() => ({
	id: 1,
	type: faker.lorem.word(),
	version: 'v' + faker.random.numeric(1),
	eventDate: null,
	status: 'open',
	submittedAt: null,
	verified: null,
}));

export const usableListFactory = factory<UsableList>(() => {
	const creator: MinimalUser = {
		handle: faker.internet.userName(),
		name: faker.name.fullName(),
		role: 'BASE',
	};
	return {
		id: 1,
		type: faker.lorem.word(),
		version: 'v' + faker.random.numeric(1),
		structure: [],
		fields: {},
		colors: null,
		responsible: null,
		phoneNumber: null,
		eventDate: null,
		comment: null,
		status: 'open',
		submittedAt: null,
		verified: null,
		createdBy: creator,
		ownedBy: creator,
	};
});
