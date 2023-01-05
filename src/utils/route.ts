import { Request, Response } from 'express';

export default function route(
	handler: (request: Request, response: Response) => Promise<any>
): (request: Request, response: Response) => Promise<void> {
	return async function (request: Request, response: Response) {
		try {
			await handler(request, response);
		} catch (e) {
			console.error(e);
			if (response.headersSent) return;
			response.status(500).send('An unknown error occured');
		}
	};
}
