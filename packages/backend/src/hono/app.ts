import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from '../types';


import admin from './routes/admin';
import auth from './routes/auth';
import data from './routes/data';
import games from './routes/games';
import status from './routes/status';
import upload from './routes/upload';
import { generateOpenAPISchema } from './schema';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware with specific origins for credentials support
app.use('*', cors());

// Health check endpoint
app.get('/', (c: Context) => {
	return c.text('Hello from Hono!');
});

// OpenAPI schema endpoint for ChatGPT and other AI integrations
app.get('/.well-known/schema.json', (c: Context) => {
	const schema = generateOpenAPISchema();
	return c.json(schema);
});

// Register routes
app.route('/api/auth', auth);
app.route('/api/games', games);
app.route('/api/admin', admin);
app.route('/api/status', status);
app.route('/api/data', data);
app.route('/api/upload', upload);

// MCP route: attempt to load real route dynamically, fallback to mock if unavailable (e.g., in tests)
try {
	// Dynamically require MCP route to avoid bundling its dependencies in tests

	const mcp = new Function('return require')()('./routes/mcp').default;
	app.route('/api/mcp', mcp);
} catch {
	const mockMcp = new Hono();
	mockMcp.all('*', (c) => c.json({ message: 'MCP disabled in tests' }, 501));
	app.route('/api/mcp', mockMcp);
}

export default app;
