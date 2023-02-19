import prismaClient from '../../prismaClient';
import { UsableUser } from '../user/user.model';
import {
	CreateListProps,
	MinimalList,
	MissingOwnerList,
	UpdateListProps,
	UsableList,
} from './list.model';

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
	const list = (await prismaClient.list.findUnique({
		where: { id },
		select: listSelect,
	})) as MissingOwnerList | null;

	return makeListUsable(list);
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

	const list = (await prismaClient.list.create({
		data: { ...props, fields, createdBy: { connect: { handle: creator.handle } } },
		select: listSelect,
	})) as MissingOwnerList;

	return makeListUsable(list);
}

export async function updateList(
	id: number,
	{ fields, owner, ...props }: UpdateListProps,
	existingList: UsableList
): Promise<UsableList> {
	const newFields = fields && { ...existingList.fields, ...fields };
	const list = (await prismaClient.list.update({
		where: { id },
		data: { ...props, fields: newFields, updatedAt: new Date(), ownedByHandle: owner },
		select: listSelect,
	})) as MissingOwnerList;

	return makeListUsable(list);
}

function makeListUsable(list: null): null;
function makeListUsable(list: MissingOwnerList): UsableList;
function makeListUsable(list: MissingOwnerList | null): UsableList | null;
function makeListUsable(list: MissingOwnerList | null): UsableList | null {
	if (!list) return null;
	if (list.ownedBy) return list as UsableList;

	return { ...list, ownedBy: list.createdBy };
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
	ownedBy: { select: { handle: true, name: true, role: true } },
};
