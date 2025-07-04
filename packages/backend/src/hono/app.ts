import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from '../types';

import admin from './routes/admin';
import auth from './routes/auth';
import games from './routes/games';
import templates from './routes/templates';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/', (c: Context) => {
	return c.text('Hello from Hono!');
});

// Register routes
app.route('/api/auth', auth);
app.route('/api/games', games);
app.route('/api/admin', admin);
app.route('/api/templates', templates);

export default app;
