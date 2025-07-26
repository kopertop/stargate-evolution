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
						text: `Hello! Welcome to Stargate Evolution! MCP server is working correctly.`,
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
							text: `❌ **Delete Function Disabled**\n\nFor safety, the delete game session function has been temporarily disabled. This prevents accidental data deletion during MCP testing.`,
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