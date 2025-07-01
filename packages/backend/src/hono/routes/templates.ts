import { Hono } from 'hono';

import type { Env } from '../../types';

const templates = new Hono<{ Bindings: Env }>();

templates.get('/api/templates/health', (c) => {
	return c.json({ ok: true, message: 'Templates route is healthy' });
});

templates.get('/api/templates/races', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM race_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch race templates:', error);
		return c.json({ error: 'Failed to fetch race templates' }, 500);
	}
});

templates.get('/api/templates/persons', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM person_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch person templates:', error);
		return c.json({ error: 'Failed to fetch person templates' }, 500);
	}
});

templates.get('/api/templates/galaxies', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM galaxy_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch galaxy templates:', error);
		return c.json({ error: 'Failed to fetch galaxy templates' }, 500);
	}
});

templates.get('/api/templates/galaxies/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const result = await c.env.DB.prepare('SELECT * FROM galaxy_templates WHERE id = ?').bind(id).first();
		if (!result) {
			return c.json({ error: 'Galaxy template not found' }, 404);
		}
		return c.json(result);
	} catch (error) {
		console.error(`Failed to fetch galaxy template ${id}:`, error);
		return c.json({ error: 'Failed to fetch galaxy template' }, 500);
	}
});

templates.get('/api/templates/rooms', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM room_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch room templates:', error);
		return c.json({ error: 'Failed to fetch room templates' }, 500);
	}
});

templates.get('/api/templates/doors', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM door_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch door templates:', error);
		return c.json({ error: 'Failed to fetch door templates' }, 500);
	}
});

templates.get('/api/templates/doors/room/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM door_templates WHERE from_room_id = ? OR to_room_id = ?')
			.bind(id, id)
			.all();
		return c.json(results);
	} catch (error) {
		console.error(`Failed to fetch doors for room ${id}:`, error);
		return c.json({ error: 'Failed to fetch doors for room' }, 500);
	}
});

templates.get('/api/templates/characters', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM character_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch character templates:', error);
		return c.json({ error: 'Failed to fetch character templates' }, 500);
	}
});

templates.get('/api/templates/characters/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const result = await c.env.DB.prepare('SELECT * FROM character_templates WHERE id = ?').bind(id).first();
		if (!result) {
			return c.json({ error: 'Character template not found' }, 404);
		}
		return c.json(result);
	} catch (error) {
		console.error(`Failed to fetch character template ${id}:`, error);
		return c.json({ error: 'Failed to fetch character template' }, 500);
	}
});

// We will migrate all public template-fetching routes here

export default templates;
