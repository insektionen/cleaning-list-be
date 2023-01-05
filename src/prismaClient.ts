import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export async function prismaConnect() {
	await prismaClient.$connect();
	console.log('Database connection established');
}

export default prismaClient;
