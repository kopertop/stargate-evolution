import { jwtVerify, SignJWT } from 'jose';

import { validateUser, validateSession } from './auth-types';
import { getDefaultDestinyStatusTemplate, getStartingInventoryTemplate } from './templates/destiny-status-template';
import { getAllGalaxyTemplates, getGalaxyTemplateById } from './templates/galaxy-templates';
import { getAllPersonTemplates, getAllRaceTemplates } from './templates/person-templates';
import { getAllRoomTemplates, getRoomTemplateById } from './templates/room-templates';
import { getAllLayoutIds, getShipLayoutById, getShipLayoutWithTechnology } from './templates/ship-layouts';
import { getAllStarSystemTemplates, getStarSystemTemplateById, getStarSystemsByGalaxyId } from './templates/star-system-templates';
import { getAllTechnologyTemplates, getTechnologyTemplateById, getRoomTechnologyByRoomId, getAllRoomTechnology } from './templates/technology-templates';
import { Env } from './types';

const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
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

				// Upsert user into users table (preserving original created_at and is_admin)
				await env.DB.prepare(
					'INSERT OR REPLACE INTO users (id, email, name, image, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT is_admin FROM users WHERE id = ?), FALSE), COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)',
				).bind(
					user.id,
					user.email,
					user.name,
					user.picture ?? null,
					user.is_admin || false,
					user.id,
					now,
					now,
				).run();

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

				const currentUser = {
					...userResult.data!,
					is_admin: Boolean(dbUser.is_admin),
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

				const user = {
					...userResult.data!,
					is_admin: Boolean(dbUser.is_admin),
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

		return withCors(new Response('Not found', { status: 404 }));
	},
};
