import type { D1Database } from '@cloudflare/workers-types';

export interface RoomTemplate {
	id: string;
	layout_id: string;
	type: string;
	name: string;
	description?: string;
	position_x: number;
	position_y: number;
	floor: number;
	initial_state: string; // JSON
	size_factor: number;
	technology?: string;
	image?: string;
	base_exploration_time?: number;
	default_status?: string;
	connection_north?: string;
	connection_south?: string;
	connection_east?: string;
	connection_west?: string;
	created_at: number;
	updated_at: number;
}

export interface DoorTemplate {
	id: string;
	layout_id: string;
	from_room_id: string;
	to_room_id: string;
	requirements: string; // JSON array
	initial_state: string;
	description?: string;
	created_at: number;
	updated_at: number;
}

export interface ShipLayout {
	layout_id: string;
	rooms: RoomTemplate[];
	doors: DoorTemplate[];
}

export async function getAllLayoutIds(db: D1Database): Promise<string[]> {
	const result = await db.prepare('SELECT DISTINCT layout_id FROM room_templates ORDER BY layout_id').all();
	return result.results.map((row: any) => row.layout_id);
}

export async function getRoomsByLayoutId(db: D1Database, layout_id: string): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return result.results as unknown as RoomTemplate[];
}

export async function getDoorsByLayoutId(db: D1Database, layout_id: string): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return result.results as unknown as DoorTemplate[];
}

export async function getShipLayoutById(db: D1Database, layout_id: string): Promise<ShipLayout | null> {
	const rooms = await getRoomsByLayoutId(db, layout_id);
	if (!rooms.length) return null;
	const doors = await getDoorsByLayoutId(db, layout_id);
	return { layout_id, rooms, doors };
}

export async function getRoomById(db: D1Database, id: string): Promise<RoomTemplate | null> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE id = ?').bind(id).first();
	return result as unknown as RoomTemplate | null;
}

export async function getDoorById(db: D1Database, id: string): Promise<DoorTemplate | null> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE id = ?').bind(id).first();
	return result as unknown as DoorTemplate | null;
}
