import { PrismaClientInitializationError } from '@prisma/client/runtime';
import { prismaConnect } from './prismaClient';
import serverGenerator from './server';

const port = Number(process.env.PORT) || 8000;

async function main() {
	console.log('Connecting to database...');
	try {
		await prismaConnect();
	} catch (e) {
		console.error((e as PrismaClientInitializationError).message);
		process.exit(1);
	}

	const server = serverGenerator(true);
	server.listen({ port }, () => {
		console.log(`Available at port ${port}`);
	});
}

main();
