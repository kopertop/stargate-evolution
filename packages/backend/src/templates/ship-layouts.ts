import type { D1Database } from '@cloudflare/workers-types';

export interface ShipLayout {
	id: string;
	name: string;
	description?: string;
	layout_data: string; // JSON with complete room layout and connections
	created_at: number;
	updated_at: number;
}

export interface DoorTemplate {
	id: string;
	name: string;
	requirements: string; // JSON array
	default_state: string;
	description?: string;
	created_at: number;
	updated_at: number;
}

export async function getAllShipLayouts(db: D1Database): Promise<ShipLayout[]> {
	const result = await db.prepare('SELECT * FROM ship_layouts ORDER BY name').all();
	return result.results as unknown as ShipLayout[];
}

export async function getShipLayoutById(db: D1Database, id: string): Promise<ShipLayout | null> {
	const result = await db.prepare('SELECT * FROM ship_layouts WHERE id = ?').bind(id).first();
	return result as unknown as ShipLayout | null;
}

export async function getAllDoorTemplates(db: D1Database): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates ORDER BY name').all();
	return result.results as unknown as DoorTemplate[];
}

export async function getDoorTemplateById(db: D1Database, id: string): Promise<DoorTemplate | null> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE id = ?').bind(id).first();
	return result as unknown as DoorTemplate | null;
}
