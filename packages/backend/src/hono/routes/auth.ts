import { Hono } from 'hono';
import * as jose from 'jose';

import { validateUser, validateSession } from '../../auth-types';
import type { Env } from '../../types';
import { verifyJwt as verifyJwtMiddleware, verifyJwtToken, signJwtToken } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

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

// Generate a secure API key
function generateApiKey(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const keyLength = 64;
	let result = 'sk-'; // Prefix to identify as API key
	
	// Use crypto.getRandomValues for secure random generation
	const randomArray = new Uint8Array(keyLength);
	crypto.getRandomValues(randomArray);
	
	for (let i = 0; i < keyLength; i++) {
		result += chars[randomArray[i] % chars.length];
	}
	
	return result;
}

async function verifyGoogleIdToken(idToken: string) {
	try {
		console.log('JWT_SECRET', JWT_SECRET);
		const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
		console.log('JWKS_URL', JWKS_URL);
		
		// Create JWKS with caching
		const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL), {
			cacheMaxAge: 10 * 60 * 1000, // Cache for 10 minutes
		});
		console.log('JWKS', JWKS);
		
		const { payload } = await jose.jwtVerify(idToken, JWKS, {
			issuer: GOOGLE_ISSUERS,
			audience: GOOGLE_CLIENT_ID,
			algorithms: ['RS256', 'PS256', 'ES256'], // Allow multiple algorithms
		});
		console.log('payload', payload);
		return payload;
	} catch (error) {
		console.error('Error verifying Google ID token:', error);
		// Log more details about the error for debugging
		if (error instanceof Error) {
			console.error('Error details:', {
				message: error.message,
				name: error.name,
				stack: error.stack,
			});
		}
		throw error;
	}
}


// Helper function to verify admin access
async function verifyAdminAccess(c: any): Promise<{ success: boolean; user?: any; error?: string }> {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return { success: false, error: 'Missing or invalid authorization header' };
		}

		const token = authHeader.substring(7);
		const { payload } = await verifyJwtToken(token, c.env);
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

auth.post('/google', async (c) => {
	try {
		const { idToken } = await c.req.json() as any;
		if (!idToken || typeof idToken !== 'string') throw new Error('Missing idToken');
		console.log('Verify Google ID Token', idToken);
		const payload = await verifyGoogleIdToken(idToken);
		console.log('Verify Google ID Token response', payload);
		const userResult = validateUser({
			id: payload.sub,
			email: payload.email,
			name: payload.name,
			picture: payload.picture,
		});
		if (!userResult.success) throw new Error('Invalid user payload');
		const user = userResult.data!;
		const now = Date.now();

		// Upsert user into users table (preserving original created_at, is_admin, and api_key)
		await c.env.DB.prepare(
			'INSERT OR REPLACE INTO users (id, email, name, image, is_admin, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT is_admin FROM users WHERE id = ?), FALSE), (SELECT api_key FROM users WHERE id = ?), COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)',
		).bind(
			user.id,
			user.email,
			user.name,
			user.picture ?? null,
			user.id,
			user.id,
			user.id,
			now,
			now,
		).run();

		// Fetch the user with admin flag and api_key from database
		const dbUser = await c.env.DB.prepare('SELECT id, email, name, image, is_admin, api_key FROM users WHERE id = ?').bind(user.id).first();

		const authenticatedUser = {
			...user,
			is_admin: Boolean(dbUser?.is_admin),
			api_key: dbUser?.api_key || undefined,
		};

		const accessToken = await signJwtToken({ user: authenticatedUser }, ACCESS_TOKEN_EXP, c.env);
		const refreshToken = await signJwtToken({ user: authenticatedUser }, REFRESH_TOKEN_EXP, c.env);
		const session = {
			token: accessToken,
			refreshToken,
			user: authenticatedUser,
			expiresAt: now + ACCESS_TOKEN_EXP * 1000,
		};
		const sessionResult = validateSession(session);
		if (!sessionResult.success) throw new Error('Invalid session');
		return c.json(session);
	} catch (err: any) {
		return c.json({ error: err.message || 'Auth failed' }, 400);
	}
});

auth.post('/validate', async (c) => {
	try {
		const { token } = await c.req.json();
		if (!token || typeof token !== 'string') {
			throw new Error('Missing token');
		}

		const { payload } = await verifyJwtToken(token, c.env);
		const userResult = validateUser(payload.user);
		if (!userResult.success) {
			throw new Error('Invalid user');
		}

		// Fetch current user data from database to get latest admin status
		const dbUser = await c.env.DB.prepare('SELECT id, email, name, image, is_admin, api_key FROM users WHERE id = ?')
			.bind(userResult.data!.id).first();

		if (!dbUser) {
			throw new Error('User not found in database');
		}

		// Check if this user should be auto-admin and update if needed
		const isAutoAdmin = dbUser.email === 'kopertop@gmail.com';
		if (isAutoAdmin && !dbUser.is_admin) {
			// Update admin status for kopertop@gmail.com
			await c.env.DB.prepare('UPDATE users SET is_admin = TRUE, updated_at = ? WHERE id = ?')
				.bind(Date.now(), userResult.data!.id).run();
		}

		const currentUser = {
			...userResult.data!,
			is_admin: isAutoAdmin || Boolean(dbUser.is_admin),
			api_key: dbUser?.api_key || undefined,
		};

		return c.json({ valid: true, user: currentUser });
	} catch {
		return c.json({ valid: false }, 401);
	}
});

auth.post('/refresh', async (c) => {
	try {
		const { refreshToken } = await c.req.json();
		if (!refreshToken || typeof refreshToken !== 'string') {
			throw new Error('Missing refreshToken');
		}

		const { payload } = await verifyJwtToken(refreshToken, c.env);
		const userResult = validateUser(payload.user);
		if (!userResult.success) {
			throw new Error('Invalid user');
		}

		// Fetch current user data from database to get latest admin status
		const dbUser = await c.env.DB.prepare('SELECT id, email, name, image, is_admin, api_key FROM users WHERE id = ?')
			.bind(userResult.data!.id).first();

		if (!dbUser) {
			throw new Error('User not found in database');
		}

		// Check if this user should be auto-admin and update if needed
		const isAutoAdmin = dbUser.email === 'kopertop@gmail.com';
		if (isAutoAdmin && !dbUser.is_admin) {
			// Update admin status for kopertop@gmail.com
			await c.env.DB.prepare('UPDATE users SET is_admin = TRUE, updated_at = ? WHERE id = ?')
				.bind(Date.now(), userResult.data!.id).run();
		}

		const user = {
			...userResult.data!,
			is_admin: isAutoAdmin || Boolean(dbUser.is_admin),
			api_key: dbUser?.api_key || undefined,
		};

		const now = Date.now();
		const newAccessToken = await signJwtToken({ user }, ACCESS_TOKEN_EXP, c.env);
		const newRefreshToken = await signJwtToken({ user }, REFRESH_TOKEN_EXP, c.env);
		const session = {
			token: newAccessToken,
			refreshToken: newRefreshToken,
			user,
			expiresAt: now + ACCESS_TOKEN_EXP * 1000,
		};
		const sessionResult = validateSession(session);
		if (!sessionResult.success) {
			throw new Error('Invalid session');
		}

		return c.json(session);
	} catch {
		return c.json({ error: 'Refresh failed' }, 401);
	}
});

// API Key management endpoints (require JWT authentication)
auth.post('/generate-api-key', verifyJwtMiddleware, async (c) => {
	try {
		const user = c.get('user');
		
		if (!user.is_admin) {
			return c.json({ error: 'Admin access required to generate API keys' }, 403);
		}

		// Generate a new API key
		const apiKey = generateApiKey();
		
		// Update user with new API key
		await c.env.DB.prepare('UPDATE users SET api_key = ?, updated_at = ? WHERE id = ?')
			.bind(apiKey, Date.now(), user.id)
			.run();

		return c.json({ 
			success: true, 
			api_key: apiKey,
			message: 'API key generated successfully',  
		});
	} catch (error) {
		console.error('Failed to generate API key:', error);
		return c.json({ error: 'Failed to generate API key' }, 500);
	}
});

auth.delete('/api-key', verifyJwtMiddleware, async (c) => {
	try {
		const user = c.get('user');
		
		if (!user.is_admin) {
			return c.json({ error: 'Admin access required to manage API keys' }, 403);
		}

		// Remove API key from user
		await c.env.DB.prepare('UPDATE users SET api_key = NULL, updated_at = ? WHERE id = ?')
			.bind(Date.now(), user.id)
			.run();

		return c.json({ 
			success: true,
			message: 'API key deleted successfully',  
		});
	} catch (error) {
		console.error('Failed to delete API key:', error);
		return c.json({ error: 'Failed to delete API key' }, 500);
	}
});

export default auth;
