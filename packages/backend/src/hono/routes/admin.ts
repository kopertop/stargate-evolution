import { RoomTemplateSchema } from '@stargate/common/zod-templates';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';

import type { Env, User } from '../../types';
import { verifyAdmin } from '../middleware/admin';
import { verifyJwt } from '../middleware/auth';
// Import the static schema
import tableSchema from '../table-schema.json';

const CALCULATED_ROWS_FOR_TABLE = {
	room_templates: ['width', 'height'],
};

const admin = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Apply CORS and auth middleware
admin.use('*', cors());
admin.use('*', verifyJwt, verifyAdmin);

admin.get('/health', (c) => {
	return c.json({ ok: true, message: 'Admin route is healthy' });
});

// --- User Management ---
admin.get('/users', async (c) => {
	try {
		const users = await c.env.DB.prepare('SELECT id, email, name, image, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC').all();
		return c.json(users.results);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch users' }, 500);
	}
});

admin.patch('/users/:id', async (c) => {
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
admin.get('/doors', async (c) => {
	try {
		const { getAllDoorTemplates } = await import('../../templates/door-templates');
		const doors = await getAllDoorTemplates(c.env.DB);
		return c.json(doors);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch door templates' }, 500);
	}
});

admin.get('/doors/:id', async (c) => {
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

admin.post('/doors', async (c) => {
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

admin.put('/doors/:id', async (c) => {
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

admin.delete('/doors/:id', async (c) => {
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
admin.post('/rooms', async (c) => {
	const body = await c.req.json();
	console.log('Create Room', body);
	try {
		RoomTemplateSchema.parse(body);
	} catch (error) {
		console.error('Zod validation error:', error);
		return c.json({
			error: 'Invalid Room Template',
			details: error instanceof Error ? error.message : String(error),
			issues: error instanceof ZodError ? error.issues : [],
			errors: error instanceof ZodError ? error.errors : [],
		}, 400);
	}
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'INSERT INTO room_templates (id, layout_id, type, name, description, startX, endX, startY, endY, floor, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
				body.image,
				Date.now(),
				Date.now(),
			)
			.run();
		return c.json({ message: 'Room template created successfully' }, 201);
	} catch (error) {
		console.error('Failed to create room template:', error);
		return c.json({
			error: 'Failed to create room template',
			details: error instanceof Error ? error.message : String(error),
		}, 500);
	}
});

admin.put('/rooms/:id', async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	// TODO: Add validation
	try {
		await c.env.DB.prepare(
			'UPDATE room_templates SET layout_id = ?, type = ?, name = ?, description = ?, startX = ?, endX = ?, startY = ?, endY = ?, floor = ?, image = ?, updated_at = ? WHERE id = ?',
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

admin.delete('/rooms/:id', async (c) => {
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
admin.get('/characters', async (c) => {
	try {
		const { getAllCharacterTemplates } = await import('../../templates/character-templates');
		const characters = await getAllCharacterTemplates(c.env.DB);
		return c.json(characters);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch characters' }, 500);
	}
});

admin.get('/characters/:id', async (c) => {
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

admin.post('/characters', async (c) => {
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

admin.put('/characters/:id', async (c) => {
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

admin.delete('/characters/:id', async (c) => {
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

admin.post('/characters/:id/experience', async (c) => {
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
admin.post('/technologies', async (c) => {
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

admin.put('/technologies/:id', async (c) => {
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

admin.delete('/technologies/:id', async (c) => {
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
admin.post('/room-technology', async (c) => {
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

admin.delete('/room-technology/:id', async (c) => {
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
admin.get('/furniture', async (c) => {
	try {
		const { getAllRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furniture = await getAllRoomFurniture(c.env);
		return c.json(furniture);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to fetch furniture' }, 500);
	}
});

admin.get('/furniture/:id', async (c) => {
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

admin.get('/rooms/:id/furniture', async (c) => {
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

admin.post('/furniture', async (c) => {
	try {
		const { createRoomFurniture } = await import('../../templates/room-furniture-templates');
		const furnitureData = await c.req.json();

		const furniture = await createRoomFurniture(c.env, furnitureData);
		return c.json(furniture, 201);
	} catch (err: any) {
		return c.json({ error: err.message || 'Failed to create furniture' }, 500);
	}
});

admin.put('/furniture/:id', async (c) => {
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

admin.delete('/furniture/:id', async (c) => {
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

// SQL Debug Endpoints - ADMIN ONLY
admin.post('/sql/query', async (c) => {
	try {
		const { query, params = [] } = await c.req.json();

		if (!query || typeof query !== 'string') {
			return c.json({ error: 'Query is required and must be a string' }, 400);
		}

		// Log the query for security audit
		const user = c.get('user');
		console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) executing query:`, query);
		console.log('[ADMIN-SQL] Query params:', params);

		// Determine if this is a read or write operation
		const trimmedQuery = query.trim().toLowerCase();
		const isReadOnly = trimmedQuery.startsWith('select') ||
						  trimmedQuery.startsWith('with') ||
						  trimmedQuery.startsWith('pragma');

		let result;
		let affectedRows = 0;

		if (isReadOnly) {
			// For read operations, use .all() to get all results
			let queryResult;
			if (params && params.length > 0) {
				queryResult = await c.env.DB.prepare(query).bind(...params).all();
			} else {
				queryResult = await c.env.DB.prepare(query).all();
			}
			result = queryResult.results || [];
		} else {
			// For write operations, use .run() and get info about changes
			let runResult;
			if (params && params.length > 0) {
				runResult = await c.env.DB.prepare(query).bind(...params).run();
			} else {
				runResult = await c.env.DB.prepare(query).run();
			}
			affectedRows = runResult.meta?.changes || 0;
			result = {
				success: true,
				changes: runResult.meta?.changes || 0,
				lastInsertRowid: runResult.meta?.last_row_id,
			};
		}

		console.log(`[ADMIN-SQL] Query executed successfully. Affected rows: ${affectedRows}`);

		return c.json({
			success: true,
			isReadOnly,
			result,
			affectedRows,
			executedAt: new Date().toISOString(),
			executedBy: user.email,
		});

	} catch (error) {
		console.error('[ADMIN-SQL] Query execution failed:', error);
		return c.json({
			error: 'Query execution failed',
			details: error instanceof Error ? error.message : 'Unknown error',
			executedAt: new Date().toISOString(),
		}, 500);
	}
});

// Get database schema information
admin.get('/sql/schema', async (c) => {
	const user = c.get('user');
	console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) requesting database schema`);

	const tables = await Promise.all(tableSchema.tables.map(async (table) => {
		console.log(`[ADMIN-SQL] Table ${table.name}`);
		const rowCount = await c.env.DB.prepare(`SELECT count(*) as rowCount FROM ${table.name}`).first();
		return {
			...table,
			rowCount: Number(rowCount?.rowCount) || 0,
		};
	}));

	// Return the pre-generated schema
	return c.json({
		tables,
		requestedBy: user.email,
	});
});

// Get table data with pagination
admin.get('/sql/table/:tableName', async (c) => {
	const user = c.get('user');
	const tableName = c.req.param('tableName');
	const page = parseInt(c.req.query('page') || '1');
	const limit = parseInt(c.req.query('limit') || '100');
	const offset = (page - 1) * limit;

	console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) requesting table data: ${tableName}`);

	// Find table in schema to validate it exists
	const tableExists = tableSchema.tables.find(t => t.name === tableName);
	if (!tableExists) {
		return c.json({ error: 'Table not found' }, 404);
	}

	// Get total count
	const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first();
	const totalRows = Number(countResult?.count) || 0;

	// Get paginated data
	const dataResult = await c.env.DB.prepare(`
		SELECT * FROM ${tableName}
		ORDER BY rowid
		LIMIT ? OFFSET ?
	`).bind(limit, offset).all();

	const data = dataResult.results || [];

	// Get column info from schema
	const columns = tableExists.columns || [];

	return c.json({
		tableName,
		columns,
		data,
		pagination: {
			page,
			limit,
			totalRows,
			totalPages: Math.ceil(totalRows / limit),
			hasNext: page * limit < totalRows,
			hasPrev: page > 1,
		},
		generatedAt: new Date().toISOString(),
		requestedBy: user.email,
	});
});

// Get recent query history (for audit purposes)
admin.get('/sql/history', async (c) => {
	try {
		// This would ideally be stored in a separate audit log table
		// For now, we'll return a placeholder indicating this feature could be implemented
		const user = c.get('user');
		console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) requesting query history`);

		return c.json({
			message: 'Query history feature not yet implemented',
			note: 'All SQL queries are logged to the server console for security audit purposes',
			requestedBy: user.email,
			requestedAt: new Date().toISOString(),
		});

	} catch (error) {
		console.error('[ADMIN-SQL] History fetch failed:', error);
		return c.json({
			error: 'Failed to fetch query history',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Export table data as JSON
admin.get('/sql/export/:tableName', async (c) => {
	try {
		const user = c.get('user');
		const tableName = c.req.param('tableName');

		console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) exporting table: ${tableName}`);

		// Validate table exists in schema
		const tableExists = tableSchema.tables.find(t => t.name === tableName);
		if (!tableExists) {
			return c.json({ error: 'Table not found' }, 404);
		}

		// Export all data from the table
		const result = await c.env.DB.prepare(`SELECT * FROM ${tableName}`).all();
		const data = result.results || [];

		console.log(`[ADMIN-SQL] Exported ${data.length} rows from table ${tableName}`);

		return c.json(data);

	} catch (error) {
		console.error('[ADMIN-SQL] Export failed:', error);
		return c.json({
			error: 'Table export failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Import table data from JSON
admin.post('/sql/import/:tableName', async (c) => {
	try {
		const user = c.get('user');
		const tableName = c.req.param('tableName');
		const { data, mode = 'replace' } = await c.req.json();

		console.log(`[ADMIN-SQL] User ${user.email} (${user.id}) importing to table: ${tableName}, mode: ${mode}`);

		// Validate table exists in schema
		const tableExists = tableSchema.tables.find(t => t.name === tableName);
		if (!tableExists) {
			return c.json({ error: 'Table not found' }, 404);
		}

		// Validate data is an array
		if (!Array.isArray(data)) {
			return c.json({ error: 'Data must be an array of objects' }, 400);
		}

		if (data.length === 0) {
			return c.json({ error: 'Data array cannot be empty' }, 400);
		}

		let rowsAffected = 0;

		// Get column names from the first data object
		const firstRow = data[0];
		if (typeof firstRow !== 'object' || firstRow === null) {
			return c.json({ error: 'Data must contain objects' }, 400);
		}

		// Exclude auto-calculated columns
		const columns = Object.keys(firstRow).filter(
			col => !CALCULATED_ROWS_FOR_TABLE[tableName as keyof typeof CALCULATED_ROWS_FOR_TABLE]?.includes(col),
		);
		const placeholders = columns.map(() => '?').join(', ');
		const columnList = columns.join(', ');

		// Prepare all statements for batch execution
		const statements: any[] = [];

		// If replace mode, add delete statement
		if (mode === 'replace') {
			statements.push(c.env.DB.prepare(`DELETE FROM ${tableName}`));
		}

		// Add insert statements
		const insertQuery = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`;
		for (const row of data) {
			const values = columns.map(col => {
				const value = row[col];
				if (typeof value === 'object' && value !== null) {
					return JSON.stringify(value);
				}
				return value;
			});
			statements.push(c.env.DB.prepare(insertQuery).bind(...values));
		}

		// Execute all statements in a batch
		const results = await c.env.DB.batch(statements);

		// Count affected rows
		if (mode === 'replace') {
			rowsAffected = results.length - 1; // Subtract 1 for delete statement
		} else {
			rowsAffected = results.length;
		}

		console.log(`[ADMIN-SQL] Successfully imported ${rowsAffected} rows to table ${tableName}`);

		return c.json({
			success: true,
			message: `Successfully ${mode === 'replace' ? 'replaced' : 'appended'} data in table ${tableName}`,
			rowsAffected,
			importedAt: new Date().toISOString(),
			importedBy: user.email,
		});



	} catch (error) {
		console.error('[ADMIN-SQL] Import failed:', error);
		return c.json({
			error: 'Table import failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Export all template data as comprehensive JSON
admin.get('/templates/export', async (c) => {
	try {
		const user = c.get('user');
		console.log(`[ADMIN-TEMPLATES] User ${user.email} (${user.id}) exporting all template data`);

		// Define the template tables in dependency order
		const templateTables = [
			'race_templates',
			'technology_templates',
			'galaxy_templates',
			'star_system_templates',
			'planet_templates',
			'room_templates',
			'door_templates',
			'room_furniture',
			'room_technology',
			'person_templates',
		];

		const exportData: Record<string, any[]> = {};

		// Export each table
		for (const tableName of templateTables) {
			try {
				const result = await c.env.DB.prepare(`SELECT * FROM ${tableName}`).all();
				exportData[tableName] = result.results || [];
				console.log(`[ADMIN-TEMPLATES] Exported ${exportData[tableName].length} records from ${tableName}`);
			} catch (tableError) {
				console.warn(`[ADMIN-TEMPLATES] Failed to export ${tableName}:`, tableError);
				exportData[tableName] = [];
			}
		}

		// Add metadata
		const metadata = {
			exported_at: new Date().toISOString(),
			exported_by: user.email,
			version: '1.0',
			total_tables: templateTables.length,
			total_records: Object.values(exportData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
		};

		console.log(`[ADMIN-TEMPLATES] Export complete: ${metadata.total_records} total records across ${templateTables.length} tables`);

		return c.json({
			_metadata: metadata,
			data: exportData,
		});

	} catch (error) {
		console.error('[ADMIN-TEMPLATES] Export failed:', error);
		return c.json({
			error: 'Template export failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

// Import all template data from comprehensive JSON
admin.post('/templates/import', async (c) => {
	try {
		const user = c.get('user');
		const importData = await c.req.json();

		console.log(`[ADMIN-TEMPLATES] User ${user.email} (${user.id}) importing template data`);

		// Validate import data structure
		if (!importData || typeof importData !== 'object') {
			return c.json({ error: 'Invalid import data format' }, 400);
		}

		// Define tables in dependency order (dependencies first)
		const templateTables = [
			'race_templates',
			'technology_templates',
			'galaxy_templates',
			'star_system_templates',
			'planet_templates',
			'room_templates',
			'door_templates',
			'room_furniture',
			'room_technology',
			'person_templates',
		];

		let totalImported = 0;
		const importResults: Record<string, { imported: number; errors: number }> = {};

		// Clear existing data in reverse dependency order
		console.log('[ADMIN-TEMPLATES] Clearing existing template data...');
		for (const tableName of [...templateTables].reverse()) {
			try {
				await c.env.DB.prepare(`DELETE FROM ${tableName}`).run();
				console.log(`[ADMIN-TEMPLATES] Cleared ${tableName}`);
			} catch (clearError) {
				console.warn(`[ADMIN-TEMPLATES] Failed to clear ${tableName}:`, clearError);
			}
		}

		// Import data in dependency order
		for (const tableName of templateTables) {
			importResults[tableName] = { imported: 0, errors: 0 };

			const tableData = importData.data[tableName];
			if (!Array.isArray(tableData) || tableData.length === 0) {
				console.log(`[ADMIN-TEMPLATES] No data to import for ${tableName}`);
				continue;
			}

			console.log(`[ADMIN-TEMPLATES] Importing ${tableData.length} records to ${tableName}`);

			// Get table columns from schema
			const tableInfo = await c.env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
			const columns = tableInfo.results?.map((col: any) => col.name) || [];
			const calculatedColumns = CALCULATED_ROWS_FOR_TABLE[tableName as keyof typeof CALCULATED_ROWS_FOR_TABLE] || [];
			const insertableColumns = columns.filter(col => !calculatedColumns.includes(col));

			for (const record of tableData) {
				try {
					// Filter record to only include insertable columns
					const filteredRecord: Record<string, any> = {};
					for (const col of insertableColumns) {
						if (Object.prototype.hasOwnProperty.call(record, col)) {
							filteredRecord[col] = record[col];
						}
					}

					// Build INSERT statement
					const columnNames = Object.keys(filteredRecord);
					const placeholders = columnNames.map(() => '?').join(', ');
					const values = columnNames.map(col => filteredRecord[col]);

					const sql = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;
					await c.env.DB.prepare(sql).bind(...values).run();

					importResults[tableName].imported++;
					totalImported++;

				} catch (recordError) {
					console.error(`[ADMIN-TEMPLATES] Failed to import record to ${tableName}:`, recordError);
					importResults[tableName].errors++;
				}
			}

			console.log(`[ADMIN-TEMPLATES] ${tableName}: ${importResults[tableName].imported} imported, ${importResults[tableName].errors} errors`);
		}

		console.log(`[ADMIN-TEMPLATES] Import complete: ${totalImported} total records imported`);

		return c.json({
			success: true,
			message: 'Template data imported successfully',
			totalImported,
			results: importResults,
			metadata: importData._metadata || null,
		});

	} catch (error) {
		console.error('[ADMIN-TEMPLATES] Import failed:', error);
		return c.json({
			error: 'Template import failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, 500);
	}
});

export default admin;
