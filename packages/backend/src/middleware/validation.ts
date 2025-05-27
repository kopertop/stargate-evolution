import { z } from 'zod';

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export class ApiValidationError extends Error {
	public readonly errors: ValidationError[];
	public readonly statusCode: number;

	constructor(errors: ValidationError[], statusCode: number = 400) {
		super('Validation failed');
		this.errors = errors;
		this.statusCode = statusCode;
		this.name = 'ApiValidationError';
	}
}

/**
 * Convert Zod errors to our API error format
 */
export function formatZodErrors(error: z.ZodError): ValidationError[] {
	return error.errors.map((err) => ({
		field: err.path.join('.'),
		message: err.message,
		code: err.code,
	}));
}

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(data: T, success: boolean = true): {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: number;
} {
	return {
		success,
		data: success ? data : undefined,
		error: success ? undefined : (data as any)?.message || 'Unknown error',
		timestamp: Date.now(),
	};
}

/**
 * Create an error response
 */
export function createErrorResponse(
	message: string,
	errors?: ValidationError[],
	statusCode: number = 400,
): Response {
	const response = {
		success: false,
		error: message,
		errors,
		timestamp: Date.now(),
	};

	return new Response(JSON.stringify(response), {
		status: statusCode,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
	request: Request,
	schema: z.ZodSchema<T>,
): Promise<T> {
	try {
		const body = await request.json();
		return schema.parse(body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ApiValidationError(formatZodErrors(error));
		}
		throw new ApiValidationError([
			{
				field: 'body',
				message: 'Invalid JSON in request body',
				code: 'invalid_json',
			},
		]);
	}
}

/**
 * Validate response data with Zod schema
 */
export function validateResponseData<T>(data: unknown, schema: z.ZodSchema<T>): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error('Response validation failed:', formatZodErrors(error));
			throw new ApiValidationError(formatZodErrors(error), 500);
		}
		throw new ApiValidationError([
			{
				field: 'response',
				message: 'Internal server error: invalid response data',
				code: 'invalid_response',
			},
		], 500);
	}
}

/**
 * Validate URL parameters with Zod schema
 */
export function validateUrlParams<T>(
	params: Record<string, string>,
	schema: z.ZodSchema<T>,
): T {
	try {
		return schema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ApiValidationError(formatZodErrors(error));
		}
		throw new ApiValidationError([
			{
				field: 'params',
				message: 'Invalid URL parameters',
				code: 'invalid_params',
			},
		]);
	}
}

/**
 * Middleware wrapper for handling validation errors
 */
export function withValidation<T extends any[]>(
	handler: (...args: T) => Promise<Response>,
) {
	return async (...args: T): Promise<Response> => {
		try {
			return await handler(...args);
		} catch (error) {
			console.error('API Error:', error);

			if (error instanceof ApiValidationError) {
				return createErrorResponse(
					error.message,
					error.errors,
					error.statusCode,
				);
			}

			// Handle other types of errors
			return createErrorResponse(
				'Internal server error',
				undefined,
				500,
			);
		}
	};
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400',
};

/**
 * Add CORS headers to response
 */
export function withCors(response: Response): Response {
	Object.entries(corsHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	});
	return response;
}

/**
 * Create a validated API response with CORS
 */
export function createValidatedResponse<T>(
	data: T,
	schema: z.ZodSchema<T>,
	success: boolean = true,
): Response {
	try {
		const validatedData = validateResponseData(data, schema);
		const response = createApiResponse(validatedData, success);

		return withCors(new Response(JSON.stringify(response), {
			status: success ? 200 : 400,
			headers: {
				'Content-Type': 'application/json',
			},
		}));
	} catch (error) {
		if (error instanceof ApiValidationError) {
			return withCors(createErrorResponse(
				error.message,
				error.errors,
				error.statusCode,
			));
		}
		return withCors(createErrorResponse('Internal server error', undefined, 500));
	}
}
