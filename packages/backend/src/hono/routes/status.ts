import { Hono } from 'hono';
import type { Env } from '../../types';

// Import package.json to get version
const packageJson = require('../../../package.json');

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
	const status = {
		status: 'ok',
		version: packageJson.version,
		name: packageJson.name,
		timestamp: new Date().toISOString(),
		environment: c.env?.ENVIRONMENT || 'development'
	};
	
	return c.json(status);
});

export default app;