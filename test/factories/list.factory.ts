import { faker } from '@faker-js/faker';
import { MinimalList, UsableList } from '../../src/server/list/list.model';
import factory from './factory';

export const minimalListFactory = factory<MinimalList>(() => ({
	id: 1,
	type: faker.lorem.word(),
	version: 'v' + faker.random.numeric(1),
	eventDate: null,
	submitted: false,
	verified: false,
}));

export const usableListFactory = factory<UsableList>(() => ({
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
	submitted: false,
	verified: false,
	createdBy: { handle: faker.internet.userName(), name: faker.name.fullName(), role: 'BASE' },
}));
