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
app.route('/', auth);
app.route('/', games);
app.route('/', admin);
app.route('/', templates);

export default app;
