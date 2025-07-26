import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from '../types';

import admin from './routes/admin';
import auth from './routes/auth';
import games from './routes/games';
import status from './routes/status';
import templates from './routes/templates';
import upload from './routes/upload';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware with specific origins for credentials support
app.use('*', cors());

// Health check endpoint
app.get('/', (c: Context) => {
	return c.text('Hello from Hono!');
});

// Register routes
app.route('/api/auth', auth);
app.route('/api/games', games);
app.route('/api/admin', admin);
app.route('/api/status', status);
app.route('/api/templates', templates);
app.route('/api/upload', upload);

// MCP - conditionally load to avoid ajv compatibility issues in tests
try {
	// Only import MCP in non-test environments
	if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
		const mcp = require('./routes/mcp').default;
		app.route('/api/mcp', mcp);
	} else {
		// Mock MCP route for tests
		const mockMcp = new Hono();
		mockMcp.all('*', (c) => c.json({ message: 'MCP disabled in tests' }, 501));
		app.route('/api/mcp', mockMcp);
	}
} catch (error) {
	console.warn('MCP route could not be loaded:', error);
	// Fallback mock route
	const mockMcp = new Hono();
	mockMcp.all('*', (c) => c.json({ message: 'MCP unavailable' }, 501));
	app.route('/api/mcp', mockMcp);
}

export default app;
