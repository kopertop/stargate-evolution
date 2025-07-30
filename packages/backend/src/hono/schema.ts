import { z } from 'zod';

import packageJson from '../../package.json';

// Common schemas
const UserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	is_admin: z.boolean(),
	created_at: z.number(),
	updated_at: z.number().optional(),
});

const SavedGameSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	game_data: z.string(),
	created_at: z.number(),
	updated_at: z.number(),
});

const RoomSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	template_id: z.string().optional(),
	name: z.string(),
	type: z.string(),
	description: z.string().optional(),
	startX: z.number(),
	endX: z.number(),
	startY: z.number(),
	endY: z.number(),
	floor: z.number(),
	found: z.boolean(),
	locked: z.boolean(),
	explored: z.boolean(),
	created_at: z.number(),
	updated_at: z.number(),
});

const RoomTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional(),
	default_width: z.number(),
	default_height: z.number(),
	image: z.string().optional(),
	category: z.string().optional(),
	placement_requirements: z.string().optional(),
	compatible_layouts: z.string().optional(),
	tags: z.string().optional(),
	version: z.string(),
	is_active: z.boolean(),
	created_at: z.number(),
	updated_at: z.number(),
});

const DoorSchema = z.object({
	id: z.string(),
	from_room_id: z.string(),
	to_room_id: z.string(),
	x: z.number(),
	y: z.number(),
	state: z.string(),
	created_at: z.number(),
	updated_at: z.number(),
});

const FurnitureSchema = z.object({
	id: z.string(),
	template_id: z.string(),
	room_id: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	interactive: z.boolean(),
	blocks_movement: z.boolean(),
	state: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

const FurnitureTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	furniture_type: z.string(),
	description: z.string().optional(),
	category: z.string().optional(),
	default_width: z.number(),
	default_height: z.number(),
	default_interactive: z.boolean(),
	default_blocks_movement: z.boolean(),
	image: z.string().optional(),
	compatible_room_types: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

const CharacterTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	race: z.string().optional(),
	faction: z.string().optional(),
	image: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

const TechnologyTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	category: z.string().optional(),
	unlock_requirements: z.string().optional(),
	cost: z.number().optional(),
	image: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

const ApiKeySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	key_preview: z.string(),
	created_at: z.number(),
	last_used: z.number().optional(),
});

const ErrorResponseSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	details: z.record(z.any()).optional(),
});

const UploadFileSchema = z.object({
	key: z.string(),
	url: z.string(),
	filename: z.string(),
	size: z.number(),
	lastModified: z.string(),
	contentType: z.string().optional(),
	originalName: z.string().optional(),
});

// Generate OpenAPI 3.0 specification
export function generateOpenAPISchema() {
	return {
		openapi: '3.0.0',
		info: {
			title: 'Stargate Evolution API',
			version: packageJson.version,
			description: 'API for the Stargate Evolution game platform',
			contact: {
				name: 'API Support',
				url: 'https://github.com/stargate-evolution/api',
			},
		},
		servers: [
			{
				url: 'http://localhost:8787',
				description: 'Development server',
			},
			{
				url: 'https://api.stargate-evolution.com',
				description: 'Production server',
			},
		],
		components: {
			securitySchemes: {
				BearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT token or API key',
				},
			},
			schemas: {
				User: zodToJsonSchema(UserSchema),
				SavedGame: zodToJsonSchema(SavedGameSchema),
				Room: zodToJsonSchema(RoomSchema),
				RoomTemplate: zodToJsonSchema(RoomTemplateSchema),
				Door: zodToJsonSchema(DoorSchema),
				Furniture: zodToJsonSchema(FurnitureSchema),
				FurnitureTemplate: zodToJsonSchema(FurnitureTemplateSchema),
				CharacterTemplate: zodToJsonSchema(CharacterTemplateSchema),
				TechnologyTemplate: zodToJsonSchema(TechnologyTemplateSchema),
				ApiKey: zodToJsonSchema(ApiKeySchema),
				UploadFile: zodToJsonSchema(UploadFileSchema),
				ErrorResponse: zodToJsonSchema(ErrorResponseSchema),
				LoginRequest: zodToJsonSchema(z.object({
					email: z.string().email().optional(),
					password: z.string().optional(),
					googleToken: z.string().optional(),
				})),
				RegisterRequest: zodToJsonSchema(z.object({
					name: z.string(),
					email: z.string().email(),
					password: z.string(),
				})),
				CreateApiKeyRequest: zodToJsonSchema(z.object({
					name: z.string(),
					description: z.string().optional(),
				})),
				CreateSavedGameRequest: zodToJsonSchema(z.object({
					name: z.string(),
					description: z.string().optional(),
					game_data: z.string(),
				})),
				UpdateSavedGameRequest: zodToJsonSchema(z.object({
					name: z.string().optional(),
					description: z.string().optional(),
					game_data: z.string().optional(),
				})),
				CreateDoorRequest: zodToJsonSchema(z.object({
					id: z.string(),
					from_room_id: z.string(),
					to_room_id: z.string(),
					x: z.number(),
					y: z.number(),
					state: z.string(),
				})),
				SqlDebugRequest: zodToJsonSchema(z.object({
					query: z.string(),
					limit: z.number().optional(),
				})),
				UploadResponse: zodToJsonSchema(z.object({
					success: z.boolean(),
					url: z.string(),
					filename: z.string(),
					key: z.string(),
				})),
				UploadListResponse: zodToJsonSchema(z.object({
					success: z.boolean(),
					files: z.array(UploadFileSchema),
					total: z.number(),
					truncated: z.boolean(),
				})),
				SystemStatus: zodToJsonSchema(z.object({
					status: z.string(),
					version: z.string(),
					name: z.string(),
					timestamp: z.string(),
					environment: z.string(),
				})),
				SuccessResponse: zodToJsonSchema(z.object({
					success: z.boolean(),
					message: z.string().optional(),
				})),
			},
		},
		paths: {
			'/': {
				get: {
					summary: 'Root endpoint',
					responses: {
						'200': {
							description: 'Welcome message',
							content: {
								'text/plain': {
									schema: { type: 'string' },
								},
							},
						},
					},
				},
			},
			'/api/auth/login': {
				post: {
					summary: 'User login',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/LoginRequest' },
							},
						},
					},
					responses: {
						'200': {
							description: 'Successful login',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											token: { type: 'string' },
											user: { $ref: '#/components/schemas/User' },
										},
									},
								},
							},
						},
						'400': {
							description: 'Invalid credentials',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
			'/api/auth/register': {
				post: {
					summary: 'User registration',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RegisterRequest' },
							},
						},
					},
					responses: {
						'200': {
							description: 'Successful registration',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											token: { type: 'string' },
											user: { $ref: '#/components/schemas/User' },
										},
									},
								},
							},
						},
						'400': {
							description: 'Validation error',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
			'/api/auth/me': {
				get: {
					summary: 'Get current user',
					security: [{ BearerAuth: [] }],
					responses: {
						'200': {
							description: 'Current user information',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/User' },
								},
							},
						},
						'401': {
							description: 'Unauthorized',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
			'/api/auth/api-keys': {
				get: {
					summary: 'List API keys',
					security: [{ BearerAuth: [] }],
					responses: {
						'200': {
							description: 'List of API keys',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/ApiKey' },
									},
								},
							},
						},
					},
				},
				post: {
					summary: 'Create API key',
					security: [{ BearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/CreateApiKeyRequest' },
							},
						},
					},
					responses: {
						'200': {
							description: 'Created API key',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											key: { type: 'string' },
											name: { type: 'string' },
											description: { type: 'string' },
											created_at: { type: 'number' },
										},
									},
								},
							},
						},
					},
				},
			},
			'/api/auth/api-keys/{id}': {
				delete: {
					summary: 'Delete API key',
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
						},
					],
					responses: {
						'200': {
							description: 'Success',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SuccessResponse' },
								},
							},
						},
					},
				},
			},
			'/api/data/health': {
				get: {
					summary: 'Data service health check',
					responses: {
						'200': {
							description: 'Health status',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											ok: { type: 'boolean' },
											message: { type: 'string' },
										},
									},
								},
							},
						},
					},
				},
			},
			'/api/data/rooms': {
				get: {
					summary: 'Get all rooms',
					responses: {
						'200': {
							description: 'List of rooms',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/Room' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/room-templates': {
				get: {
					summary: 'Get all room templates',
					responses: {
						'200': {
							description: 'List of room templates',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/RoomTemplate' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/doors': {
				get: {
					summary: 'Get all doors',
					responses: {
						'200': {
							description: 'List of doors',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/Door' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/doors/room/{id}': {
				get: {
					summary: 'Get doors for a room',
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
						},
					],
					responses: {
						'200': {
							description: 'List of doors for the room',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/Door' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/furniture': {
				get: {
					summary: 'Get all furniture',
					responses: {
						'200': {
							description: 'List of furniture',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/Furniture' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/furniture-templates': {
				get: {
					summary: 'Get all furniture templates',
					responses: {
						'200': {
							description: 'List of furniture templates',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/FurnitureTemplate' },
									},
								},
							},
						},
					},
				},
				post: {
					summary: 'Create furniture template',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/FurnitureTemplate' },
							},
						},
					},
					responses: {
						'201': {
							description: 'Created furniture template',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/FurnitureTemplate' },
								},
							},
						},
					},
				},
			},
			'/api/data/characters': {
				get: {
					summary: 'Get all character templates',
					responses: {
						'200': {
							description: 'List of character templates',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/CharacterTemplate' },
									},
								},
							},
						},
					},
				},
			},
			'/api/data/technologies': {
				get: {
					summary: 'Get all technology templates',
					responses: {
						'200': {
							description: 'List of technology templates',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/TechnologyTemplate' },
									},
								},
							},
						},
					},
				},
			},
			'/api/games': {
				get: {
					summary: 'Get saved games',
					security: [{ BearerAuth: [] }],
					responses: {
						'200': {
							description: 'List of saved games',
							content: {
								'application/json': {
									schema: {
										type: 'array',
										items: { $ref: '#/components/schemas/SavedGame' },
									},
								},
							},
						},
					},
				},
				post: {
					summary: 'Create saved game',
					security: [{ BearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/CreateSavedGameRequest' },
							},
						},
					},
					responses: {
						'201': {
							description: 'Created saved game',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SavedGame' },
								},
							},
						},
					},
				},
			},
			'/api/games/{id}': {
				get: {
					summary: 'Get saved game',
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
						},
					],
					responses: {
						'200': {
							description: 'Saved game details',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SavedGame' },
								},
							},
						},
						'404': {
							description: 'Game not found',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
				put: {
					summary: 'Update saved game',
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
						},
					],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/UpdateSavedGameRequest' },
							},
						},
					},
					responses: {
						'200': {
							description: 'Updated saved game',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SavedGame' },
								},
							},
						},
					},
				},
				delete: {
					summary: 'Delete saved game',
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: 'id',
							in: 'path',
							required: true,
							schema: { type: 'string' },
						},
					],
					responses: {
						'200': {
							description: 'Success',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SuccessResponse' },
								},
							},
						},
					},
				},
			},
			'/api/upload/image': {
				post: {
					summary: 'Upload image',
					security: [{ BearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'multipart/form-data': {
								schema: {
									type: 'object',
									properties: {
										file: {
											type: 'string',
											format: 'binary',
											description: 'Image file to upload',
										},
										folder: {
											type: 'string',
											description: 'Target folder (optional)',
										},
										bucket: {
											type: 'string',
											description: 'Target bucket (optional)',
										},
									},
									required: ['file'],
								},
							},
						},
					},
					responses: {
						'200': {
							description: 'Upload successful',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/UploadResponse' },
								},
							},
						},
						'400': {
							description: 'Upload failed',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/ErrorResponse' },
								},
							},
						},
					},
				},
			},
			'/api/upload/files': {
				get: {
					summary: 'List uploaded files',
					security: [{ BearerAuth: [] }],
					parameters: [
						{
							name: 'folder',
							in: 'query',
							schema: { type: 'string' },
							description: 'Filter by folder',
						},
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', maximum: 1000, default: 100 },
							description: 'Maximum number of results',
						},
					],
					responses: {
						'200': {
							description: 'List of uploaded files',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/UploadListResponse' },
								},
							},
						},
					},
				},
			},
			'/api/status': {
				get: {
					summary: 'System status',
					responses: {
						'200': {
							description: 'System status information',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/SystemStatus' },
								},
							},
						},
					},
				},
			},
		},
		tags: [
			{
				name: 'Authentication',
				description: 'User authentication and API key management',
			},
			{
				name: 'Data',
				description: 'Game data and templates',
			},
			{
				name: 'Games',
				description: 'Saved game management',
			},
			{
				name: 'Upload',
				description: 'File upload operations',
			},
			{
				name: 'System',
				description: 'System status and health checks',
			},
		],
	};
}

// Helper function to convert Zod schema to JSON Schema
function zodToJsonSchema(schema: z.ZodType<any>): any {
	// This is a simplified conversion - in production, use a library like zod-to-json-schema
	if (schema instanceof z.ZodString) {
		const result: any = { type: 'string' };
		if (schema._def.checks) {
			for (const check of schema._def.checks) {
				if (check.kind === 'email') {
					result.format = 'email';
				}
			}
		}
		return result;
	}
  
	if (schema instanceof z.ZodNumber) {
		return { type: 'number' };
	}
  
	if (schema instanceof z.ZodBoolean) {
		return { type: 'boolean' };
	}
  
	if (schema instanceof z.ZodOptional) {
		return zodToJsonSchema(schema._def.innerType);
	}
  
	if (schema instanceof z.ZodObject) {
		const properties: any = {};
		const required: string[] = [];
    
		for (const [key, value] of Object.entries(schema.shape)) {
			properties[key] = zodToJsonSchema(value as z.ZodType<any>);
			if (!(value instanceof z.ZodOptional)) {
				required.push(key);
			}
		}
    
		return {
			type: 'object',
			properties,
			required: required.length > 0 ? required : undefined,
		};
	}
  
	if (schema instanceof z.ZodArray) {
		return {
			type: 'array',
			items: zodToJsonSchema(schema._def.type),
		};
	}
  
	if (schema instanceof z.ZodRecord) {
		return {
			type: 'object',
			additionalProperties: zodToJsonSchema(schema._def.valueType),
		};
	}
  
	// Default fallback
	return { type: 'object' };
}