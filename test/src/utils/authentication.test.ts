import { Request, Response } from 'express';
import { when } from 'jest-when';
import moment from 'moment';
import { findUserFromToken } from '../../../src/server/user/user.service';
import { tokenAuthentication, tokenPermissions } from '../../../src/utils/authentication';
import { usableUserFactory } from '../../factories/user.factory';

jest.mock('../../../src/server/user/user.service', () => ({
	__esModule: true,
	findUserFromToken: jest.fn(),
}));

describe('tokenAuthentication', () => {
	it('returns authenticated user', async () => {
		const user = usableUserFactory();
		when(findUserFromToken).calledWith(user.token.token).mockResolvedValue(user);

		const request = { headers: { authorization: user.token.token } } as Request;
		const response = {} as Response;

		const result = await tokenAuthentication(request, response);

		expect(result).toEqual(user);
		expect(findUserFromToken).toHaveBeenCalledTimes(1);
	});

	it('responds with 400 if no token is provided', async () => {
		const send = jest.fn(() => true);
		const status = jest.fn(() => ({ send }));
		const request = { headers: {} } as Request;
		const response = { status } as unknown as Response;

		const result = await tokenAuthentication(request, response);

		expect(result).toBe(null);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenLastCalledWith(400);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('responds with 404 if no user exists with provided token', async () => {
		const token = 'string';
		when(findUserFromToken).calledWith(token).mockResolvedValue(null);

		const send = jest.fn(() => true);
		const status = jest.fn(() => ({ send }));
		const request = { headers: { authorization: token } } as Request;
		const response = { status } as unknown as Response;

		const result = await tokenAuthentication(request, response);

		expect(result).toBe(null);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenLastCalledWith(404);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('responds with 401 if no token has expired', async () => {
		const user = usableUserFactory({
			token: { token: 'new_token.rng', expiresAt: moment().subtract(15, 'days').toDate() },
		});
		when(findUserFromToken).calledWith(user.token.token).mockResolvedValue(user);

		const send = jest.fn(() => true);
		const status = jest.fn(() => ({ send }));
		const request = { headers: { authorization: user.token.token } } as Request;
		const response = { status } as unknown as Response;

		const result = await tokenAuthentication(request, response);

		expect(result).toBe(null);
		expect(findUserFromToken).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenLastCalledWith(401);
		expect(send).toHaveBeenCalledTimes(1);
	});
});

describe('tokenPermissions', () => {
	it('returns user with permission', async () => {
		const user = usableUserFactory();
		when(findUserFromToken).calledWith(user.token.token).mockResolvedValue(user);

		const request = { headers: { authorization: user.token.token } } as Request;
		const response = {} as Response;

		const result = await tokenPermissions(request, response, 'BASE');

		expect(result).toEqual(user);
		expect(findUserFromToken).toHaveBeenCalledTimes(1);
	});

	it('returns null when tokenAuthentication returns null', async () => {
		const send = jest.fn(() => true);
		const status = jest.fn(() => ({ send }));
		const request = { headers: {} } as Request;
		const response = { status } as unknown as Response;

		const result = await tokenPermissions(request, response, 'ADMIN');

		expect(result).toBe(null);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenLastCalledWith(400);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('responds with 403 if user is not permitted', async () => {
		const user = usableUserFactory({ role: 'BASE' });
		when(findUserFromToken).calledWith(user.token.token).mockResolvedValue(user);

		const send = jest.fn(() => true);
		const status = jest.fn(() => ({ send }));
		const request = { headers: { authorization: user.token.token } } as Request;
		const response = { status } as unknown as Response;

		const result = await tokenPermissions(request, response, 'ADMIN');

		expect(result).toEqual(null);
		expect(findUserFromToken).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenLastCalledWith(403);
		expect(send).toHaveBeenCalledTimes(1);
	});
});
