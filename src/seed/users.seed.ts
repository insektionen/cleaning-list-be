import { createUser } from '../server/user/user.service';

async function main() {
	console.log('Creating users...');
	await createUser({ handle: 'admin', name: 'Admin', password: 'admin', role: 'ADMIN' });
	await createUser({ handle: 'mod', name: 'Mod', password: 'mod', role: 'MOD' });
	await createUser({ handle: 'manager', name: 'Manager', password: 'manager', role: 'MANAGER' });
	await createUser({ handle: 'base', name: 'Base', password: 'base', role: 'BASE' });
	console.log('Users created');
}

main();
