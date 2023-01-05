import { Express } from 'express';
import { roleIsAtLeast, tokenAuthentication, tokenPermissions } from '../../utils/authentication';
import { comparePasswordHash } from '../../utils/bcrypt';
import {
	createNewUserGeneratorSecret,
	getUserGeneratorSecret,
} from '../../utils/userGeneratorSecret';
import { sendEmail } from '../../utils/passwordRecovery';
import { emailRegex, usernameRegex as handleRegex } from '../../utils/regex';
import {
	isCreateUserProps,
	isCreateUserWithSecretProps,
	isUpdateUserProps,
	NoTokenUser,
	UsableUser,
} from './user.model';
import {
	createUser,
	deleteUserResetToken,
	findUser,
	findUserFromEmail,
	findUserResetToken,
	findUsers,
	generateUserResetToken,
	updateUser,
} from './user.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import route from '../../utils/route';

export default function (server: Express) {
	server.get(
		'/users',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const users = await findUsers();
			res.status(200).send(users);
		})
	);

	server.get(
		'/users/:handle',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const { handle } = req.params;
			const user = await findUser(handle);
			if (!user) return res.status(404).send(`No user with the handle '${handle}' exists`);
			res.status(200).send(removeUserToken(user));
		})
	);

	server.post(
		'/users',
		route(async (req, res) => {
			const caller = await tokenPermissions(req, res, 'MANAGER');
			if (!caller) return res.headersSent || res.sendStatus(500);

			const userProps = req.body;
			if (!isCreateUserProps(userProps))
				return res.status(422).send('Provided properties can not create a user');
			if (!userProps.handle.match(handleRegex))
				return res
					.status(422)
					.send('Username can only contain alphanumeric characters, dash, and underscore');

			if (!roleIsAtLeast(caller.role, 'MOD') && !['BASE', undefined].includes(userProps.role))
				return res
					.status(403)
					.send(`User must be a moderator to create another user with the role ${userProps.role}`);
			if (userProps.role === 'ADMIN' && caller.role !== 'ADMIN')
				return res.status(403).send('User is not allowed to create a new admin');

			try {
				const user = await createUser(userProps);
				res.status(201).send(removeUserToken(user));
			} catch (e) {
				if (e instanceof PrismaClientKnownRequestError)
					return res
						.status(409)
						.send(`A user already exists with the handle '${userProps.handle}'`);

				return res.status(500).send('An unexpected error has occured');
			}
		})
	);

	server.post(
		'/users/secret',
		route(async (req, res) => {
			const secret = req.headers.authorization;
			if (!secret) return res.status(422).send('No secret provided');

			const userProps = req.body;
			if (!isCreateUserWithSecretProps(userProps))
				return res.status(422).send('Provided properties can not create a user');
			if (!userProps.handle.match(handleRegex))
				return res
					.status(422)
					.send('Username can only contain alphanumeric characters, dash, and underscore');

			const userGeneratorSecret = await getUserGeneratorSecret();
			if (!userGeneratorSecret)
				return res.status(500).send("Sever doesn't have a secret.\n\nPlease contact an admin");

			if (!(await comparePasswordHash(secret, userGeneratorSecret.secretHash)))
				return res.status(400).send('Incorrect secret');

			try {
				const user = await createUser(userProps);
				res.status(201).send(user);
			} catch (e) {
				if (e instanceof PrismaClientKnownRequestError) {
					return res
						.status(409)
						.send(`A user already exists with the handle '${userProps.handle}'`);
				}

				return res.status(500).send('An unexpected error has occured');
			}
		})
	);

	server.patch(
		'/users/:handle',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const { handle } = req.params;
			const userProps = req.body;
			if (!isUpdateUserProps(userProps))
				return res.status(422).send('Provided properties can not edit a user');
			// Is allowed to edit the user
			const ownUser = caller.handle === handle;
			if (!roleIsAtLeast(caller.role, 'MOD') && !ownUser)
				return res.status(403).send('Not allowed to edit this user');
			// Does the user exist
			const currentUser = await findUser(handle);
			if (!currentUser) return res.status(404).send(`No user with the handle ${handle} existst`);

			// Caller is allowed to change role
			if (userProps.role && !roleIsAtLeast(caller.role, 'MOD'))
				return res.status(403).send('User must be a moderator to change a users roles');
			if (userProps.role && roleIsAtLeast(userProps.role, 'MOD') && caller.role !== 'ADMIN')
				return res.status(403).send(`User is not allowed to change to ${userProps.role}`);

			// Validate caller if trying to change password
			if (userProps.password && !userProps.currentPassword)
				return res.status(422).send("Must provide current password to change user's password.");
			if (
				userProps.password &&
				!(await comparePasswordHash(userProps.currentPassword!, caller.passwordHash))
			)
				return res.status(403).send('Incorrect password');

			try {
				const user = await updateUser(handle, userProps);
				res.status(200).send(ownUser ? user : removeUserToken(user));
			} catch (e) {
				if (e instanceof PrismaClientKnownRequestError)
					return res.status(409).send(`Another user already has the email '${userProps.email}'`);

				return res.status(500).send('An unexpected error has occured');
			}
		})
	);

	server.get(
		'/authenticate',
		route(async (req, res) => {
			const user = await tokenAuthentication(req, res);
			if (!user) return res.headersSent || res.sendStatus(500);

			res.status(200).send(user);
		})
	);

	server.post(
		'/users/login',
		route(async (req, res) => {
			const { username, password } = req.body;
			if (!username) return res.status(422).send('No username provided');
			if (!password) return res.status(422).send('No password provided');
			const user = await findUser(username);
			if (!user) return res.status(404).send(`No user with the username ${username} exists`);
			if (!(await comparePasswordHash(password, user.passwordHash)))
				return res.status(401).send('Incorrect password');

			res.status(200).send(user);
		})
	);

	server.post(
		'/users/new-secret',
		route(async (req, res) => {
			const caller = await tokenPermissions(req, res, 'ADMIN');
			if (!caller) return res.headersSent || res.sendStatus(500);

			const password = req.body.password;
			if (typeof password !== 'string') return res.status(422).send('Must provide password');

			if (!(await comparePasswordHash(password, caller.passwordHash)))
				return res.status(400).send('Incorrect password');

			const newSecret = await createNewUserGeneratorSecret(caller);

			res.status(201).send(newSecret);
		})
	);

	server.post(
		'/users/forgot-password',
		route(async (req, res) => {
			const { email } = req.body;
			if (typeof email !== 'string' || !email.match(emailRegex))
				return res.status(422).send('Must provide an email to recover password for');

			const user = await findUserFromEmail(email);
			if (!user) return res.status(404).send('No user is registered with the provided email');

			const resetToken = await generateUserResetToken(user);

			try {
				await sendEmail(user, resetToken);
				res.status(200).send('Successfully sent password recovery email');
			} catch (e) {
				res.status(500).send('Something went wrong sending the email');
			}
		})
	);

	server.post(
		'/users/reset-password',
		route(async (req, res) => {
			const { token, password } = req.body;
			if (typeof token !== 'string' || typeof password !== 'string')
				return res.status(422).send('Provided properties can not reset a password');

			const [resetToken, b64Handle] = [token.substring(0, 32), token.substring(32)];
			const handle = Buffer.from(b64Handle, 'base64url').toString('utf8');

			const userResetToken = await findUserResetToken(handle);
			if (
				!userResetToken ||
				userResetToken.validUntil <= new Date() ||
				!(await comparePasswordHash(resetToken, userResetToken.resetToken))
			)
				return res.status(422).send('Invalid token');

			await updateUser(handle, { password });
			await deleteUserResetToken(handle);

			return res.sendStatus(200);
		})
	);
}

function removeUserToken({ token, ...user }: UsableUser): NoTokenUser {
	return user;
}
