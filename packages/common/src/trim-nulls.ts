export function trimNullStrings<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map(trimNullStrings) as any;
	}
	if (obj && typeof obj === 'object') {
		const out: any = {};
		for (const [k, v] of Object.entries(obj)) {
			if (v === null) out[k] = '';
			else out[k] = trimNullStrings(v);
		}
		return out;
	}
	return obj;
}
