import { Prisma } from '@prisma/client';
import prismaClient from '../../prismaClient';
import { UsableUser } from '../user/user.model';
import {
	CreateListProps,
	MinimalList,
	IncompleteUsableList,
	UpdateListProps,
	UsableList,
	IncompleteMinimalList,
	ListStatus,
} from './list.model';

type FindListsFilter = {
	createdBy?: string;
};

export async function findLists(filter: FindListsFilter = {}): Promise<MinimalList[]> {
	const { createdBy: createdByHandle } = filter;

	return await prismaClient.list
		.findMany({
			select: {
				id: true,
				type: true,
				version: true,
				eventDate: true,
				submittedAt: true,
				verified: {
					select: { verifiedAt: true, verifiedBy: true },
				},
			},
			where: createdByHandle ? { createdByHandle } : undefined,
			orderBy: { updatedAt: 'desc' },
		})
		.then((lists) => lists.map((l) => makeListMinimal(l)));
}

export async function findList(id: number): Promise<UsableList | null> {
	const list = (await prismaClient.list.findUnique({
		where: { id },
		select: listSelect,
	})) as IncompleteUsableList | null;

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
	})) as unknown as IncompleteUsableList;

	return makeListUsable(list);
}

export async function updateList(
	id: number,
	{ fields, owner, submitted, verified: setVerified, ...props }: UpdateListProps,
	existingList: UsableList,
	user?: UsableUser
): Promise<UsableList> {
	const newFields = fields && { ...existingList.fields, ...fields };
	const submittedAt = submitted === undefined ? undefined : submitted ? new Date() : null;
	const verified =
		setVerified === undefined || !user
			? undefined
			: setVerified
			? { create: { userHandle: user.handle } }
			: { delete: true };
	const list = (await prismaClient.list.update({
		where: { id },
		data: {
			...props,
			submittedAt,
			verified,
			fields: newFields,
			updatedAt: new Date(),
			ownedByHandle: owner,
		},
		select: listSelect,
	})) as unknown as IncompleteUsableList;

	return makeListUsable(list);
}

function listStatus(list: IncompleteUsableList | IncompleteMinimalList): ListStatus {
	if (list.verified) return 'verified';
	if (list.submittedAt) return 'submitted';
	return 'open';
}

function makeListMinimal(list: IncompleteMinimalList): MinimalList;
function makeListMinimal(list: IncompleteMinimalList | null): MinimalList | null;
function makeListMinimal(list: IncompleteMinimalList | null): MinimalList | null {
	if (!list) return null;
	return { ...list, status: listStatus(list) };
}

function makeListUsable(list: IncompleteUsableList): UsableList;
function makeListUsable(list: IncompleteUsableList | null): UsableList | null;
function makeListUsable(list: IncompleteUsableList | null): UsableList | null {
	if (!list) return null;
	if (!list.ownedBy) list.ownedBy = list.createdBy;
	return { ...list, status: listStatus(list) } as UsableList;
}

const listSelect: Prisma.ListSelect = {
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
	submittedAt: true,
	verified: { select: { verifiedAt: true, verifiedBy: true } },
	createdBy: { select: { handle: true, name: true, role: true } },
	ownedBy: { select: { handle: true, name: true, role: true } },
};
