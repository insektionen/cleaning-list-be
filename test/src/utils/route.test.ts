import { Request, Response } from 'express';
import route from '../../../src/utils/route';

describe('route', () => {
	it('Runs handler', async () => {
		const request = {} as Request;
		const response = {} as Response;
		const handler = jest.fn();

		const test = route(handler);
		test(request, response);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(request, response);
	});

	it('Handles random error and send 500 reponse', async () => {
		const mockConsole = jest.spyOn(console, 'error').mockImplementation();
		const send = jest.fn();
		const status = jest.fn(() => ({ send }));
		const request = {} as Request;
		const response = { status } as unknown as Response;
		const handler = jest.fn(() => {
			throw new Error();
		});

		const test = route(handler);
		test(request, response);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(request, response);
		expect(mockConsole).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenCalledWith(500);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("Handles random error and doesn't send response if it's already been sent", async () => {
		const mockConsole = jest.spyOn(console, 'error').mockImplementation();
		const status = jest.fn();
		const request = {} as Request;
		const response = { status, headersSent: true } as unknown as Response;
		const handler = jest.fn(() => {
			throw new Error();
		});

		const test = route(handler);
		test(request, response);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(request, response);
		expect(mockConsole).toHaveBeenCalledTimes(1);
		expect(status).toHaveBeenCalledTimes(0);
	});
});
