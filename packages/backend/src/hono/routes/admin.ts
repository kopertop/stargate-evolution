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

// --- User Management ---
admin.get('/api/admin/users', async (c) => {
	try {
		const users = await c.env.DB.prepare('SELECT id, email, name, image, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC').all();
		return c.json(users.results);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch users' }, 500);
	}
});

admin.patch('/api/admin/users/:id', async (c) => {
	try {
		const userId = c.req.param('id');
		if (!userId) throw new Error('User ID required');

		const { is_admin } = await c.req.json();
		if (typeof is_admin !== 'boolean') throw new Error('is_admin must be a boolean');

		const result = await c.env.DB.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?')
			.bind(is_admin, Date.now(), userId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to update user' }, 500);
	}
});

// --- Door Templates ---
admin.get('/api/admin/doors', async (c) => {
	try {
		const { getAllDoorTemplates } = await import('../../templates/door-templates');
		const doors = await getAllDoorTemplates(c.env.DB);
		return c.json(doors);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch door templates' }, 500);
	}
});

admin.get('/api/admin/doors/:id', async (c) => {
	try {
		const { getDoorTemplateById } = await import('../../templates/door-templates');
		const doorId = c.req.param('id');
		if (!doorId) throw new Error('Door ID required');

		const door = await getDoorTemplateById(c.env.DB, doorId);
		if (!door) {
			return c.json({ error: 'Door template not found' }, 404);
		}

		return c.json(door);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch door template' }, 500);
	}
});

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

admin.delete('/api/admin/rooms/:id', async (c) => {
	try {
		const roomId = c.req.param('id');
		if (!roomId) throw new Error('Room ID required');

		// Delete all room technology for this room
		await c.env.DB.prepare('DELETE FROM room_technology WHERE room_id = ?').bind(roomId).run();

		// Delete the room itself
		const result = await c.env.DB.prepare('DELETE FROM room_templates WHERE id = ?').bind(roomId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Room not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to delete room' }, 500);
	}
});

// --- Character Templates ---
admin.get('/api/admin/characters', async (c) => {
	try {
		const { getAllCharacterTemplates } = await import('../../templates/character-templates');
		const characters = await getAllCharacterTemplates(c.env.DB);
		return c.json(characters);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch characters' }, 500);
	}
});

admin.get('/api/admin/characters/:id', async (c) => {
	try {
		const { getCharacterTemplateById } = await import('../../templates/character-templates');
		const characterId = c.req.param('id');
		if (!characterId) throw new Error('Character ID required');

		const character = await getCharacterTemplateById(c.env.DB, characterId);
		if (!character) {
			return c.json({ error: 'Character not found' }, 404);
		}

		return c.json(character);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch character' }, 500);
	}
});

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

admin.delete('/api/admin/characters/:id', async (c) => {
	try {
		const characterId = c.req.param('id');
		if (!characterId) throw new Error('Character ID required');

		const result = await c.env.DB.prepare('DELETE FROM character_templates WHERE id = ?').bind(characterId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Character not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to delete character' }, 500);
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

// --- Technology Templates ---
admin.post('/api/admin/technologies', async (c) => {
	try {
		const techData = await c.req.json();
		const now = Date.now();

		await c.env.DB.prepare(`
			INSERT INTO technology_templates (
				id, name, description, category, unlock_requirements, cost, image, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			techData.id,
			techData.name,
			techData.description,
			techData.category || null,
			techData.unlock_requirements || null,
			techData.cost || 0,
			techData.image || null,
			now,
			now,
		).run();

		return c.json({ success: true, id: techData.id }, 201);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to create technology' }, 500);
	}
});

admin.put('/api/admin/technologies/:id', async (c) => {
	try {
		const techId = c.req.param('id');
		if (!techId) throw new Error('Technology ID required');

		const techData = await c.req.json();
		const now = Date.now();

		const result = await c.env.DB.prepare(`
			UPDATE technology_templates SET
				name = ?, description = ?, category = ?, unlock_requirements = ?, cost = ?, image = ?, updated_at = ?
			WHERE id = ?
		`).bind(
			techData.name,
			techData.description,
			techData.category || null,
			techData.unlock_requirements || null,
			techData.cost || 0,
			techData.image || null,
			now,
			techId,
		).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Technology not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to update technology' }, 500);
	}
});

admin.delete('/api/admin/technologies/:id', async (c) => {
	try {
		const techId = c.req.param('id');
		if (!techId) throw new Error('Technology ID required');

		const result = await c.env.DB.prepare('DELETE FROM technology_templates WHERE id = ?').bind(techId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Technology not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to delete technology' }, 500);
	}
});

// --- Room Technology ---
admin.post('/api/admin/room-technology', async (c) => {
	try {
		const { setRoomTechnology } = await import('../../templates/technology-templates');
		const { room_id, technologies } = await c.req.json() as { room_id: string; technologies: any[] };

		if (!room_id) throw new Error('Room ID required');
		if (!Array.isArray(technologies)) throw new Error('Technologies must be an array');

		await setRoomTechnology(c.env.DB, room_id, technologies);

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to set room technology' }, 500);
	}
});

admin.delete('/api/admin/room-technology/:id', async (c) => {
	try {
		const { deleteRoomTechnology } = await import('../../templates/technology-templates');
		const techId = c.req.param('id');
		if (!techId) throw new Error('Technology ID required');

		const deleted = await deleteRoomTechnology(c.env.DB, techId);

		if (!deleted) {
			return c.json({ error: 'Room technology not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to delete room technology' }, 500);
	}
});

// --- Room Furniture ---
admin.get('/api/admin/furniture', async (c) => {
	try {
		const { getAllRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furniture = await getAllRoomFurniture(c.env);
		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch furniture' }, 500);
	}
});

admin.get('/api/admin/furniture/:id', async (c) => {
	try {
		const { getRoomFurnitureById } = await import('../../templates/room-furniture-templates');
		const furnitureId = c.req.param('id');
		if (!furnitureId) throw new Error('Furniture ID required');

		const furniture = await getRoomFurnitureById(c.env, furnitureId);
		if (!furniture) {
			return c.json({ error: 'Furniture not found' }, 404);
		}

		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch furniture' }, 500);
	}
});

admin.get('/api/admin/rooms/:id/furniture', async (c) => {
	try {
		const { getRoomFurniture } = await import('../../templates/room-furniture-templates');
		const roomId = c.req.param('id');
		if (!roomId) throw new Error('Room ID required');

		const furniture = await getRoomFurniture(c.env, roomId);
		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch room furniture' }, 500);
	}
});

admin.post('/api/admin/furniture', async (c) => {
	try {
		const { createRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furnitureData = await c.req.json();

		const furniture = await createRoomFurniture(c.env, furnitureData);
		return c.json(furniture, 201);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to create furniture' }, 500);
	}
});

admin.put('/api/admin/furniture/:id', async (c) => {
	try {
		const { updateRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furnitureId = c.req.param('id');
		if (!furnitureId) throw new Error('Furniture ID required');

		const updateData = await c.req.json();
		const furniture = await updateRoomFurniture(c.env, furnitureId, updateData);
		return c.json(furniture);
	} catch (err: any) {
		const status = err.message?.includes('not found') ? 404 : 500;
		return c.json({ error: err.message || 'Failed to update furniture' }, status);
	}
});

admin.delete('/api/admin/furniture/:id', async (c) => {
	try {
		const { deleteRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furnitureId = c.req.param('id');
		if (!furnitureId) throw new Error('Furniture ID required');

		const deleted = await deleteRoomFurniture(c.env, furnitureId);
		if (!deleted) {
			return c.json({ error: 'Furniture not found' }, 404);
		}

		return c.json({ success: true });
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to delete furniture' }, 500);
	}
});

export default admin;
