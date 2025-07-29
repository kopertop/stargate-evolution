import { type MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';

import { validateUser } from '../../auth-types';
import type { Env, User } from '../../types';

const JWT_ISSUER = 'stargate-evolution';
// Use Wrangler secret in production, fallback for development
const JWT_SECRET = (globalThis as any).JWT_SECRET || 'dev-secret-key';

// Centralized JWT verification utility
export async function verifyJwtToken(token: string, env: Env) {
	const jwtSecret = env.JWT_SECRET || JWT_SECRET;
	const secret = new TextEncoder().encode(jwtSecret);
	return await jwtVerify(token, secret, { issuer: JWT_ISSUER });
}

// Centralized JWT signing utility
export async function signJwtToken(payload: any, expiresInSec: number, env: Env): Promise<string> {
	const jwtSecret = env.JWT_SECRET || JWT_SECRET;
	const secret = new TextEncoder().encode(jwtSecret);
	const { SignJWT } = await import('jose');
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(JWT_ISSUER)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
		.sign(secret);
}

// Helper function to authenticate using API key
async function authenticateWithApiKey(apiKey: string, env: Env): Promise<User | null> {
	try {
		const stmt = env.DB.prepare('SELECT * FROM users WHERE api_key = ?');
		const result = await stmt.bind(apiKey).first();
		
		if (!result) {
			return null;
		}
		
		const userResult = validateUser(result);
		return userResult.success ? userResult.data! : null;
	} catch (error) {
		console.error('API key authentication error:', error);
		return null;
	}
}

export const verifyJwt: MiddlewareHandler<{ Bindings: Env, Variables: { user: User } }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing or invalid authorization header' }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const jwtSecret = c.env.JWT_SECRET || JWT_SECRET;
		console.log('JWT middleware - using secret:', jwtSecret ? 'present' : 'missing');
		const { payload } = await verifyJwtToken(token, c.env);
		const userResult = validateUser(payload.user);
		if (!userResult.success || !userResult.data) {
			console.log('Invalid user', userResult);
			return c.json({ error: 'Invalid user' }, 401);
		}
		c.set('user', userResult.data);
		console.log('set user', userResult.data);
		await next();
	} catch {
		return c.json({ error: 'Invalid or expired token' }, 401);
	}
};

// Helper function to verify admin access (supports both JWT and API keys)
export const verifyAdminAccess: MiddlewareHandler<{ Bindings: Env, Variables: { user: User } }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing or invalid authorization header' }, 401);
	}

	const token = authHeader.substring(7);
	let user: User | null = null;

	// Try API key authentication first
	user = await authenticateWithApiKey(token, c.env);
	
	// If API key auth failed, try JWT authentication
	if (!user) {
		try {
			const jwtSecret = c.env.JWT_SECRET || JWT_SECRET;
			console.log('Admin middleware - using secret:', jwtSecret ? 'present' : 'missing');
			const { payload } = await verifyJwtToken(token, c.env);
			const userResult = validateUser(payload.user);
			if (userResult.success && userResult.data) {
				user = userResult.data;
			}
		} catch (error) {
			// JWT verification failed
			console.log('JWT verification failed:', error);
		}
	}

	if (!user) {
		return c.json({ error: 'Invalid token or API key' }, 401);
	}

	if (!user.is_admin) {
		return c.json({ error: 'Admin access required' }, 403);
	}

	c.set('user', user);
	await next();
};

// Optional authentication middleware - sets user if token is valid, but doesn't require it
export const optionalAuth: MiddlewareHandler<{ Bindings: Env, Variables: { user?: User } }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7);

		try {
			const jwtSecret = c.env.JWT_SECRET || JWT_SECRET;
			const { payload } = await verifyJwtToken(token, c.env);
			
			const userResult = validateUser(payload.user);
			if (userResult.success && userResult.data) {
				c.set('user', userResult.data);
				console.log('[OPTIONAL-AUTH] User authenticated:', userResult.data.id);
			} else {
				console.log('[OPTIONAL-AUTH] Invalid user data in token');
			}
		} catch (error) {
			console.log('[OPTIONAL-AUTH] Token verification failed, proceeding without user:', error);
		}
	} else {
		console.log('[OPTIONAL-AUTH] No authorization header, proceeding without user');
	}

	await next();
};
