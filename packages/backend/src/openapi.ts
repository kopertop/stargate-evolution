import type { OpenAPIV3_1 } from 'openapi-types';

export const openApiSpec: OpenAPIV3_1.Document = {
	openapi: '3.1.0',
	info: {
		title: 'Stargate Evolution API',
		description: 'API for the Stargate Evolution game, providing access to ship layouts, room templates, technology, crew management, and admin functions for building and managing the Destiny ship.',
		version: '1.0.0',
		contact: {
			name: 'Stargate Evolution API',
			url: 'https://github.com/your-repo/stargate-evolution',
		},
		license: {
			name: 'MIT',
			url: 'https://opensource.org/licenses/MIT',
		},
	},
	servers: [
		{
			url: 'http://localhost:8787',
			description: 'Local development server',
		},
		{
			url: 'https://your-production-domain.com',
			description: 'Production server',
		},
	],
	security: [
		{ BearerAuth: [] },
		{}, // Allow no auth for public endpoints
	],
	paths: {
		// Authentication Endpoints
		'/api/auth/google': {
			post: {
				tags: ['Authentication'],
				summary: 'Authenticate with Google ID token',
				description: 'Exchange Google ID token for JWT access token. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['idToken'],
								properties: {
									idToken: {
										type: 'string',
										description: 'Google ID token from client',
									},
								},
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Authentication successful',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/AuthResponse' },
							},
						},
					},
					'400': {
						description: 'Authentication failed',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
				},
			},
		},
		'/api/auth/validate': {
			post: {
				tags: ['Authentication'],
				summary: 'Validate JWT token',
				description: 'Validate existing JWT token and get current user info. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['token'],
								properties: {
									token: {
										type: 'string',
										description: 'JWT token to validate',
									},
								},
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'Token is valid',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										valid: { type: 'boolean', example: true },
										user: { $ref: '#/components/schemas/User' },
									},
								},
							},
						},
					},
					'401': {
						description: 'Token is invalid',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										valid: { type: 'boolean', example: false },
									},
								},
							},
						},
					},
				},
			},
		},

		// Template Endpoints (Public - NO AUTHENTICATION REQUIRED)
		'/api/data/rooms': {
			get: {
				tags: ['Templates'],
				summary: 'Get all room templates',
				description: 'Retrieve all available room templates with coordinate positioning. **NO AUTHENTICATION REQUIRED** - Perfect for Swift clients',
				security: [], // No auth required
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
		'/api/data/technology': {
			get: {
				tags: ['Templates'],
				summary: 'Get all technology templates',
				description: 'Retrieve all available technology templates. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
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
		'/api/data/ship-layouts': {
			get: {
				tags: ['Templates'],
				summary: 'Get all ship layout IDs',
				description: 'Retrieve available ship layout identifiers. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
				responses: {
					'200': {
						description: 'List of ship layout IDs',
						content: {
							'application/json': {
								schema: {
									type: 'array',
									items: { type: 'string' },
									example: ['destiny', 'atlantis'],
								},
							},
						},
					},
				},
			},
		},
		'/api/data/doors': {
			get: {
				tags: ['Templates'],
				summary: 'Get all door templates',
				description: 'Retrieve all available door templates for ship layouts. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
				responses: {
					'200': {
						description: 'List of door templates',
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

		// Well-known OpenAPI endpoint
		'/.well-known/openapi.json': {
			get: {
				tags: ['Meta'],
				summary: 'Get OpenAPI specification',
				description: 'Retrieve the complete OpenAPI specification in JSON format. **NO AUTHENTICATION REQUIRED**',
				security: [], // No auth required
				responses: {
					'200': {
						description: 'OpenAPI specification',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									description: 'OpenAPI 3.1.0 specification document',
								},
							},
						},
					},
				},
			},
		},

		// Admin Endpoints (Require Authentication)
		'/api/admin/users': {
			get: {
				tags: ['Admin - Users'],
				summary: 'Get all users',
				description: 'Retrieve all registered users. **REQUIRES ADMIN AUTHENTICATION**',
				responses: {
					'200': {
						description: 'List of users',
						content: {
							'application/json': {
								schema: {
									type: 'array',
									items: { $ref: '#/components/schemas/User' },
								},
							},
						},
					},
					'401': {
						description: 'Unauthorized - Admin access required',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
				},
			},
		},
		'/api/admin/rooms': {
			post: {
				tags: ['Admin - Rooms'],
				summary: 'Create room template',
				description: 'Create a new room template with coordinate positioning. **REQUIRES ADMIN AUTHENTICATION**',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/RoomTemplateInput' },
						},
					},
				},
				responses: {
					'200': {
						description: 'Room created successfully',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										success: { type: 'boolean', example: true },
										id: { type: 'string', description: 'Created room ID' },
									},
								},
							},
						},
					},
					'400': {
						description: 'Bad request',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
					'401': {
						description: 'Unauthorized - Admin access required',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
				},
			},
		},

		// Furniture Endpoints
		'/api/rooms/{roomId}/furniture': {
			get: {
				tags: ['Furniture'],
				summary: 'Get furniture for a room',
				description: 'Retrieve all furniture items in a specific room. **NO AUTHENTICATION REQUIRED** - Perfect for Swift clients',
				security: [], // No auth required
				parameters: [
					{
						name: 'roomId',
						in: 'path',
						required: true,
						description: 'Unique room identifier',
						schema: {
							type: 'string',
							example: 'gate_room',
						},
					},
				],
				responses: {
					'200': {
						description: 'List of furniture in the room',
						content: {
							'application/json': {
								schema: {
									type: 'array',
									items: { $ref: '#/components/schemas/RoomFurniture' },
								},
							},
						},
					},
					'500': {
						description: 'Internal server error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
				},
			},
		},
		'/api/admin/furniture/{furnitureId}': {
			get: {
				tags: ['Admin - Furniture'],
				summary: 'Get furniture by ID',
				description: 'Retrieve a specific furniture item by its ID. **REQUIRES ADMIN AUTHENTICATION**',
				parameters: [
					{
						name: 'furnitureId',
						in: 'path',
						required: true,
						description: 'Unique furniture identifier',
						schema: {
							type: 'string',
							example: 'stargate_01',
						},
					},
				],
				responses: {
					'200': {
						description: 'Furniture item details',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RoomFurniture' },
							},
						},
					},
					'404': {
						description: 'Furniture not found',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
					'401': {
						description: 'Unauthorized - Admin access required',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
					'500': {
						description: 'Internal server error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ErrorResponse' },
							},
						},
					},
				},
			},
		},
	},
	components: {
		securitySchemes: {
			BearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
			},
		},
		schemas: {
			User: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Unique user identifier' },
					email: { type: 'string', format: 'email' },
					name: { type: 'string' },
					picture: { type: ['string', 'null'], format: 'uri' },
					is_admin: { type: 'boolean', default: false },
				},
			},
			AuthResponse: {
				type: 'object',
				properties: {
					token: { type: 'string', description: 'JWT access token' },
					refreshToken: { type: 'string', description: 'JWT refresh token' },
					user: { $ref: '#/components/schemas/User' },
					expiresAt: { type: 'number', description: 'Token expiration timestamp' },
				},
			},
			RoomTemplate: {
				type: 'object',
				description: 'Room template with Swift SpriteKit coordinate system (0,0 at center)',
				properties: {
					id: { type: 'string', description: 'Unique room identifier' },
					template_id: { type: ['string', 'null'] },
					layout_id: {
						type: 'string',
						description: 'Ship layout this room belongs to',
						example: 'destiny',
					},
					type: {
						type: 'string',
						description: 'Room type',
						example: 'gate_room',
					},
					name: { type: 'string', example: 'Gate Room' },
					description: { type: ['string', 'null'] },
					startX: {
						type: 'number',
						description: 'Left edge X coordinate (SpriteKit system)',
						example: -128,
					},
					endX: {
						type: 'number',
						description: 'Right edge X coordinate (SpriteKit system)',
						example: 128,
					},
					startY: {
						type: 'number',
						description: 'Bottom edge Y coordinate (SpriteKit system)',
						example: -64,
					},
					endY: {
						type: 'number',
						description: 'Top edge Y coordinate (SpriteKit system)',
						example: 64,
					},
					floor: { type: 'integer', description: 'Floor number', example: 0 },
					width: {
						type: 'number',
						description: 'Calculated room width (endX - startX)',
						example: 256,
					},
					height: {
						type: 'number',
						description: 'Calculated room height (endY - startY)',
						example: 128,
					},
					found: { type: 'boolean', default: false },
					locked: { type: 'boolean', default: false },
					explored: { type: 'boolean', default: false },
					image: { type: ['string', 'null'] },
					base_exploration_time: { type: ['number', 'null'], default: 2 },
					status: {
						type: ['string', 'null'],
						enum: ['ok', 'damaged', 'destroyed', 'unknown'],
						default: 'ok',
					},
					created_at: { type: 'number', description: 'Creation timestamp' },
					updated_at: { type: 'number', description: 'Last update timestamp' },
				},
			},
			RoomTemplateInput: {
				type: 'object',
				required: ['id', 'name', 'layout_id', 'type', 'startX', 'endX', 'startY', 'endY', 'floor'],
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					layout_id: { type: 'string' },
					type: { type: 'string' },
					description: { type: 'string' },
					startX: { type: 'number', description: 'Left edge X coordinate (SpriteKit system)' },
					endX: { type: 'number', description: 'Right edge X coordinate (SpriteKit system)' },
					startY: { type: 'number', description: 'Bottom edge Y coordinate (SpriteKit system)' },
					endY: { type: 'number', description: 'Top edge Y coordinate (SpriteKit system)' },
					floor: { type: 'integer' },
					found: { type: 'boolean', default: false },
					locked: { type: 'boolean', default: false },
					explored: { type: 'boolean', default: false },
					image: { type: 'string' },
					base_exploration_time: { type: 'number', default: 2 },
					status: {
						type: 'string',
						enum: ['ok', 'damaged', 'destroyed', 'unknown'],
						default: 'ok',
					},
				},
			},
			Door: {
				type: 'object',
				description: 'Door template connecting two rooms',
				properties: {
					id: { type: 'string', description: 'Unique door identifier' },
					layout_id: {
						type: 'string',
						description: 'Ship layout this door belongs to',
						example: 'destiny',
					},
					from_room_id: {
						type: 'string',
						description: 'The ID of the first room this door connects to.',
					},
					to_room_id: {
						type: 'string',
						description: 'The ID of the second room this door connects to.',
					},
					x: {
						type: 'number',
						description: 'X coordinate on the ship map',
					},
					y: {
						type: 'number',
						description: 'Y coordinate on the ship map',
					},
					created_at: { type: 'number', description: 'Creation timestamp' },
					updated_at: { type: 'number', description: 'Last update timestamp' },
				},
				required: ['id', 'layout_id', 'from_room_id', 'to_room_id', 'x', 'y', 'created_at', 'updated_at'],
			},
			TechnologyTemplate: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					description: { type: 'string' },
					category: { type: ['string', 'null'] },
					unlock_requirements: { type: ['string', 'null'] },
					cost: { type: ['number', 'null'] },
					image: { type: ['string', 'null'] },
					created_at: { type: 'number' },
					updated_at: { type: 'number' },
				},
			},
			SuccessResponse: {
				type: 'object',
				properties: {
					success: { type: 'boolean', example: true },
				},
			},
			ErrorResponse: {
				type: 'object',
				properties: {
					error: { type: 'string', description: 'Error message' },
				},
			},
			RoomFurniture: {
				type: 'object',
				description: 'Furniture item with room-relative positioning (0,0 at room center)',
				properties: {
					id: { type: 'string', description: 'Unique furniture identifier' },
					room_id: { type: 'string', description: 'Room identifier this furniture belongs to' },
					furniture_type: {
						type: 'string',
						description: 'Type of furniture',
						enum: ['stargate', 'console', 'bed', 'table', 'chair', 'storage', 'workstation', 'stargate_dialer'],
						example: 'console',
					},
					name: { type: 'string', description: 'Furniture name', example: 'Main Console' },
					description: { type: ['string', 'null'], description: 'Furniture description' },

					// Positioning (room-relative)
					x: { type: 'number', description: 'X offset from room center', example: -32 },
					y: { type: 'number', description: 'Y offset from room center', example: 0 },
					z: { type: 'number', description: 'Z-index for layering', default: 1, example: 1 },
					width: { type: 'number', description: 'Furniture width in pixels', default: 32, example: 64 },
					height: { type: 'number', description: 'Furniture height in pixels', default: 32, example: 64 },
					rotation: { type: 'number', description: 'Rotation in degrees', default: 0, example: 0 },

					// Visual properties
					image: { type: ['string', 'null'], description: 'Image asset path for rendering' },
					color: { type: ['string', 'null'], description: 'Hex color code for tinting', example: '#FF0000' },
					style: { type: ['string', 'null'], description: 'Style variant', enum: ['ancient', 'modern', 'damaged'] },

					// Functional properties
					interactive: { type: 'boolean', description: 'Can player interact with this furniture?', default: false },
					blocks_movement: { type: 'boolean', description: 'Does this furniture block player movement?', default: false },
					requirements: { type: ['string', 'null'], description: 'JSON string of requirements to use this furniture' },
					power_required: { type: 'number', description: 'Power needed to operate', default: 0 },

					// State
					active: { type: 'boolean', description: 'Is this furniture currently active/functional?', default: true },
					discovered: { type: 'boolean', description: 'Has the player discovered this furniture?', default: false },

					created_at: { type: 'number', description: 'Creation timestamp' },
					updated_at: { type: 'number', description: 'Last update timestamp' },
				},
				required: ['id', 'room_id', 'furniture_type', 'name', 'x', 'y', 'created_at', 'updated_at'],
			},
		},
	},
	tags: [
		{
			name: 'Authentication',
			description: 'User authentication and token management (NO AUTH REQUIRED)',
		},
		{
			name: 'Templates',
			description: 'Public template data - rooms, technology, layouts (NO AUTH REQUIRED - Perfect for Swift clients)',
		},
		{
			name: 'Admin - Users',
			description: 'User management (REQUIRES ADMIN AUTH)',
		},
		{
			name: 'Admin - Rooms',
			description: 'Room template management (REQUIRES ADMIN AUTH)',
		},
		{
			name: 'Meta',
			description: 'API metadata and documentation (NO AUTH REQUIRED)',
		},
		{
			name: 'Furniture',
			description: 'Furniture management (NO AUTH REQUIRED - Perfect for Swift clients)',
		},
		{
			name: 'Admin - Furniture',
			description: 'Furniture management (REQUIRES ADMIN AUTH)',
		},
	],
};
