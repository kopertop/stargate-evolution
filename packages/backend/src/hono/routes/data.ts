import { Hono } from 'hono';

import { getAllRoomTemplates } from '../../data/room-templates';
import { getAllRooms } from '../../data/rooms';
import type { Env } from '../../types';

const data = new Hono<{ Bindings: Env }>();

data.get('/health', (c) => {
	return c.json({ ok: true, message: 'Templates route is healthy' });
});

data.get('/races', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM race_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch race templates:', error);
		return c.json({ error: 'Failed to fetch race templates' }, 500);
	}
});

data.get('/persons', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM person_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch person templates:', error);
		return c.json({ error: 'Failed to fetch person templates' }, 500);
	}
});

// Alias for integration tests
data.get('/people', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM person_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch person templates:', error);
		return c.json({ error: 'Failed to fetch person templates' }, 500);
	}
});

data.get('/galaxies', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM galaxy_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch galaxy templates:', error);
		return c.json({ error: 'Failed to fetch galaxy templates' }, 500);
	}
});

data.get('/galaxies/:id', async (c) => {
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

data.get('/star-systems', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM star_system_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch star system templates:', error);
		return c.json({ error: 'Failed to fetch star system templates' }, 500);
	}
});

data.get('/rooms', async (c) => {
	try {
		const rooms = await getAllRooms(c.env.DB);
		return c.json(rooms);
	} catch (error) {
		console.error('Failed to fetch room templates:', error);
		return c.json({ error: 'Failed to fetch room templates' }, 500);
	}
});

data.get('/room-templates', async (c) => {
	try {
		const rooms = await getAllRoomTemplates(c.env.DB);
		return c.json(rooms);
	} catch (error) {
		console.error('Failed to fetch room templates:', error);
		return c.json({ error: 'Failed to fetch room templates' }, 500);
	}
});



data.get('/doors', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM doors').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch door templates:', error);
		return c.json({ error: 'Failed to fetch door templates' }, 500);
	}
});

data.get('/doors/room/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM doors WHERE from_room_id = ? OR to_room_id = ?')
			.bind(id, id)
			.all();
		return c.json(results);
	} catch (error) {
		console.error(`Failed to fetch doors for room ${id}:`, error);
		return c.json({ error: 'Failed to fetch doors for room' }, 500);
	}
});

data.get('/characters', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM character_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch character templates:', error);
		return c.json({ error: 'Failed to fetch character templates' }, 500);
	}
});

data.get('/characters/:id', async (c) => {
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

data.get('/furniture', async (c) => {
	try {
		const { getAllRoomFurniture } = await import('../../data/room-furniture-templates');
		const furniture = await getAllRoomFurniture(c.env);
		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch furniture' }, 500);
	}
});

data.get('/furniture/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const { getRoomFurnitureById } = await import('../../data/room-furniture-templates');
		const furniture = await getRoomFurnitureById(c.env, id);
		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch furniture' }, 500);
	}
});

// Technology endpoints (both singular and plural for compatibility)
data.get('/technology', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM technology_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch technology templates:', error);
		return c.json({ error: 'Failed to fetch technology templates' }, 500);
	}
});

data.get('/technologies', async (c) => {
	try {
		const { results } = await c.env.DB.prepare('SELECT * FROM technology_templates').all();
		return c.json(results);
	} catch (error) {
		console.error('Failed to fetch technology templates:', error);
		return c.json({ error: 'Failed to fetch technology templates' }, 500);
	}
});

data.get('/technology/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const result = await c.env.DB.prepare('SELECT * FROM technology_templates WHERE id = ?').bind(id).first();
		if (!result) {
			return c.json({ error: 'Technology template not found' }, 404);
		}
		return c.json(result);
	} catch (error) {
		console.error(`Failed to fetch technology template ${id}:`, error);
		return c.json({ error: 'Failed to fetch technology template' }, 500);
	}
});

data.get('/technologies/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const result = await c.env.DB.prepare('SELECT * FROM technology_templates WHERE id = ?').bind(id).first();
		if (!result) {
			return c.json({ error: 'Technology template not found' }, 404);
		}
		return c.json(result);
	} catch (error) {
		console.error(`Failed to fetch technology template ${id}:`, error);
		return c.json({ error: 'Failed to fetch technology template' }, 500);
	}
});

data.get('/starting-inventory', async (c) => {
	try {
		// Return basic starting inventory items for new games
		const startingInventory = [
			{
				id: 'radio',
				name: 'Tactical Radio',
				type: 'communication',
				description: 'Basic team communication device',
				quantity: 1,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
			},
			{
				id: 'flashlight',
				name: 'Military Flashlight',
				type: 'tool',
				description: 'High-powered LED flashlight',
				quantity: 1,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
			},
			{
				id: 'medkit',
				name: 'Basic Medical Kit',
				type: 'medical',
				description: 'Basic medical supplies for field use',
				quantity: 1,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
			},
		];
		return c.json(startingInventory);
	} catch (error) {
		console.error('Failed to fetch starting inventory:', error);
		return c.json({ error: 'Failed to fetch starting inventory' }, 500);
	}
});

// Furniture Templates endpoints
data.get('/furniture-templates', async (c) => {
	try {
		const { getAllFurnitureTemplates } = await import('../../data/furniture-template-manager');
		const templates = await getAllFurnitureTemplates(c.env);
		return c.json(templates);
	} catch (error) {
		console.error('Failed to fetch furniture templates:', error);
		return c.json({ error: 'Failed to fetch furniture templates' }, 500);
	}
});

data.get('/furniture-templates/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const { getFurnitureTemplateById } = await import('../../data/furniture-template-manager');
		const template = await getFurnitureTemplateById(c.env, id);
		if (!template) {
			return c.json({ error: 'Furniture template not found' }, 404);
		}
		return c.json(template);
	} catch (error) {
		console.error(`Failed to fetch furniture template ${id}:`, error);
		return c.json({ error: 'Failed to fetch furniture template' }, 500);
	}
});

data.get('/furniture-templates/category/:category', async (c) => {
	const { category } = c.req.param();
	try {
		const { getFurnitureTemplatesByCategory } = await import('../../data/furniture-template-manager');
		const templates = await getFurnitureTemplatesByCategory(c.env, category);
		return c.json(templates);
	} catch (error) {
		console.error(`Failed to fetch furniture templates for category ${category}:`, error);
		return c.json({ error: 'Failed to fetch furniture templates' }, 500);
	}
});

data.get('/furniture-templates/type/:type', async (c) => {
	const { type } = c.req.param();
	try {
		const { getFurnitureTemplatesByType } = await import('../../data/furniture-template-manager');
		const templates = await getFurnitureTemplatesByType(c.env, type);
		return c.json(templates);
	} catch (error) {
		console.error(`Failed to fetch furniture templates for type ${type}:`, error);
		return c.json({ error: 'Failed to fetch furniture templates' }, 500);
	}
});

data.post('/furniture-templates', async (c) => {
	try {
		const data = await c.req.json();
		const { createFurnitureTemplate } = await import('../../data/furniture-template-manager');
		const template = await createFurnitureTemplate(c.env, data);
		return c.json(template, 201);
	} catch (error) {
		console.error('Failed to create furniture template:', error);
		return c.json({ error: 'Failed to create furniture template' }, 500);
	}
});

data.put('/furniture-templates/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const data = await c.req.json();
		const { updateFurnitureTemplate } = await import('../../data/furniture-template-manager');
		const template = await updateFurnitureTemplate(c.env, id, data);
		return c.json(template);
	} catch (error) {
		console.error(`Failed to update furniture template ${id}:`, error);
		return c.json({ error: 'Failed to update furniture template' }, 500);
	}
});

data.delete('/furniture-templates/:id', async (c) => {
	const { id } = c.req.param();
	try {
		const { deleteFurnitureTemplate } = await import('../../data/furniture-template-manager');
		const success = await deleteFurnitureTemplate(c.env, id);
		if (!success) {
			return c.json({ error: 'Furniture template not found' }, 404);
		}
		return c.json({ success: true });
	} catch (error) {
		console.error(`Failed to delete furniture template ${id}:`, error);
		return c.json({ error: 'Failed to delete furniture template' }, 500);
	}
});

data.get('/furniture-templates/search/:query', async (c) => {
	const { query } = c.req.param();
	try {
		const { searchFurnitureTemplates } = await import('../../data/furniture-template-manager');
		const templates = await searchFurnitureTemplates(c.env, query);
		return c.json(templates);
	} catch (error) {
		console.error(`Failed to search furniture templates for "${query}":`, error);
		return c.json({ error: 'Failed to search furniture templates' }, 500);
	}
});

export default data;
