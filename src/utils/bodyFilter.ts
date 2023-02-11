type FilteredBody = Record<string, any>;

export default function bodyFilter(body: any, allowedKyes: string[]): FilteredBody | null {
	if (typeof body !== 'object') return null;

	const filteredBody: FilteredBody = {};
	for (const key in body) {
		if (!allowedKyes.includes(key)) continue;
		filteredBody[key] = body[key];
	}
	return filteredBody;
}
