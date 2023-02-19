import { minimalListFactory, usableListFactory } from '../../factories/list.factory';
import { usableUserFactory } from '../../factories/user.factory';
import serverGenerator from '../../../src/server';
import supertest from 'supertest';
import { when } from 'jest-when';
import { createList, findList, findLists, updateList } from '../../../src/server/list/list.service';
import { CreateListProps, UpdateListProps } from '../../../src/server/list/list.model';
import { faker } from '@faker-js/faker';
import { tokenAuthentication } from '../../../src/utils/authentication';
import moment from 'moment';
import { findUser } from '../../../src/server/user/user.service';

const server = serverGenerator(false);

const primary = usableUserFactory();

jest.mock('../../../src/server/list/list.service', () => ({
	__esModule: true,
	findLists: jest.fn(),
	findList: jest.fn(),
	createList: jest.fn(),
	updateList: jest.fn(),
}));

jest.mock('../../../src/server/user/user.service', () => ({
	__esModule: true,
	findUser: jest.fn(),
}));

jest.mock('../../../src/utils/authentication', () => {
	const original = jest.requireActual('../../../src/utils/authentication');
	return {
		...original,
		__esmodule: true,
		tokenAuthentication: jest.fn(),
	};
});

describe('GET /lists', () => {
	it('returns 200 for a correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const minimalLists = minimalListFactory([{ id: 1 }, { id: 2 }]);
		when(findLists).calledWith().mockResolvedValue(minimalLists);

		const response = await supertest(server).get('/lists');

		expect(response.status).toBe(200);
		expect(response.body).toEqual(minimalLists);
		expect(findLists).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).get('/lists');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('GET /lists/:id', () => {
	it('returns 200 for a correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory();
		when(findList).calledWith(1).mockResolvedValue(list);

		const response = await supertest(server).get('/lists/1');

		expect(response.status).toBe(200);
		expect(response.body).toEqual(list);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid id', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);

		const response = await supertest(server).get('/lists/NaN');

		expect(response.status).toBe(422);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 404 for missing list', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findList).calledWith(1).mockResolvedValue(null);

		const response = await supertest(server).get('/lists/1');

		expect(response.status).toBe(404);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).get('/lists/1');

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('POST /lists', () => {
	it('returns 201 for a correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({
			createdBy: { name: primary.name, handle: primary.handle, role: primary.role },
		});
		const props: CreateListProps = {
			type: list.type,
			version: list.version,
			structure: list.structure,
			colors: list.colors ?? undefined,
		};
		when(createList).calledWith(props, primary).mockResolvedValue(list);

		const response = await supertest(server).post('/lists').send(props);

		expect(response.status).toBe(201);
		expect(response.body).toEqual(list);
		expect(createList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid properties', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);

		const props = { type: 'string', version: 9 };
		const response = await supertest(server).post('/lists').send(props);

		expect(response.status).toBe(422);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).post('/lists').send();

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('PATCH /lists/:id', () => {
	it('returns 200 for a correct request', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);
		const props: UpdateListProps = {
			comment: faker.lorem.sentence(),
		};
		const expectedList = { ...list, ...props };
		when(updateList).calledWith(list.id, props, list).mockResolvedValue(expectedList);

		const result = await supertest(server).patch('/lists/1').send(props);

		expect(result.status).toBe(200);
		expect(result.body).toEqual(expectedList);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(updateList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid id', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);

		const result = await supertest(server).patch('/lists/NaN');

		expect(result.status).toBe(422);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 404 if list doesn't exist", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		when(findList).calledWith(1).mockResolvedValue(null);

		const response = await supertest(server).patch('/lists/1');

		expect(response.status).toBe(404);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 422 for invalid properties', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { comment: 5 };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(422);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('Returns 422 for eventDate in the future', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { eventDate: faker.date.future().toISOString().slice(0, 10) };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(422);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 403 if user isn't allowed to edit", async () => {
		const otherUser = usableUserFactory({ handle: 'other', role: 'BASE' });
		when(tokenAuthentication).mockResolvedValue(otherUser);
		const list = usableListFactory({ id: 1, createdBy: primary });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { comment: faker.lorem.sentence() };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(403);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 409 when trying to change owner of a submitted list', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1, createdBy: primary, submitted: true });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { owner: 'other-user' };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(409);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 404 when trying to change list owner to a user that doesn't exist", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1, createdBy: primary });
		when(findList).calledWith(1).mockResolvedValue(list);
		const otherUserHandle = 'other-user';
		when(findUser).calledWith(otherUserHandle).mockResolvedValue(null);

		const props = { owner: otherUserHandle };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(404);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(findUser).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it("returns 409 when trying to verify a list that isn't submitted", async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { verified: true };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(409);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 403 if a non manager (or higher) tries verify a list', async () => {
		const user = usableUserFactory({ role: 'BASE' });
		when(tokenAuthentication).mockResolvedValue(user);
		const list = usableListFactory({ id: 1, submitted: true });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { verified: true };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(403);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when manager tries to verify their own list', async () => {
		const user = usableUserFactory({ role: 'MANAGER' });
		when(tokenAuthentication).mockResolvedValue(user);
		const list = usableListFactory({ id: 1, submitted: true, ownedBy: user });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { verified: true };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(403);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 200 when submitting an incomplete list with complementary props', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);
		const props = {
			submitted: true,
			eventDate: moment().format('YYYY-MM-DD'),
			phoneNumber: faker.phone.number().replace(/[ \-\(\)x\.]/g, ''),
			responsible: faker.name.fullName(),
		};
		const expectedList = { ...list, ...props };
		when(updateList).calledWith(list.id, props, list).mockResolvedValue(expectedList);

		const response = await supertest(server).patch('/lists/1').send(props);

		if (response.status !== 200) console.log(props.phoneNumber);
		expect(response.status).toBe(200);
		expect(response.body).toEqual(expectedList);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(updateList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 409 when submitting an incomplete list', async () => {
		when(tokenAuthentication).mockResolvedValue(primary);
		const list = usableListFactory({ id: 1 });
		when(findList).calledWith(1).mockResolvedValue(list);

		const props = { submitted: true };
		const response = await supertest(server).patch('/lists/1').send(props);

		expect(response.status).toBe(409);
		expect(findList).toHaveBeenCalledTimes(1);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when tokenAuthentication returns null and sends no response', async () => {
		when(tokenAuthentication).mockResolvedValue(null);

		const response = await supertest(server).patch('/lists/1').send();

		expect(response.status).toBe(500);
		expect(tokenAuthentication).toHaveBeenCalledTimes(1);
	});
});
