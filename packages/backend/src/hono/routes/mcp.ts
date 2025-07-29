import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import { Context, Hono } from 'hono';
import { z } from 'zod';

import type { Env, User } from '../../types';
import { verifyAdminAccess } from '../middleware/auth';

function getServer(env: Env, user: User): McpServer {
	const server = new McpServer(
		{
			name: 'Stargate Evolution MCP',
			version: '1.0.0',
		},
		{
			capabilities: {
				logging: {},
				tools: {},
				resources: {},
				prompts: {},
			},
		},
	);

	// Register basic test tools

	// Simple greeting tool
	server.tool(
		'greet',
		'Greet a user with a friendly message',
		{},
		async () => {
			return {
				content: [
					{
						type: 'text',
						text: 'Hello! Welcome to Stargate Evolution! MCP server is working correctly.',
					},
				],
			};
		},
	);

	// Get game sessions tool
	server.tool(
		'get-game-sessions',
		'List active game sessions from the database',
		{},
		async () => {
			const sessionLimit = 10;
			try {
				const stmt = env.DB.prepare(`
					SELECT id, user_id, name, description, created_at, updated_at
					FROM saved_games
					ORDER BY updated_at DESC
					LIMIT ?
				`);

				const result = await stmt.bind(sessionLimit).all();

				if (!result.success) {
					throw new Error(`Database query failed: ${result.error}`);
				}

				const sessions = result.results.map((session: any) => ({
					id: session.id,
					userId: session.user_id,
					name: session.name,
					description: session.description,
					createdAt: new Date(session.created_at * 1000).toISOString(),
					updatedAt: new Date(session.updated_at * 1000).toISOString(),
				}));

				return {
					content: [
						{
							type: 'text',
							text: `Found ${sessions.length} game sessions:\n\n${sessions
								.map((s) => `**${s.name}** (${s.id})\n  User: ${s.userId}\n  Updated: ${s.updatedAt}`)
								.join('\n\n')}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error retrieving game sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Get game templates tool
	server.tool(
		'get-templates',
		'Query game templates by type (shows technology templates)',
		{},
		async () => {
			const templateType = 'technology';
			const templateLimit = 5;
			try {
				const tableMap: Record<string, string> = {
					character: 'character_templates',
					person: 'person_templates',
					room: 'room_templates',
					technology: 'technology_templates',
					galaxy: 'galaxy_templates',
					star_system: 'star_system_templates',
				};

				const tableName = tableMap[templateType];
				const stmt = env.DB.prepare(`SELECT id, name, description FROM ${tableName} ORDER BY name LIMIT ?`);
				const result = await stmt.bind(templateLimit).all();

				if (!result.success) {
					throw new Error(`Database query failed: ${result.error}`);
				}

				const templates = result.results.map((template: any) => ({
					id: template.id,
					name: template.name,
					description: template.description,
				}));

				return {
					content: [
						{
							type: 'text',
							text: `Found ${templates.length} ${templateType} templates:\n\n${templates
								.map((t) => `**${t.name}** (${t.id})\n  ${t.description || 'No description'}`)
								.join('\n\n')}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error retrieving ${templateType} templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// System status tool
	server.tool(
		'system-status',
		'Get system status and database health',
		{},
		async () => {
			try {
				// Test database connectivity
				const dbTest = await env.DB.prepare('SELECT 1 as test').first();
				const dbStatus = dbTest ? 'Connected' : 'Error';

				return {
					content: [
						{
							type: 'text',
							text: `**Stargate Evolution System Status**\n\nDatabase: ${dbStatus}\nServer: Running\nMCP Version: 1.0.0\nAuthenticated User: ${user.name} (${user.email})\nAdmin Access: ${user.is_admin ? 'Yes' : 'No'}\nTimestamp: ${new Date().toISOString()}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `System status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Admin-only tool to delete a game session
	server.tool(
		'delete-game-session',
		'Delete a game session from the database (Admin only - currently disabled for safety)',
		{},
		async () => {
			try {
				return {
					content: [
						{
							type: 'text',
							text: '❌ **Delete Function Disabled**\n\nFor safety, the delete game session function has been temporarily disabled. This prevents accidental data deletion during MCP testing.',
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error deleting session**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Content Creation Tools

	// Create technology template (simplified - create "Neural Interface" example)
	server.tool(
		'create-technology-template',
		'Create a new technology template (creates example: Neural Interface)',
		{},
		async () => {
			const name = 'Neural Interface';
			const description = 'Advanced neural interface technology allowing direct mental control of ship systems';
			const category = 'interface';
			const cost = 500;
			const unlock_requirements = 'Ancient Database';
			const image = null;
			try {
				const techId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
				const now = Math.floor(Date.now() / 1000);

				const stmt = env.DB.prepare(`
					INSERT INTO technology_templates (id, name, description, category, unlock_requirements, cost, image, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);

				const result = await stmt.bind(
					techId,
					name,
					description,
					category || null,
					unlock_requirements || null,
					cost || 0,
					image || null,
					now,
					now,
				).run();

				if (!result.success) {
					throw new Error(`Database insert failed: ${result.error}`);
				}

				return {
					content: [
						{
							type: 'text',
							text: `✅ **Technology Template Created**\n\n**${name}** (${techId})\n${description}\n\n${category ? `Category: ${category}\n` : ''}${cost ? `Cost: ${cost}\n` : ''}${unlock_requirements ? `Requirements: ${unlock_requirements}\n` : ''}Created successfully!`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error creating technology template**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Create furniture template (simplified - create "Command Chair" example)
	server.tool(
		'create-furniture-template',
		'Create a new furniture template (creates example: Command Chair)',
		{},
		async () => {
			const name = 'Command Chair';
			const furniture_type = 'chair';
			const description = 'Captain\'s command chair for ship bridge';
			const category = 'seating';
			const width = 64;
			const height = 64;
			const interactive: boolean = true;
			const blocks_movement: boolean = true;
			const compatible_rooms = 'bridge,command_center';
			try {
				const furnitureId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
				const now = Math.floor(Date.now() / 1000);

				const stmt = env.DB.prepare(`
					INSERT INTO furniture_templates (
						id, name, furniture_type, description, category,
						default_width, default_height, default_interactive, default_blocks_movement,
						compatible_room_types, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);

				const result = await stmt.bind(
					furnitureId,
					name,
					furniture_type,
					description || null,
					category || null,
					width || 32,
					height || 32,
					1, // interactive
					1, // blocks_movement
					compatible_rooms || null,
					now,
					now,
				).run();

				if (!result.success) {
					throw new Error(`Database insert failed: ${result.error}`);
				}

				return {
					content: [
						{
							type: 'text',
							text: `✅ **Furniture Template Created**\n\n**${name}** (${furnitureId})\nType: ${furniture_type}\n${description || 'No description'}\n\n${category ? `Category: ${category}\n` : ''}Size: ${width || 32}x${height || 32}\nInteractive: Yes\nBlocks Movement: Yes\n${compatible_rooms ? `Compatible Rooms: ${compatible_rooms}\n` : ''}Created successfully!`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error creating furniture template**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Create room template (simplified - create "Test Bridge" example)
	server.tool(
		'create-room-template',
		'Create a new room template (creates example: Test Bridge)',
		{},
		async () => {
			const name = 'Test Bridge';
			const type = 'bridge';
			const description = 'Main command bridge for the ship';
			const layout_id = 'destiny';
			const start_x = 50;
			const end_x = 150;
			const start_y = 50;
			const end_y = 100;
			const floor = 1;
			const exploration_time = 3;
			const image = null;
			try {
				const roomId = `${layout_id}_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
				const now = Math.floor(Date.now() / 1000);

				const stmt = env.DB.prepare(`
					INSERT INTO room_templates (
						id, layout_id, type, name, description, startX, endX, startY, endY, floor,
						base_exploration_time, image, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);

				const result = await stmt.bind(
					roomId,
					layout_id,
					type,
					name,
					description || null,
					start_x,
					end_x,
					start_y,
					end_y,
					floor,
					exploration_time || 2,
					image || null,
					now,
					now,
				).run();

				if (!result.success) {
					throw new Error(`Database insert failed: ${result.error}`);
				}

				return {
					content: [
						{
							type: 'text',
							text: `✅ **Room Template Created**\n\n**${name}** (${roomId})\nType: ${type}\n${description || 'No description'}\n\nLayout: ${layout_id}\nCoordinates: (${start_x},${start_y}) to (${end_x},${end_y})\nFloor: ${floor}\nExploration Time: ${exploration_time || 2} minutes\nCreated successfully!`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error creating room template**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// List all furniture templates
	server.tool(
		'list-furniture-templates',
		'List all furniture templates',
		{},
		async () => {
			const template_type = 'furniture';
			const search = null;
			const limit = 20;
			try {
				const searchLimit = limit || 20;
				const tableMap: Record<string, string> = {
					technology: 'technology_templates',
					furniture: 'furniture_templates',
					room: 'room_templates',
					character: 'character_templates',
					person: 'person_templates',
					galaxy: 'galaxy_templates',
					star_system: 'star_system_templates',
				};

				const tableName = tableMap[template_type];
				let query = `SELECT id, name, description FROM ${tableName}`;
				const params: any[] = [];

				if (search) {
					query += ' WHERE name LIKE ? OR description LIKE ?';
					const searchTerm = `%${search}%`;
					params.push(searchTerm, searchTerm);
				}

				query += ' ORDER BY name LIMIT ?';
				params.push(searchLimit);

				const stmt = env.DB.prepare(query);
				const result = await stmt.bind(...params).all();

				if (!result.success) {
					throw new Error(`Database query failed: ${result.error}`);
				}

				const templates = result.results.map((template: any) => ({
					id: template.id,
					name: template.name,
					description: template.description,
				}));

				const searchText = search ? ` matching "${search}"` : '';
				return {
					content: [
						{
							type: 'text',
							text: `Found ${templates.length} ${template_type} templates${searchText}:\n\n${templates
								.map((t) => `**${t.name}** (${t.id})\n  ${t.description || 'No description'}`)
								.join('\n\n')}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error listing ${template_type} templates**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Database Querying Tools

	// Raw SQL query tool (admin only, with safety restrictions)
	server.tool(
		'execute-sql-query',
		'Execute a raw SQL query on the database (admin only, read-only queries)',
		{
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The SQL query to execute (SELECT statements only for safety)',
				},
				limit: {
					type: 'number',
					description: 'Maximum number of rows to return (default: 50, max: 1000)',
					default: 50,
				},
			},
			required: ['query'],
		},
		async (args) => {
			const query = args.query as string;
			const limit = Math.min((args.limit as number) || 50, 1000);

			// Safety check: only allow SELECT statements
			const trimmedQuery = query.trim().toLowerCase();
			if (!trimmedQuery.startsWith('select')) {
				return {
					content: [
						{
							type: 'text',
							text: '❌ **Safety Error**: Only SELECT queries are allowed. Use other tools for data modification.',
						},
					],
				};
			}

			// Additional safety: block dangerous keywords
			const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate'];
			if (dangerousKeywords.some(keyword => trimmedQuery.includes(keyword))) {
				return {
					content: [
						{
							type: 'text',
							text: '❌ **Safety Error**: Query contains potentially dangerous keywords. Only read operations are allowed.',
						},
					],
				};
			}

			try {
				// Add LIMIT clause if not present
				let finalQuery = query;
				if (!trimmedQuery.includes('limit')) {
					finalQuery += ` LIMIT ${limit}`;
				}

				const stmt = env.DB.prepare(finalQuery);
				const result = await stmt.all();

				if (!result.success) {
					throw new Error(`Query failed: ${result.error}`);
				}

				const rows = result.results || [];
				const rowCount = rows.length;

				// Format results as a table
				if (rowCount === 0) {
					return {
						content: [
							{
								type: 'text',
								text: '📊 **Query Result**: No rows returned',
							},
						],
					};
				}

				// Get column names from first row
				const columns = Object.keys(rows[0]);
				const maxWidth = 50; // Max column width for display

				// Create header
				const header = columns.map(col => col.padEnd(Math.min(col.length + 2, maxWidth))).join('|');
				const separator = columns.map(col => '-'.repeat(Math.min(col.length + 2, maxWidth))).join('|');

				// Create rows
				const dataRows = rows.slice(0, limit).map(row =>
					columns.map(col => {
						const value = String(row[col] || '');
						return value.length > maxWidth - 2
							? value.substring(0, maxWidth - 5) + '...'
							: value.padEnd(Math.min(col.length + 2, maxWidth));
					}).join('|'),
				);

				const table = [header, separator, ...dataRows].join('\n');

				return {
					content: [
						{
							type: 'text',
							text: `📊 **Query Result** (${rowCount} rows):\n\n\`\`\`\n${table}\n\`\`\`\n\n**Query**: \`${query}\``,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Query Error**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// List all rooms tool
	server.tool(
		'list-all-rooms',
		'List all rooms in the database with their floor assignments',
		{
			type: 'object',
			properties: {
				layout_id: {
					type: 'string',
					description: 'Filter by layout ID (optional)',
					default: 'destiny',
				},
				floor: {
					type: 'number',
					description: 'Filter by floor number (optional)',
				},
			},
		},
		async (args) => {
			try {
				const layoutId = (args.layout_id as string) || 'destiny';
				const floor = args.floor as number;

				let query = `
					SELECT id, name, type, floor, startX, endX, startY, endY, layout_id, description
					FROM room_templates
					WHERE layout_id = ?
				`;
				const params: any[] = [layoutId];

				if (floor !== undefined) {
					query += ' AND floor = ?';
					params.push(floor);
				}

				query += ' ORDER BY floor, name';

				const stmt = env.DB.prepare(query);
				const result = await stmt.bind(...params).all();

				if (!result.success) {
					throw new Error(`Database query failed: ${result.error}`);
				}

				const rooms = result.results || [];
				const roomsByFloor = rooms.reduce((acc: any, room: any) => {
					const floorNum = room.floor || 0;
					if (!acc[floorNum]) acc[floorNum] = [];
					acc[floorNum].push(room);
					return acc;
				}, {});

				const floorSummary = Object.keys(roomsByFloor)
					.sort((a, b) => Number(a) - Number(b))
					.map(floorNum => {
						const floorRooms = roomsByFloor[floorNum];
						const roomList = floorRooms
							.map((r: any) => `  - **${r.name}** (${r.id}) [${r.type}] (${r.startX},${r.startY})→(${r.endX},${r.endY})`)
							.join('\n');
						return `**Floor ${floorNum}** (${floorRooms.length} rooms):\n${roomList}`;
					})
					.join('\n\n');

				const filterText = floor !== undefined ? ` on floor ${floor}` : '';
				return {
					content: [
						{
							type: 'text',
							text: `🏢 **Rooms in ${layoutId}${filterText}** (${rooms.length} total):\n\n${floorSummary}`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error listing rooms**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// List all doors tool
	server.tool(
		'list-all-doors',
		'List all doors in the database with their room connections and floor information',
		{
			type: 'object',
			properties: {
				layout_id: {
					type: 'string',
					description: 'Filter by layout ID (optional)',
					default: 'destiny',
				},
				floor: {
					type: 'number',
					description: 'Show doors connecting to a specific floor (optional)',
				},
			},
		},
		async (args) => {
			try {
				const layoutId = (args.layout_id as string) || 'destiny';
				const floor = args.floor as number;

				let query = `
					SELECT
						d.id,
						d.from_room_id,
						d.to_room_id,
						d.x,
						d.y,
						d.state,
						r1.name as from_room_name,
						r1.floor as from_floor,
						r2.name as to_room_name,
						r2.floor as to_floor
					FROM doors d
					LEFT JOIN room_templates r1 ON d.from_room_id = r1.id
					LEFT JOIN room_templates r2 ON d.to_room_id = r2.id
					WHERE (r1.layout_id = ? OR r2.layout_id = ?)
				`;
				const params: any[] = [layoutId, layoutId];

				if (floor !== undefined) {
					query += ' AND (r1.floor = ? OR r2.floor = ?)';
					params.push(floor, floor);
				}

				query += ' ORDER BY d.id';

				const stmt = env.DB.prepare(query);
				const result = await stmt.bind(...params).all();

				if (!result.success) {
					throw new Error(`Database query failed: ${result.error}`);
				}

				const doors = result.results || [];

				if (doors.length === 0) {
					const filterText = floor !== undefined ? ` connecting to floor ${floor}` : '';
					return {
						content: [
							{
								type: 'text',
								text: `🚪 **No doors found** in ${layoutId}${filterText}`,
							},
						],
					};
				}

				// Group doors by floor connections
				const sameFloorDoors = doors.filter((d: any) => d.from_floor === d.to_floor);
				const interFloorDoors = doors.filter((d: any) => d.from_floor !== d.to_floor);

				let output = `🚪 **Doors in ${layoutId}** (${doors.length} total):\n\n`;

				if (sameFloorDoors.length > 0) {
					const byFloor = sameFloorDoors.reduce((acc: any, door: any) => {
						const floorNum = door.from_floor || 0;
						if (!acc[floorNum]) acc[floorNum] = [];
						acc[floorNum].push(door);
						return acc;
					}, {});

					output += '**Same-Floor Doors:**\n';
					Object.keys(byFloor)
						.sort((a, b) => Number(a) - Number(b))
						.forEach(floorNum => {
							const floorDoors = byFloor[floorNum];
							output += `  Floor ${floorNum} (${floorDoors.length} doors):\n`;
							floorDoors.forEach((d: any) => {
								output += `    - **${d.id}**: ${d.from_room_name || d.from_room_id} ↔ ${d.to_room_name || d.to_room_id} (${d.x},${d.y}) [${d.state}]\n`;
							});
						});
					output += '\n';
				}

				if (interFloorDoors.length > 0) {
					output += `**Inter-Floor Doors (${interFloorDoors.length}):**\n`;
					interFloorDoors.forEach((d: any) => {
						output += `  - **${d.id}**: Floor ${d.from_floor} ${d.from_room_name || d.from_room_id} ↔ Floor ${d.to_floor} ${d.to_room_name || d.to_room_id} (${d.x},${d.y}) [${d.state}]\n`;
					});
				}

				const filterText = floor !== undefined ? ` (filtered for floor ${floor})` : '';
				output += `\n📊 **Summary**: ${sameFloorDoors.length} same-floor, ${interFloorDoors.length} inter-floor${filterText}`;

				return {
					content: [
						{
							type: 'text',
							text: output,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error listing doors**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Database schema inspection tool
	server.tool(
		'inspect-database-schema',
		'Show database table schemas and relationships',
		{
			type: 'object',
			properties: {
				table_name: {
					type: 'string',
					description: 'Specific table to inspect (optional, shows all if not specified)',
				},
			},
		},
		async (args) => {
			try {
				const tableName = args.table_name as string;

				if (tableName) {
					// Show specific table schema
					const schemaQuery = `PRAGMA table_info(${tableName})`;
					const stmt = env.DB.prepare(schemaQuery);
					const result = await stmt.all();

					if (!result.success || !result.results?.length) {
						return {
							content: [
								{
									type: 'text',
									text: `❌ **Table not found**: ${tableName}`,
								},
							],
						};
					}

					const columns = result.results.map((col: any) =>
						`  - **${col.name}** (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`,
					).join('\n');

					return {
						content: [
							{
								type: 'text',
								text: `📋 **Schema for ${tableName}**:\n\n${columns}`,
							},
						],
					};
				} else {
					// Show all tables
					const tablesQuery = 'SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name';
					const stmt = env.DB.prepare(tablesQuery);
					const result = await stmt.all();

					if (!result.success) {
						throw new Error(`Failed to query tables: ${result.error}`);
					}

					const tables = result.results?.map((t: any) => `  - ${t.name}`).join('\n') || 'No tables found';

					return {
						content: [
							{
								type: 'text',
								text: `📋 **Database Tables**:\n\n${tables}\n\nUse \`inspect-database-schema\` with a specific table name to see its schema.`,
							},
						],
					};
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `❌ **Error inspecting schema**: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
					],
				};
			}
		},
	);

	// Added for extra debuggability
	server.server.onerror = console.error.bind(console);

	return server;
};

export async function mcpHandler(c: Context<{ Bindings: Env; Variables: { user: User } }>): Promise<Response> {
	const { req, res } = toReqRes(c.req.raw);

	// Make sure there's a body
	if (!c.req.raw.body) {
		return c.json({
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Invalid request',
			},
		}, 400);
	}

	// Add required Accept headers for StreamableHTTPServerTransport
	if (!req.headers.accept) {
		req.headers.accept = 'application/json, text/event-stream';
	}

	// Allow OPTIONS requests, returning CORS headers
	if (req.method === 'OPTIONS') {
		return c.json({
			jsonrpc: '2.0',
			result: null,
		}, 200, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		});
	}

	// Get authenticated user from middleware
	const user = c.get('user');
	const server = getServer(c.env, user);

	try {
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});

		// Added for extra debuggability
		transport.onerror = console.error.bind(console);

		await server.connect(transport);

		await transport.handleRequest(req, res, await c.req.json());

		res.on('close', () => {
			console.log('Request closed');
			transport.close();
			server.close();
		});

		return await toFetchResponse(res);
	} catch (e) {
		console.error(e);
		return c.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: 'Internal server error',
				},
				id: null,
			},
			{ status: 500 },
		);
	}
}

const mcp = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Require admin authentication for all MCP endpoints
mcp.use('*', verifyAdminAccess);
mcp.all('*', mcpHandler);

export default mcp;
