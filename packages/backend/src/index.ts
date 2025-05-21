import { UserSchema, SessionSchema } from '@stargate/common/types/user';
import { jwtVerify, SignJWT } from 'jose';

import handleCreateGameRequest from './games/create-game';
import { handleDestinyStatusRequest } from './games/destiny-status';
import { handleGetGameRequest } from './games/get-game';
import { handleListGamesRequest } from './games/list-games';
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
		if (url.pathname === '/api/games' && request.method === 'POST') {
			return withCors(await handleCreateGameRequest(request, env));
		}
		if (url.pathname === '/api/games/list' && request.method === 'POST') {
			return withCors(await handleListGamesRequest(request, env));
		}
		if (url.pathname === '/api/games/get' && request.method === 'POST') {
			return withCors(await handleGetGameRequest(request, env));
		}
		if (url.pathname === '/api/destiny-status' && (request.method === 'GET' || request.method === 'POST')) {
			return withCors(await handleDestinyStatusRequest(request, env));
		}
		if (url.pathname === '/api/auth/google' && request.method === 'POST') {
			try {
				const { idToken } = await request.json() as any;
				if (!idToken || typeof idToken !== 'string') throw new Error('Missing idToken');
				const payload = await verifyGoogleIdToken(idToken);
				const userResult = UserSchema.safeParse({
					id: payload.sub,
					email: payload.email,
					name: payload.name,
					picture: payload.picture,
				});
				if (!userResult.success) throw new Error('Invalid user payload');
				const user = userResult.data;
				const now = Date.now();
				// Upsert user into users table
				await env.DB.prepare(
					'INSERT OR REPLACE INTO users (id, email, name, image, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)',
				).bind(
					user.id,
					user.email,
					user.name,
					user.picture ?? null,
					user.id,
					now,
					now,
				).run();
				const accessToken = await signJwt({ user }, ACCESS_TOKEN_EXP);
				const refreshToken = await signJwt({ user }, REFRESH_TOKEN_EXP);
				const session = {
					token: accessToken,
					refreshToken,
					user,
					expiresAt: now + ACCESS_TOKEN_EXP * 1000,
				};
				const sessionResult = SessionSchema.safeParse(session);
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
				const userResult = UserSchema.safeParse(payload.user);
				if (!userResult.success) throw new Error('Invalid user');
				return withCors(new Response(JSON.stringify({ valid: true, user: userResult.data }), {
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
				const userResult = UserSchema.safeParse(payload.user);
				if (!userResult.success) throw new Error('Invalid user');
				const user = userResult.data;
				const now = Date.now();
				const newAccessToken = await signJwt({ user }, ACCESS_TOKEN_EXP);
				const newRefreshToken = await signJwt({ user }, REFRESH_TOKEN_EXP);
				const session = {
					token: newAccessToken,
					refreshToken: newRefreshToken,
					user,
					expiresAt: now + ACCESS_TOKEN_EXP * 1000,
				};
				const sessionResult = SessionSchema.safeParse(session);
				if (!sessionResult.success) throw new Error('Invalid session');
				return withCors(new Response(JSON.stringify(session), {
					headers: { 'content-type': 'application/json' },
				}));
			} catch {
				return withCors(new Response(JSON.stringify({ error: 'Refresh failed' }), { status: 401, headers: { 'content-type': 'application/json' } }));
			}
		}
		return withCors(new Response('Not found', { status: 404 }));
	},
};
