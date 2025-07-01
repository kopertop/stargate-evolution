import { Hono } from 'hono';

import type { Env } from '../../types';
import { verifyAdmin } from '../middleware/admin';
import { verifyJwt } from '../middleware/auth';
// We will create this middleware next
// import { verifyAdmin } from '../middleware/admin';

const admin = new Hono<{ Bindings: Env }>();

// All admin routes require authentication and admin privileges
admin.use('/api/admin/*', verifyJwt, verifyAdmin);

admin.get('/api/admin/health', (c) => {
	return c.json({ ok: true, message: 'Admin route is healthy' });
});

// --- Door Templates ---
admin.post('/api/admin/doors', async (c) => {
	const body = await c.req.json();
	// TODO: Add validation using a library like Zod
	try {
		await c.env.DB.prepare(
			'INSERT INTO door_templates (id, name, from_room_id, to_room_id, x, y, width, height, rotation, state, is_automatic, open_direction, style, power_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(
				body.id,
				body.name,
				body.from_room_id,
				body.to_room_id,
				body.x,
				body.y,
				body.width,
				body.height,
				body.rotation,
				body.state,
				body.is_automatic,
				body.open_direction,
				body.style,
				body.power_required,
				Date.now(),
				Date.now(),
			)
			.run();
		return c.json({ message: 'Door template created successfully' }, 201);
	} catch (error) {
		console.error('Failed to create door template:', error);
		return c.json({ error: 'Failed to create door template' }, 500);
	}
});

admin.put('/api/admin/doors/:id', async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'UPDATE door_templates SET name = ?, from_room_id = ?, to_room_id = ?, x = ?, y = ?, width = ?, height = ?, rotation = ?, state = ?, is_automatic = ?, open_direction = ?, style = ?, power_required = ?, updated_at = ? WHERE id = ?',
		)
			.bind(
				body.name,
				body.from_room_id,
				body.to_room_id,
				body.x,
				body.y,
				body.width,
				body.height,
				body.rotation,
				body.state,
				body.is_automatic,
				body.open_direction,
				body.style,
				body.power_required,
				Date.now(),
				id,
			)
			.run();
		return c.json({ message: 'Door template updated successfully' });
	} catch (error) {
		console.error(`Failed to update door template ${id}:`, error);
		return c.json({ error: 'Failed to update door template' }, 500);
	}
});

admin.delete('/api/admin/doors/:id', async (c) => {
	const { id } = c.req.param();
	try {
		await c.env.DB.prepare('DELETE FROM door_templates WHERE id = ?').bind(id).run();
		return c.json({ message: 'Door template deleted successfully' });
	} catch (error) {
		console.error(`Failed to delete door template ${id}:`, error);
		return c.json({ error: 'Failed to delete door template' }, 500);
	}
});

// --- Room Templates ---
admin.post('/api/admin/rooms', async (c) => {
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'INSERT INTO room_templates (id, layout_id, type, name, description, startX, endX, startY, endY, floor, width, height, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(
				body.id,
				body.layout_id,
				body.type,
				body.name,
				body.description,
				body.startX,
				body.endX,
				body.startY,
				body.endY,
				body.floor,
				body.width,
				body.height,
				body.image,
				Date.now(),
				Date.now(),
			)
			.run();
		return c.json({ message: 'Room template created successfully' }, 201);
	} catch (error) {
		console.error('Failed to create room template:', error);
		return c.json({ error: 'Failed to create room template' }, 500);
	}
});

admin.put('/api/admin/rooms/:id', async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'UPDATE room_templates SET layout_id = ?, type = ?, name = ?, description = ?, startX = ?, endX = ?, startY = ?, endY = ?, floor = ?, width = ?, height = ?, image = ?, updated_at = ? WHERE id = ?',
		)
			.bind(
				body.layout_id,
				body.type,
				body.name,
				body.description,
				body.startX,
				body.endX,
				body.startY,
				body.endY,
				body.floor,
				body.width,
				body.height,
				body.image,
				Date.now(),
				id,
			)
			.run();
		return c.json({ message: 'Room template updated successfully' });
	} catch (error) {
		console.error(`Failed to update room template ${id}:`, error);
		return c.json({ error: 'Failed to update room template' }, 500);
	}
});

// --- Character Templates ---
admin.post('/api/admin/characters', async (c) => {
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'INSERT INTO character_templates (id, user_id, name, role, race_template_id, progression, description, image, current_room_id, health, hunger, thirst, fatigue, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(
				body.id,
				body.user_id,
				body.name,
				body.role,
				body.race_template_id,
				JSON.stringify(body.progression),
				body.description,
				body.image,
				body.current_room_id,
				body.health,
				body.hunger,
				body.thirst,
				body.fatigue,
				Date.now(),
				Date.now(),
			)
			.run();
		return c.json({ message: 'Character template created successfully' }, 201);
	} catch (error) {
		console.error('Failed to create character template:', error);
		return c.json({ error: 'Failed to create character template' }, 500);
	}
});

admin.put('/api/admin/characters/:id', async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'UPDATE character_templates SET user_id = ?, name = ?, role = ?, race_template_id = ?, progression = ?, description = ?, image = ?, current_room_id = ?, health = ?, hunger = ?, thirst = ?, fatigue = ?, updated_at = ? WHERE id = ?',
		)
			.bind(
				body.user_id,
				body.name,
				body.role,
				body.race_template_id,
				JSON.stringify(body.progression),
				body.description,
				body.image,
				body.current_room_id,
				body.health,
				body.hunger,
				body.thirst,
				body.fatigue,
				Date.now(),
				id,
			)
			.run();
		return c.json({ message: 'Character template updated successfully' });
	} catch (error) {
		console.error(`Failed to update character template ${id}:`, error);
		return c.json({ error: 'Failed to update character template' }, 500);
	}
});

admin.post('/api/admin/characters/:id/experience', async (c) => {
	const { id } = c.req.param();
	const { amount } = await c.req.json();

	if (typeof amount !== 'number' || amount <= 0) {
		return c.json({ error: 'Invalid experience amount' }, 400);
	}

	try {
		const char = await c.env.DB.prepare('SELECT progression FROM character_templates WHERE id = ?').bind(id).first();
		if (!char) {
			return c.json({ error: 'Character not found' }, 404);
		}

		const progression = JSON.parse(char.progression as string);
		progression.total_experience = (progression.total_experience || 0) + amount;
		// TODO: Add level up logic

		await c.env.DB.prepare('UPDATE character_templates SET progression = ? WHERE id = ?')
			.bind(JSON.stringify(progression), id)
			.run();

		return c.json({ message: 'Experience added successfully', progression });
	} catch (error) {
		console.error(`Failed to add experience to character ${id}:`, error);
		return c.json({ error: 'Failed to add experience' }, 500);
	}
});

// We will migrate template creation/update/delete routes here

export default admin;
