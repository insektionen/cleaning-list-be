import { phoneNumberRegex } from '../../utils/regex';
import validateDate from '../../utils/validateDate';
import { MinimalUser } from '../user/user.model';

export type MinimalList = {
	id: number;
	type: string;
	version: string;
	eventDate: string | null;
	submitted: boolean;
	verified: boolean;
};

export type UsableList = {
	id: number;
	type: string;
	version: string;
	structure: Structure;
	fields: Record<string, boolean>;
	colors: Record<string, string> | null;
	responsible: string | null;
	phoneNumber: string | null;
	eventDate: string | null;
	comment: string | null;
	submitted: boolean;
	verified: boolean;
	createdBy: MinimalUser;
	ownedBy: MinimalUser;
};

export type MissingOwnerList = Omit<UsableList, 'ownedBy'> & { ownedBy: MinimalUser | null };

export type Structure = {
	name: string;
	categories: { name: string; checks: string[] }[];
	comment?: string;
}[];

export type CreateListProps = {
	type: string;
	version: string;
	structure: Structure;
	colors?: Record<string, string>;
};

export type UpdateListProps = {
	fields?: Record<string, boolean>;
	responsible?: string;
	phoneNumber?: string;
	eventDate?: string;
	comment?: string | null;
	submitted?: boolean;
	verified?: boolean;
	owner?: string;
};

export function isCreateListProps(props: any): props is CreateListProps {
	const listProps = props as CreateListProps;
	return (
		typeof listProps === 'object' &&
		typeof listProps.type === 'string' &&
		typeof listProps.version === 'string' &&
		isStructure(listProps.structure) &&
		['object', 'undefined'].includes(typeof listProps.colors) &&
		Object.values(listProps.colors ?? {}).every((color) => typeof color === 'string')
	);
}

export function isUpdateListProps(props: any): props is UpdateListProps {
	const listProps = props as UpdateListProps;
	return !!(
		typeof listProps === 'object' &&
		['object', 'undefined'].includes(typeof listProps.fields) &&
		Object.values(listProps.fields ?? {}).every((value) => typeof value === 'boolean') &&
		['string', 'undefined'].includes(typeof listProps.responsible) &&
		(typeof listProps.phoneNumber === 'undefined' ||
			listProps.phoneNumber?.match(phoneNumberRegex)) &&
		(listProps.eventDate === undefined || validateDate(listProps.eventDate)) &&
		(['string', 'undefined'].includes(typeof listProps.comment) || listProps.comment === null) &&
		['boolean', 'undefined'].includes(typeof listProps.submitted) &&
		['boolean', 'undefined'].includes(typeof listProps.verified) &&
		['string', 'undefined'].includes(typeof listProps.owner)
	);
}

export function isStructure(props: any): props is Structure {
	const structureProps = props as Structure;
	return (
		Array.isArray(structureProps) &&
		structureProps.every(
			({ name, categories, comment }) =>
				typeof name === 'string' &&
				['string', 'undefined'].includes(typeof comment) &&
				Array.isArray(categories) &&
				categories.every(
					({ name: catName, checks }) =>
						typeof catName === 'string' &&
						Array.isArray(checks) &&
						checks.every((check) => typeof check === 'string')
				)
		)
	);
}
