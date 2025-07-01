import { type MiddlewareHandler } from 'hono';

export const verifyAdmin: MiddlewareHandler = async (c, next) => {
	const user = c.get('user');

	// This middleware must run after verifyJwt, which sets the user
	if (!user || !user.is_admin) {
		return c.json({ error: 'Forbidden: Admin access required' }, 403);
	}

	await next();
};
