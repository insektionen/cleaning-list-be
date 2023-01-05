import prismaClient from '../../prismaClient';
import { UsableUser } from '../user/user.model';
import { CreateListProps, MinimalList, UpdateListProps, UsableList } from './list.model';

type FindListsFilter = {
	createdBy?: string;
};

export async function findLists(filter: FindListsFilter = {}): Promise<MinimalList[]> {
	const { createdBy: createdByHandle } = filter;

	return await prismaClient.list.findMany({
		select: {
			id: true,
			type: true,
			version: true,
			eventDate: true,
			submitted: true,
			verified: true,
		},
		where: createdByHandle ? { createdByHandle } : undefined,
		orderBy: { updatedAt: 'desc' },
	});
}

export async function findList(id: number): Promise<UsableList | null> {
	return (await prismaClient.list.findUnique({
		where: { id },
		select: listSelect,
	})) as UsableList | null;
}

export async function createList(props: CreateListProps, creator: UsableUser): Promise<UsableList> {
	const fields: UsableList['fields'] = {};
	props.structure.forEach((area, areaIndex) => {
		area.categories.forEach((cat, catIdex) => {
			cat.checks.forEach(
				(_check, checkIndex) => (fields[`${areaIndex}.${catIdex}.${checkIndex}`] = false)
			);
		});
	});

	return (await prismaClient.list.create({
		data: { ...props, fields, createdBy: { connect: { handle: creator.handle } } },
		select: listSelect,
	})) as UsableList;
}

export async function updateList(
	id: number,
	{ fields, ...props }: UpdateListProps,
	existingList: UsableList
): Promise<UsableList> {
	const newFields = fields && { ...existingList.fields, ...fields };
	return (await prismaClient.list.update({
		where: { id },
		data: { ...props, fields: newFields, updatedAt: new Date() },
		select: listSelect,
	})) as UsableList;
}

const listSelect = {
	id: true,
	type: true,
	version: true,
	structure: true,
	fields: true,
	colors: true,
	responsible: true,
	phoneNumber: true,
	eventDate: true,
	comment: true,
	submitted: true,
	verified: true,
	createdBy: { select: { handle: true, name: true, role: true } },
};
