import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from '../types';

import admin from './routes/admin';
import auth from './routes/auth';
import games from './routes/games';
import templates from './routes/templates';
import upload from './routes/upload';

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware with specific origins for credentials support
app.use('*', cors({
	origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow local development origins
	credentials: true, // Allow credentials (cookies, authorization headers)
	allowedHeaders: ['Content-Type', 'Authorization'],
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// Health check endpoint
app.get('/', (c: Context) => {
	return c.text('Hello from Hono!');
});

// Register routes
app.route('/api/auth', auth);
app.route('/api/games', games);
app.route('/api/admin', admin);
app.route('/api/templates', templates);
app.route('/api/upload', upload);

export default app;
