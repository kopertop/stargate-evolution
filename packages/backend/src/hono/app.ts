import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from '../types';

import admin from './routes/admin';
import auth from './routes/auth';
import games from './routes/games';
import mcp from './routes/mcp';
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

// MCP
app.route('/api/mcp', mcp);

export default app;
