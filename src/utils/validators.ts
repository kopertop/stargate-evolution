import { z } from 'zod';

/**
 * Validates that a value is present (not null or undefined)
 * @param value The value to validate
 * @param errorMessage The error message to throw if validation fails
 */
export function validateExists<T>(value: T | null | undefined, errorMessage: string): T {
	if (value === null || value === undefined) {
		throw new Error(errorMessage);
	}
	return value;
}

/**
 * Validates an input against a Zod schema
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns The validated data
 */
export function validateWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
		}
		throw error;
	}
}
