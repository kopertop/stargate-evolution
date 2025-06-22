import { jwtVerify, SignJWT } from 'jose';

import { validateUser, validateSession } from './auth-types';
import { getDefaultDestinyStatusTemplate, getStartingInventoryTemplate } from './templates/destiny-status-template';
import { getAllDoorTemplates, getDoorTemplateById, getDoorsForRoom, createDoorTemplate, updateDoorTemplate, deleteDoorTemplate } from './templates/door-templates';
import { getAllGalaxyTemplates, getGalaxyTemplateById } from './templates/galaxy-templates';
import { getAllPersonTemplates, getAllRaceTemplates } from './templates/person-templates';
import { getAllRoomFurniture, getRoomFurniture, getFurnitureByType, getRoomFurnitureById, createRoomFurniture, updateRoomFurniture, deleteRoomFurniture } from './templates/room-furniture-templates';
import { getAllRoomTemplates, getRoomTemplateById } from './templates/room-templates';
import { getAllLayoutIds, getShipLayoutById, getShipLayoutWithTechnology } from './templates/ship-layouts';
import { getAllStarSystemTemplates, getStarSystemTemplateById, getStarSystemsByGalaxyId } from './templates/star-system-templates';
import { getAllTechnologyTemplates, getTechnologyTemplateById, getRoomTechnologyByRoomId, getAllRoomTechnology } from './templates/technology-templates';
import { Env } from './types';

const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
	'access-control-allow-headers': 'Content-Type, Authorization',
};

function withCors(res: Response): Response {
	const newHeaders = new Headers(res.headers);
	for (const [k, v] of Object.entries(corsHeaders)) newHeaders.set(k, v);
	return new Response(res.body, { ...res, headers: newHeaders });
}

const GOOGLE_ISSUERS = [
	'https://accounts.google.com',
	'accounts.google.com',
];
const GOOGLE_CLIENT_ID = '688478835170-eloiofvs1afuiqfflk44qevfphsfh5e6.apps.googleusercontent.com';

// Use Wrangler secret in production
const JWT_SECRET = (globalThis as any).JWT_SECRET || 'dev-secret-key';
const JWT_ISSUER = 'stargate-evolution';
const ACCESS_TOKEN_EXP = 60 * 15; // 15 minutes
const REFRESH_TOKEN_EXP = 60 * 60 * 24 * 7; // 7 days

async function verifyGoogleIdToken(idToken: string) {
	const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
	const { createRemoteJWKSet } = await import('jose');
	const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
	const { payload } = await jwtVerify(idToken, JWKS, {
		issuer: GOOGLE_ISSUERS,
		audience: GOOGLE_CLIENT_ID,
	});
	return payload;
}

async function signJwt(payload: any, expiresInSec: number): Promise<string> {
	const secret = new TextEncoder().encode(JWT_SECRET);
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(JWT_ISSUER)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
		.sign(secret);
}

async function verifyJwt(token: string) {
	const secret = new TextEncoder().encode(JWT_SECRET);
	return await jwtVerify(token, secret, { issuer: JWT_ISSUER });
}

// Helper function to verify admin access
async function verifyAdminAccess(request: Request): Promise<{ success: boolean; user?: any; error?: string }> {
	try {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return { success: false, error: 'Missing or invalid authorization header' };
		}

		const token = authHeader.substring(7);
		const { payload } = await verifyJwt(token);
		const userResult = validateUser(payload.user);
		if (!userResult.success) {
			return { success: false, error: 'Invalid user' };
		}

		const user = userResult.data!;
		if (!user.is_admin) {
			return { success: false, error: 'Admin access required' };
		}

		return { success: true, user };
	} catch (err: any) {
		return { success: false, error: 'Invalid token' };
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		console.log('Request', request);
		const url = new URL(request.url);
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}
		if (url.pathname === '/hello') {
			return withCors(new Response('Hello from Destiny backend!', {
				headers: { 'content-type': 'text/plain' },
			}));
		}
		if (url.pathname === '/api/auth/google' && request.method === 'POST') {
			try {
				const { idToken } = await request.json() as any;
				if (!idToken || typeof idToken !== 'string') throw new Error('Missing idToken');
				console.log('Verify Google ID Token', idToken);
				const payload = await verifyGoogleIdToken(idToken);
				console.log('Verify Google ID Token', payload);
				const userResult = validateUser({
					id: payload.sub,
					email: payload.email,
					name: payload.name,
					picture: payload.picture,
				});
				if (!userResult.success) throw new Error('Invalid user payload');
				const user = userResult.data!;
				const now = Date.now();

				// Check if this is the admin user and should be automatically granted admin access
				const isAutoAdmin = user.email === 'kopertop@gmail.com';

				// Upsert user into users table (preserving original created_at, but setting admin for kopertop@gmail.com)
				if (isAutoAdmin) {
					// Force admin status for kopertop@gmail.com
					await env.DB.prepare(
						'INSERT OR REPLACE INTO users (id, email, name, image, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, TRUE, COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)',
					).bind(
						user.id,
						user.email,
						user.name,
						user.picture ?? null,
						user.id,
						now,
						now,
					).run();
				} else {
					// Preserve existing admin status for other users
					await env.DB.prepare(
						'INSERT OR REPLACE INTO users (id, email, name, image, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT is_admin FROM users WHERE id = ?), FALSE), COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)',
					).bind(
						user.id,
						user.email,
						user.name,
						user.picture ?? null,
						user.id,
						user.id,
						now,
						now,
					).run();
				}

				// Fetch the user with admin flag from database
				const dbUser = await env.DB.prepare('SELECT id, email, name, image, is_admin FROM users WHERE id = ?').bind(user.id).first();

				const authenticatedUser = {
					...user,
					is_admin: Boolean(dbUser?.is_admin),
				};

				const accessToken = await signJwt({ user: authenticatedUser }, ACCESS_TOKEN_EXP);
				const refreshToken = await signJwt({ user: authenticatedUser }, REFRESH_TOKEN_EXP);
				const session = {
					token: accessToken,
					refreshToken,
					user: authenticatedUser,
					expiresAt: now + ACCESS_TOKEN_EXP * 1000,
				};
				const sessionResult = validateSession(session);
				if (!sessionResult.success) throw new Error('Invalid session');
				return withCors(new Response(JSON.stringify(session), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Auth failed' }), { status: 400, headers: { 'content-type': 'application/json' } }));
			}
		}
		if (url.pathname === '/api/auth/validate' && request.method === 'POST') {
			try {
				const { token } = await request.json() as any;
				if (!token || typeof token !== 'string') throw new Error('Missing token');
				const { payload } = await verifyJwt(token);
				const userResult = validateUser(payload.user);
				if (!userResult.success) throw new Error('Invalid user');

				// Fetch current user data from database to get latest admin status
				const dbUser = await env.DB.prepare('SELECT id, email, name, image, is_admin FROM users WHERE id = ?')
					.bind(userResult.data!.id).first();

				if (!dbUser) throw new Error('User not found in database');

				// Check if this user should be auto-admin and update if needed
				const isAutoAdmin = dbUser.email === 'kopertop@gmail.com';
				if (isAutoAdmin && !dbUser.is_admin) {
					// Update admin status for kopertop@gmail.com
					await env.DB.prepare('UPDATE users SET is_admin = TRUE, updated_at = ? WHERE id = ?')
						.bind(Date.now(), userResult.data!.id).run();
				}

				const currentUser = {
					...userResult.data!,
					is_admin: isAutoAdmin || Boolean(dbUser.is_admin),
				};

				return withCors(new Response(JSON.stringify({ valid: true, user: currentUser }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch {
				return withCors(new Response(JSON.stringify({ valid: false }), { status: 401, headers: { 'content-type': 'application/json' } }));
			}
		}
		if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
			try {
				const { refreshToken } = await request.json() as any;
				if (!refreshToken || typeof refreshToken !== 'string') throw new Error('Missing refreshToken');
				const { payload } = await verifyJwt(refreshToken);
				const userResult = validateUser(payload.user);
				if (!userResult.success) throw new Error('Invalid user');

				// Fetch current user data from database to get latest admin status
				const dbUser = await env.DB.prepare('SELECT id, email, name, image, is_admin FROM users WHERE id = ?')
					.bind(userResult.data!.id).first();

				if (!dbUser) throw new Error('User not found in database');

				// Check if this user should be auto-admin and update if needed
				const isAutoAdmin = dbUser.email === 'kopertop@gmail.com';
				if (isAutoAdmin && !dbUser.is_admin) {
					// Update admin status for kopertop@gmail.com
					await env.DB.prepare('UPDATE users SET is_admin = TRUE, updated_at = ? WHERE id = ?')
						.bind(Date.now(), userResult.data!.id).run();
				}

				const user = {
					...userResult.data!,
					is_admin: isAutoAdmin || Boolean(dbUser.is_admin),
				};

				const now = Date.now();
				const newAccessToken = await signJwt({ user }, ACCESS_TOKEN_EXP);
				const newRefreshToken = await signJwt({ user }, REFRESH_TOKEN_EXP);
				const session = {
					token: newAccessToken,
					refreshToken: newRefreshToken,
					user,
					expiresAt: now + ACCESS_TOKEN_EXP * 1000,
				};
				const sessionResult = validateSession(session);
				if (!sessionResult.success) throw new Error('Invalid session');
				return withCors(new Response(JSON.stringify(session), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch {
				return withCors(new Response(JSON.stringify({ error: 'Refresh failed' }), { status: 401, headers: { 'content-type': 'application/json' } }));
			}
		}

		// Template API endpoints (no auth required - public reference data)
		if (url.pathname === '/api/templates/rooms' && request.method === 'GET') {
			try {
				const rooms = await getAllRoomTemplates(env.DB);
				return withCors(new Response(JSON.stringify(rooms), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch room templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/templates/rooms/') && request.method === 'GET') {
			try {
				const roomId = url.pathname.split('/').pop();
				if (!roomId) throw new Error('Room ID required');

				const room = await getRoomTemplateById(env.DB, roomId);
				if (!room) {
					return withCors(new Response(JSON.stringify({ error: 'Room template not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify(room), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch room template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/people' && request.method === 'GET') {
			try {
				const people = await getAllPersonTemplates(env.DB);
				return withCors(new Response(JSON.stringify(people), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch person templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/races' && request.method === 'GET') {
			try {
				const races = await getAllRaceTemplates(env.DB);
				return withCors(new Response(JSON.stringify(races), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch race templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/ship-layouts' && request.method === 'GET') {
			try {
				const layouts = await getAllLayoutIds(env.DB);
				return withCors(new Response(JSON.stringify(layouts), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch ship layouts' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/templates/ship-layouts/') && request.method === 'GET') {
			try {
				const layoutId = url.pathname.split('/').pop();
				if (!layoutId) throw new Error('Layout ID required');

				// Check if enhanced data with technology is requested
				const includeTechnology = url.searchParams.get('include_technology') === 'true';

				const layout = includeTechnology
					? await getShipLayoutWithTechnology(env.DB, layoutId)
					: await getShipLayoutById(env.DB, layoutId);

				if (!layout) {
					return withCors(new Response(JSON.stringify({ error: 'Ship layout not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify(layout), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch ship layout' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Technology template endpoints
		if (url.pathname === '/api/templates/technology' && request.method === 'GET') {
			try {
				const technologies = await getAllTechnologyTemplates(env.DB);
				return withCors(new Response(JSON.stringify(technologies), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch technology templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/templates/technology/') && request.method === 'GET') {
			try {
				const techId = url.pathname.split('/').pop();
				if (!techId) throw new Error('Technology ID required');

				const technology = await getTechnologyTemplateById(env.DB, techId);
				if (!technology) {
					return withCors(new Response(JSON.stringify({ error: 'Technology template not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify(technology), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch technology template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Room technology endpoints
		if (url.pathname.startsWith('/api/templates/room-technology') && request.method === 'GET') {
			try {
				if (url.pathname.startsWith('/api/templates/room-technology/')) {
					const roomId = url.pathname.split('/').pop();
					if (!roomId) throw new Error('Room ID required');
					const roomTech = await getRoomTechnologyByRoomId(env.DB, roomId);
					return withCors(new Response(JSON.stringify(roomTech), {
						headers: { 'content-type': 'application/json' },
					}));
				}
				const roomId = url.searchParams.get('room_id');
				if (roomId) {
					const roomTech = await getRoomTechnologyByRoomId(env.DB, roomId);
					return withCors(new Response(JSON.stringify(roomTech), {
						headers: { 'content-type': 'application/json' },
					}));
				} else {
					const allRoomTech = await getAllRoomTechnology(env.DB);
					return withCors(new Response(JSON.stringify(allRoomTech), {
						headers: { 'content-type': 'application/json' },
					}));
				}
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch room technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/galaxies' && request.method === 'GET') {
			try {
				const galaxies = await getAllGalaxyTemplates(env.DB);
				return withCors(new Response(JSON.stringify(galaxies), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch galaxy templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/templates/galaxies/') && request.method === 'GET') {
			try {
				const galaxyId = url.pathname.split('/').pop();
				if (!galaxyId) throw new Error('Galaxy ID required');
				const galaxy = await getGalaxyTemplateById(env.DB, galaxyId);
				if (!galaxy) {
					return withCors(new Response(JSON.stringify({ error: 'Galaxy template not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}
				return withCors(new Response(JSON.stringify(galaxy), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch galaxy template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/star-systems' && request.method === 'GET') {
			try {
				const galaxyId = url.searchParams.get('galaxy_id');
				if (galaxyId) {
					const systems = await getStarSystemsByGalaxyId(env.DB, galaxyId);
					return withCors(new Response(JSON.stringify(systems), {
						headers: { 'content-type': 'application/json' },
					}));
				}
				const systems = await getAllStarSystemTemplates(env.DB);
				return withCors(new Response(JSON.stringify(systems), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch star system templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/templates/star-systems/') && request.method === 'GET') {
			try {
				const systemId = url.pathname.split('/').pop();
				if (!systemId) throw new Error('Star system ID required');
				const system = await getStarSystemTemplateById(env.DB, systemId);
				if (!system) {
					return withCors(new Response(JSON.stringify({ error: 'Star system template not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}
				return withCors(new Response(JSON.stringify(system), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch star system template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/templates/destiny-status' && request.method === 'GET') {
			try {
				const status = getDefaultDestinyStatusTemplate();
				return withCors(new Response(JSON.stringify(status), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch destiny status template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}
		if (url.pathname === '/api/templates/starting-inventory' && request.method === 'GET') {
			try {
				const inventory = getStartingInventoryTemplate();
				return withCors(new Response(JSON.stringify(inventory), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch starting inventory template' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Admin API endpoints (require admin authentication)
		if (url.pathname === '/api/admin/users' && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const users = await env.DB.prepare('SELECT id, email, name, image, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC').all();
				return withCors(new Response(JSON.stringify(users.results), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch users' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/users/') && request.method === 'PATCH') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const userId = url.pathname.split('/').pop();
				if (!userId) throw new Error('User ID required');

				const { is_admin } = await request.json() as any;
				if (typeof is_admin !== 'boolean') throw new Error('is_admin must be a boolean');

				const result = await env.DB.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?')
					.bind(is_admin, Date.now(), userId).run();

				if (result.meta.changes === 0) {
					return withCors(new Response(JSON.stringify({ error: 'User not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update user' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/admin/rooms' && request.method === 'POST') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const roomData = await request.json() as any;
				const now = Date.now();

				// Create the new room
				await env.DB.prepare(`
					INSERT INTO room_templates (
						id, layout_id, type, name, description, width, height, floor,
						found, locked, explored, image, base_exploration_time, status,
						connection_north, connection_south, connection_east, connection_west,
						created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`).bind(
					roomData.id,
					roomData.layout_id,
					roomData.type,
					roomData.name,
					roomData.description || null,
					roomData.width,
					roomData.height,
					roomData.floor,
					roomData.found || false,
					roomData.locked || false,
					roomData.explored || false,
					roomData.image || null,
					roomData.base_exploration_time || 2,
					roomData.status || 'ok',
					roomData.connection_north || null,
					roomData.connection_south || null,
					roomData.connection_east || null,
					roomData.connection_west || null,
					now,
					now,
				).run();

				// Handle bidirectional connections - update connected rooms to point back to this new room
				const connections = [
					{ direction: 'north', reverseDirection: 'south', connectedRoomId: roomData.connection_north },
					{ direction: 'south', reverseDirection: 'north', connectedRoomId: roomData.connection_south },
					{ direction: 'east', reverseDirection: 'west', connectedRoomId: roomData.connection_east },
					{ direction: 'west', reverseDirection: 'east', connectedRoomId: roomData.connection_west },
				];

				for (const conn of connections) {
					if (conn.connectedRoomId) {
						// Update the connected room to point back to this new room
						await env.DB.prepare(`
							UPDATE room_templates
							SET connection_${conn.reverseDirection} = ?, updated_at = ?
							WHERE id = ?
						`).bind(roomData.id, now, conn.connectedRoomId).run();
					}
				}

				return withCors(new Response(JSON.stringify({ success: true, id: roomData.id }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to create room' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/rooms/') && request.method === 'PUT') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const roomId = url.pathname.split('/').pop();
				if (!roomId) throw new Error('Room ID required');

				const roomData = await request.json() as any;
				const now = Date.now();

				const result = await env.DB.prepare(`
					UPDATE room_templates SET
						layout_id = ?, type = ?, name = ?, description = ?, width = ?, height = ?, floor = ?,
						found = ?, locked = ?, explored = ?, image = ?, base_exploration_time = ?, status = ?,
						connection_north = ?, connection_south = ?, connection_east = ?, connection_west = ?,
						updated_at = ?
					WHERE id = ?
				`).bind(
					roomData.layout_id,
					roomData.type,
					roomData.name,
					roomData.description || null,
					roomData.width,
					roomData.height,
					roomData.floor,
					roomData.found || false,
					roomData.locked || false,
					roomData.explored || false,
					roomData.image || null,
					roomData.base_exploration_time || 2,
					roomData.status || 'ok',
					roomData.connection_north || null,
					roomData.connection_south || null,
					roomData.connection_east || null,
					roomData.connection_west || null,
					now,
					roomId,
				).run();

				if (result.meta.changes === 0) {
					return withCors(new Response(JSON.stringify({ error: 'Room not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update room' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/rooms/') && request.method === 'DELETE') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const roomId = url.pathname.split('/').pop();
				if (!roomId) throw new Error('Room ID required');

				const now = Date.now();

				// Remove reverse connections - update any rooms that connect to this room
				await env.DB.prepare(`
					UPDATE room_templates
					SET connection_north = NULL, updated_at = ?
					WHERE connection_north = ?
				`).bind(now, roomId).run();

				await env.DB.prepare(`
					UPDATE room_templates
					SET connection_south = NULL, updated_at = ?
					WHERE connection_south = ?
				`).bind(now, roomId).run();

				await env.DB.prepare(`
					UPDATE room_templates
					SET connection_east = NULL, updated_at = ?
					WHERE connection_east = ?
				`).bind(now, roomId).run();

				await env.DB.prepare(`
					UPDATE room_templates
					SET connection_west = NULL, updated_at = ?
					WHERE connection_west = ?
				`).bind(now, roomId).run();

				// Delete all room technology for this room
				await env.DB.prepare('DELETE FROM room_technology WHERE room_id = ?').bind(roomId).run();

				// Delete the room itself
				const result = await env.DB.prepare('DELETE FROM room_templates WHERE id = ?').bind(roomId).run();

				if (result.meta.changes === 0) {
					return withCors(new Response(JSON.stringify({ error: 'Room not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to delete room' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname === '/api/admin/technologies' && request.method === 'POST') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const techData = await request.json() as any;
				const now = Date.now();

				await env.DB.prepare(`
					INSERT INTO technology_templates (
						id, name, description, category, unlock_requirements, cost, image, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`).bind(
					techData.id,
					techData.name,
					techData.description,
					techData.category || null,
					techData.unlock_requirements || null,
					techData.cost || 0,
					techData.image || null,
					now,
					now,
				).run();

				return withCors(new Response(JSON.stringify({ success: true, id: techData.id }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to create technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/technologies/') && request.method === 'PUT') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const techId = url.pathname.split('/').pop();
				if (!techId) throw new Error('Technology ID required');

				const techData = await request.json() as any;
				const now = Date.now();

				const result = await env.DB.prepare(`
					UPDATE technology_templates SET
						name = ?, description = ?, category = ?, unlock_requirements = ?, cost = ?, image = ?, updated_at = ?
					WHERE id = ?
				`).bind(
					techData.name,
					techData.description,
					techData.category || null,
					techData.unlock_requirements || null,
					techData.cost || 0,
					techData.image || null,
					now,
					techId,
				).run();

				if (result.meta.changes === 0) {
					return withCors(new Response(JSON.stringify({ error: 'Technology not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/technologies/') && request.method === 'DELETE') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const techId = url.pathname.split('/').pop();
				if (!techId) throw new Error('Technology ID required');

				const result = await env.DB.prepare('DELETE FROM technology_templates WHERE id = ?').bind(techId).run();

				if (result.meta.changes === 0) {
					return withCors(new Response(JSON.stringify({ error: 'Technology not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to delete technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Room Technology Admin Endpoints
		if (url.pathname === '/api/admin/room-technology' && request.method === 'POST') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const { setRoomTechnology } = await import('./templates/technology-templates');
				const { room_id, technologies } = await request.json() as { room_id: string; technologies: any[] };

				if (!room_id) throw new Error('Room ID required');
				if (!Array.isArray(technologies)) throw new Error('Technologies must be an array');

				await setRoomTechnology(env.DB, room_id, technologies);

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to set room technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		if (url.pathname.startsWith('/api/admin/room-technology/') && request.method === 'DELETE') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const { deleteRoomTechnology } = await import('./templates/technology-templates');
				const techId = url.pathname.split('/').pop();
				if (!techId) throw new Error('Technology ID required');

				const deleted = await deleteRoomTechnology(env.DB, techId);

				if (!deleted) {
					return withCors(new Response(JSON.stringify({ error: 'Room technology not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to delete room technology' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Game-specific room management endpoints
		if (url.pathname.startsWith('/api/games/') && url.pathname.includes('/rooms') && request.method === 'POST') {
			try {
				const pathParts = url.pathname.split('/');
				const gameId = pathParts[3]; // /api/games/{gameId}/rooms

				if (!gameId) throw new Error('Game ID required');

				const roomData = await request.json() as any;
				const now = Date.now();

				// Get room template to create instance from
				const templateId = roomData.template_id;
				if (!templateId) throw new Error('Template ID required');

				const template = await getRoomTemplateById(env.DB, templateId);
				if (!template) throw new Error(`Room template ${templateId} not found`);

				// Generate new room instance ID
				const roomInstanceId = crypto.randomUUID();

				// Create room instance based on template with game-specific overrides
				const roomInstance = {
					id: roomInstanceId,
					game_id: gameId,
					template_id: templateId,
					layout_id: template.layout_id,
					type: template.type,
					name: roomData.name || template.name,
					description: roomData.description || template.description,
					width: template.width,
					height: template.height,
					floor: template.floor,
					image: template.image,
					base_exploration_time: template.base_exploration_time,
					// Game-specific runtime state
					found: roomData.found || false,
					locked: roomData.locked || false,
					explored: roomData.explored || false,
					status: roomData.status || 'ok',
					exploration_data: null,
					// Connections will be set by connection manager
					connection_north: null,
					connection_south: null,
					connection_east: null,
					connection_west: null,
					created_at: now,
					updated_at: now,
				};

				// Handle connections if specified
				const connectionData = roomData.connections || {};
				const connections = [];

				// Process each connection direction
				for (const [direction, connectedRoomId] of Object.entries(connectionData)) {
					if (connectedRoomId && typeof connectedRoomId === 'string') {
						// Type-safe connection setting
						const connectionField = `connection_${direction}` as keyof typeof roomInstance;
						if (connectionField in roomInstance) {
							(roomInstance as any)[connectionField] = connectedRoomId;
							connections.push({
								direction,
								connectedRoomId,
								reverseDirection: {
									north: 'south',
									south: 'north',
									east: 'west',
									west: 'east',
								}[direction],
							});
						}
					}
				}

				return withCors(new Response(JSON.stringify({
					success: true,
					roomInstance,
					connections: connections.length,
					message: `Room instance created from template ${templateId}`,
				}), {
					headers: { 'content-type': 'application/json' },
				}));

			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to add room to game' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Update room connections for a specific game
		if (url.pathname.startsWith('/api/games/') && url.pathname.includes('/rooms') && url.pathname.includes('/connections') && request.method === 'PUT') {
			try {
				const pathParts = url.pathname.split('/');
				const gameId = pathParts[3]; // /api/games/{gameId}/rooms/connections

				if (!gameId) throw new Error('Game ID required');

				const { roomId, connections } = await request.json() as { roomId: string; connections: Record<string, string | null> };
				const now = Date.now();

				if (!roomId) throw new Error('Room ID required');

				// Update the target room's connections
				const updates = [];
				const reverseUpdates = [];

				for (const [direction, connectedRoomId] of Object.entries(connections)) {
					if (['north', 'south', 'east', 'west'].includes(direction)) {
						updates.push(`connection_${direction} = ?`);

						// Prepare reverse connection updates
						const reverseDirection = {
							north: 'south',
							south: 'north',
							east: 'west',
							west: 'east',
						}[direction];

						if (connectedRoomId && reverseDirection) {
							reverseUpdates.push({
								roomId: connectedRoomId,
								direction: reverseDirection,
								connectedTo: roomId,
							});
						}
					}
				}

				if (updates.length === 0) throw new Error('No valid connections to update');

				// This endpoint returns connection update instructions
				// The actual game state updates happen on the frontend
				return withCors(new Response(JSON.stringify({
					success: true,
					roomId,
					connectionUpdates: connections,
					reverseUpdates,
					message: 'Connection update instructions generated',
				}), {
					headers: { 'content-type': 'application/json' },
				}));

			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update room connections' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Get available room templates for adding to games
		if (url.pathname.startsWith('/api/games/') && url.pathname.includes('/available-rooms') && request.method === 'GET') {
			try {
				const pathParts = url.pathname.split('/');
				const gameId = pathParts[3]; // /api/games/{gameId}/available-rooms

				if (!gameId) throw new Error('Game ID required');

				// Get all room templates
				const templates = await getAllRoomTemplates(env.DB);

				// Filter templates that make sense to add dynamically
				// (exclude essential rooms like gate_room that should only exist once)
				const availableTemplates = templates.filter(template => {
					return !['gate_room', 'bridge'].includes(template.type);
				});

				return withCors(new Response(JSON.stringify(availableTemplates), {
					headers: { 'content-type': 'application/json' },
				}));

			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch available room templates' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Door Templates Endpoints

		// GET /api/admin/doors - Get all door templates
		if (url.pathname === '/api/admin/doors' && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const doors = await getAllDoorTemplates(env.DB);
				return withCors(new Response(JSON.stringify(doors), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch doors' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// GET /api/admin/doors/{doorId} - Get door by ID
		if (url.pathname.startsWith('/api/admin/doors/') && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const doorId = url.pathname.split('/').pop();
				if (!doorId) throw new Error('Door ID required');

				const door = await getDoorTemplateById(env.DB, doorId);
				if (!door) {
					return withCors(new Response(JSON.stringify({ error: 'Door not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify(door), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch door' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// GET /api/admin/rooms/{roomId}/doors - Get doors for a room
		if (url.pathname.includes('/rooms/') && url.pathname.endsWith('/doors') && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const pathParts = url.pathname.split('/');
				const roomId = pathParts[pathParts.length - 2]; // Get room ID from path
				if (!roomId) throw new Error('Room ID required');

				const doors = await getDoorsForRoom(env.DB, roomId);
				return withCors(new Response(JSON.stringify(doors), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch doors for room' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// POST /api/admin/doors - Create door template
		if (url.pathname === '/api/admin/doors' && request.method === 'POST') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const doorData = await request.json() as any;
				const doorId = await createDoorTemplate(env.DB, doorData);
				return withCors(new Response(JSON.stringify({ id: doorId, success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to create door' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// PUT /api/admin/doors/{doorId} - Update door template
		if (url.pathname.startsWith('/api/admin/doors/') && request.method === 'PUT') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const doorId = url.pathname.split('/').pop();
				if (!doorId) throw new Error('Door ID required');

				const doorData = await request.json() as any;
				await updateDoorTemplate(env.DB, doorId, doorData);
				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update door' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// DELETE /api/admin/doors/{doorId} - Delete door template
		if (url.pathname.startsWith('/api/admin/doors/') && request.method === 'DELETE') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const doorId = url.pathname.split('/').pop();
				if (!doorId) throw new Error('Door ID required');

				await deleteDoorTemplate(env.DB, doorId);
				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to delete door' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// Room Furniture Endpoints

		// GET /api/admin/furniture - Get all room furniture
		if (url.pathname === '/api/admin/furniture' && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const furniture = await getAllRoomFurniture(env);
				return withCors(new Response(JSON.stringify(furniture), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch furniture' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// GET /api/admin/furniture/{furnitureId} - Get furniture by ID
		if (url.pathname.startsWith('/api/admin/furniture/') && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const furnitureId = url.pathname.split('/').pop();
				if (!furnitureId) throw new Error('Furniture ID required');

				const furniture = await getRoomFurnitureById(env, furnitureId);
				if (!furniture) {
					return withCors(new Response(JSON.stringify({ error: 'Furniture not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify(furniture), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch furniture' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// GET /api/admin/rooms/{roomId}/furniture - Get furniture for a room
		if (url.pathname.includes('/rooms/') && url.pathname.endsWith('/furniture') && request.method === 'GET') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const pathParts = url.pathname.split('/');
				const roomId = pathParts[pathParts.length - 2]; // Get room ID from path
				if (!roomId) throw new Error('Room ID required');

				const furniture = await getRoomFurniture(env, roomId);
				return withCors(new Response(JSON.stringify(furniture), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to fetch furniture for room' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// POST /api/admin/furniture - Create room furniture
		if (url.pathname === '/api/admin/furniture' && request.method === 'POST') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const furnitureData = await request.json() as any;
				const furniture = await createRoomFurniture(env, furnitureData);
				return withCors(new Response(JSON.stringify(furniture), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to create furniture' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// PUT /api/admin/furniture/{furnitureId} - Update room furniture
		if (url.pathname.startsWith('/api/admin/furniture/') && request.method === 'PUT') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const furnitureId = url.pathname.split('/').pop();
				if (!furnitureId) throw new Error('Furniture ID required');

				const furnitureData = await request.json() as any;
				const furniture = await updateRoomFurniture(env, furnitureId, furnitureData);
				return withCors(new Response(JSON.stringify(furniture), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to update furniture' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		// DELETE /api/admin/furniture/{furnitureId} - Delete room furniture
		if (url.pathname.startsWith('/api/admin/furniture/') && request.method === 'DELETE') {
			const adminCheck = await verifyAdminAccess(request);
			if (!adminCheck.success) {
				return withCors(new Response(JSON.stringify({ error: adminCheck.error }), {
					status: 401, headers: { 'content-type': 'application/json' },
				}));
			}

			try {
				const furnitureId = url.pathname.split('/').pop();
				if (!furnitureId) throw new Error('Furniture ID required');

				const deleted = await deleteRoomFurniture(env, furnitureId);
				if (!deleted) {
					return withCors(new Response(JSON.stringify({ error: 'Furniture not found' }), {
						status: 404, headers: { 'content-type': 'application/json' },
					}));
				}

				return withCors(new Response(JSON.stringify({ success: true }), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch (err: any) {
				return withCors(new Response(JSON.stringify({ error: err.message || 'Failed to delete furniture' }), {
					status: 500, headers: { 'content-type': 'application/json' },
				}));
			}
		}

		return withCors(new Response('Not found', { status: 404 }));
	},
};
