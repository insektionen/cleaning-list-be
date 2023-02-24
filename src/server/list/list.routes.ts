import { Express } from 'express';
import moment from 'moment';
import { roleIsAtLeast, tokenAuthentication } from '../../utils/authentication';
import bodyFilter from '../../utils/bodyFilter';
import route from '../../utils/route';
import { findUser } from '../user/user.service';
import { isCreateListProps, isUpdateListProps } from './list.model';
import { createList, findList, findLists, updateList } from './list.service';

export default function (server: Express) {
	server.get(
		'/lists',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const lists = await findLists();
			res.status(200).send(lists);
		})
	);

	server.get(
		'/lists/:id',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const id = Number(req.params.id);
			if (Number.isNaN(id)) return res.status(422).send('Provided id is not a number');
			const list = await findList(id);
			if (!list) return res.status(404).send(`No list exists with the id ${id}`);

			res.status(200).send(list);
		})
	);

	server.post(
		'/lists',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const props = bodyFilter(req.body, ['type', 'version', 'structure', 'colors']);
			if (!isCreateListProps(props))
				return res.status(422).send('Provided properties can not create a list');

			const list = await createList(props, caller);
			res.status(201).send(list);
		})
	);

	server.patch(
		'/lists/:id',
		route(async (req, res) => {
			const caller = await tokenAuthentication(req, res);
			if (!caller) return res.headersSent || res.sendStatus(500);

			const id = Number(req.params.id);
			if (Number.isNaN(id)) return res.status(422).send('Provided id is not a number');
			const list = await findList(id);
			if (!list) return res.status(404).send(`No list exists with the id ${id}`);

			const props = bodyFilter(req.body, [
				'fields',
				'responsible',
				'phoneNumber',
				'eventDate',
				'comment',
				'submitted',
				'verified',
				'owner',
			]);
			if (!isUpdateListProps(props))
				return res.status(422).send('Provided properties cannot edit a list');
			if (props.eventDate && moment().isBefore(props.eventDate))
				return res.status(422).send('Event date cannot be in the future');

			if (
				caller.handle !== list.ownedBy.handle &&
				!roleIsAtLeast(caller.role, 'MOD') &&
				Object.keys(props).some((value) =>
					[
						'comment',
						'eventDate',
						'fields',
						'phoneNumber',
						'responsible',
						'submitted',
						'owner',
					].includes(value)
				)
			)
				return res
					.status(403)
					.send('Must be owner of the list or a moderator to change those properties');

			if (props.owner) {
				if (list.submittedAt)
					return res.status(409).send("It's not possible to change owner of a submitted list");
				if (!(await findUser(props.owner)))
					return res.status(404).send(`No user with the handle '${props.owner}' exists`);
			}

			if (props.verified && !list.submittedAt)
				return res.status(409).send("It's not possible to verify a list that isn't submitted");
			if (
				props.verified !== undefined &&
				!roleIsAtLeast(caller.role, 'MOD') &&
				(caller.role !== 'MANAGER' || caller.handle === list.ownedBy.handle)
			)
				return res.status(403).send('User is not allowed to verify this list');

			const expectedList: Record<string, string | null> = {
				eventDate: props.eventDate ?? list.eventDate,
				phoneNumber: props.phoneNumber ?? list.phoneNumber,
				responsible: props.responsible ?? list.responsible,
			};
			if (
				props.submitted &&
				(!expectedList.eventDate || !expectedList.phoneNumber || !expectedList.responsible)
			)
				return res.status(409).send(`Can't submit a list that is missing required properties`);

			if (props.submitted && list.ownedBy.handle !== caller.handle) props.owner = caller.handle;

			const updatedList = await updateList(id, props, list, caller);

			res.status(200).send(updatedList);
		})
	);
}
