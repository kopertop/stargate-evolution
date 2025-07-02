import { type MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';

import { validateUser } from '../../auth-types';
import type { Env, User } from '../../types';

const JWT_ISSUER = 'stargate-evolution';

export const verifyJwt: MiddlewareHandler<{ Bindings: Env, Variables: { user: User } }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing or invalid authorization header' }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const secret = new TextEncoder().encode(c.env.JWT_SECRET);
		const { payload } = await jwtVerify(token, secret, { issuer: JWT_ISSUER });
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

// Helper function to verify admin access
export const verifyAdminAccess: MiddlewareHandler<{ Bindings: Env, Variables: { user: User } }> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Missing or invalid authorization header' }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const secret = new TextEncoder().encode(c.env.JWT_SECRET);
		const { payload } = await jwtVerify(token, secret, { issuer: JWT_ISSUER });
		const userResult = validateUser(payload.user);
		if (!userResult.success || !userResult.data) {
			return c.json({ error: 'Invalid user' }, 401);
		}

		const user = userResult.data;
		if (!user.is_admin) {
			return c.json({ error: 'Admin access required' }, 403);
		}

		c.set('user', user);
		await next();
	} catch {
		return c.json({ error: 'Invalid token' }, 401);
	}
};
