import { Hono } from 'hono';

import packageJson from '../../../package.json';
import type { Env } from '../../types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
	const status = {
		status: 'ok',
		version: packageJson.version,
		name: packageJson.name,
		timestamp: new Date().toISOString(),
		environment: c.env?.ENVIRONMENT || 'development',
	};
	
	return c.json(status);
});

export default app;