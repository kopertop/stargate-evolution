import type { D1Database } from '@cloudflare/workers-types';
import { RoomSchema, type Room } from '@stargate/common/models/room';

export async function getAllRooms(db: D1Database): Promise<Room[]> {
	const result = await db.prepare('SELECT * FROM rooms ORDER BY layout_id, id').all();
	return RoomSchema.array().parse(result.results);
}

export async function getRoomById(db: D1Database, id: string): Promise<Room | null> {
	const result = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();
	return result ? RoomSchema.parse(result) : null;
}

export async function getRoomsByType(db: D1Database, type: string): Promise<Room[]> {
	const result = await db.prepare('SELECT * FROM rooms WHERE type = ? ORDER BY name').bind(type).all();
	return RoomSchema.array().parse(result.results);
}

export async function getRoomsByLayoutId(db: D1Database, layout_id: string): Promise<Room[]> {
	const result = await db.prepare('SELECT * FROM rooms WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return RoomSchema.array().parse(result.results);
}
