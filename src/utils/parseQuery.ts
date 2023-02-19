import { Request } from 'express';

export function getQueryField<T = string>(
	req: Request,
	field: string,
	parser?: (param: string) => T
): T | undefined {
	const param = req.query[field];
	if (!param) return undefined;

	let value = param;
	if (Array.isArray(param)) value = param[0];

	if (!parser) return value as T;

	return parser(value as string);
}
