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
		{
			name: z.string().describe('Name of the person to greet'),
		},
		async ({ name }) => {
			return {
				content: [
					{
						type: 'text',
						text: `Hello, ${name}! Welcome to Stargate Evolution!`,
					},
				],
			};
		},
	);

	// Get game sessions tool
	server.tool(
		'get-game-sessions',
		'List active game sessions from the database',
		{
			limit: z.number().min(1).max(50).default(10).describe('Maximum number of sessions to return'),
		},
		async ({ limit = 10 }) => {
			try {
				const stmt = env.DB.prepare(`
					SELECT id, user_id, name, description, created_at, updated_at
					FROM saved_games
					ORDER BY updated_at DESC
					LIMIT ?
				`);
				
				const result = await stmt.bind(limit).all();
				
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
		'Query game templates by type',
		{
			type: z.enum(['character', 'person', 'room', 'technology', 'galaxy', 'star_system']).describe('Type of template to query'),
			limit: z.number().min(1).max(20).default(5).describe('Maximum number of templates to return'),
		},
		async ({ type, limit = 5 }) => {
			try {
				const tableMap: Record<string, string> = {
					character: 'character_templates',
					person: 'person_templates',
					room: 'room_templates',
					technology: 'technology_templates',
					galaxy: 'galaxy_templates',
					star_system: 'star_system_templates',
				};

				const tableName = tableMap[type];
				const stmt = env.DB.prepare(`SELECT id, name, description FROM ${tableName} ORDER BY name LIMIT ?`);
				const result = await stmt.bind(limit).all();

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
							text: `Found ${templates.length} ${type} templates:\n\n${templates
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
							text: `Error retrieving ${type} templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
		'Delete a game session from the database (Admin only)',
		{
			sessionId: z.string().describe('ID of the game session to delete'),
			confirm: z.boolean().default(false).describe('Confirm deletion (must be true)'),
		},
		async ({ sessionId, confirm = false }) => {
			try {
				if (!confirm) {
					return {
						content: [
							{
								type: 'text',
								text: `❌ **Deletion not confirmed**\n\nTo delete session ${sessionId}, you must set confirm=true`,
							},
						],
					};
				}

				// First check if session exists
				const existingSession = await env.DB.prepare('SELECT id, name, user_id FROM saved_games WHERE id = ?')
					.bind(sessionId)
					.first();

				if (!existingSession) {
					return {
						content: [
							{
								type: 'text',
								text: `❌ **Session not found**\n\nGame session with ID ${sessionId} does not exist.`,
							},
						],
					};
				}

				// Delete the session
				const deleteResult = await env.DB.prepare('DELETE FROM saved_games WHERE id = ?')
					.bind(sessionId)
					.run();

				if (!deleteResult.success) {
					throw new Error(`Database deletion failed: ${deleteResult.error}`);
				}

				return {
					content: [
						{
							type: 'text',
							text: '✅ **Session deleted successfully**\n\n' +
								  `Session: ${existingSession.name} (${sessionId})\n` +
								  `Owner: ${existingSession.user_id}\n` +
								  `Deleted by: ${user.email}\n` +
								  `Timestamp: ${new Date().toISOString()}`,
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