import bodyParser from 'body-parser';
import chalk from 'chalk';
import cors from 'cors';
import express, { Request } from 'express';
import moment from 'moment';
import listRoutes from './list/list.routes';
import userRoutes from './user/user.routes';

export default function serverGenerator(logMethods: boolean = false) {
	const server = express();
	server.use(bodyParser.json());
	server.use(cors());
	if (logMethods)
		server.use((req, _res, next) => {
			const { path } = req;
			const method = printMethod(req);
			console.log(`${moment().format('YYYY-MM-DD HH:mm:ss.SSS')} ${method} ${path}`);
			next();
		});

	userRoutes(server);
	listRoutes(server);

	return server;
}

function printMethod(req: Request) {
	switch (req.method) {
		case 'GET':
			return chalk.green('    GET');
		case 'POST':
			return chalk.blue('   POST');
		case 'PATCH':
			return chalk.yellow('  PATCH');
		case 'DELETE':
			return chalk.red(' DELETE');
		case 'OPTIONS':
			return chalk.magenta('OPTIONS');
		default:
			return chalk.gray('UNKNOWN');
	}
}
