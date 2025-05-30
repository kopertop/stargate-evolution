export type NullToUndefined<T> = T extends null
        ? undefined
        : T extends (infer U)[]
                ? NullToUndefined<U>[]
                : T extends Record<string, unknown>
                        ? { [K in keyof T]: NullToUndefined<T[K]> }
                        : T;

export function nullToUndefined<T>(obj: T): NullToUndefined<T> {
	if (Array.isArray(obj)) {
		return obj.map((v) => nullToUndefined(v)) as unknown as NullToUndefined<T>;
	}
	if (obj && typeof obj === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			if (value === null) result[key] = undefined;
			else result[key] = nullToUndefined(value);
		}
		return result as NullToUndefined<T>;
	}
	return obj as NullToUndefined<T>;
}
