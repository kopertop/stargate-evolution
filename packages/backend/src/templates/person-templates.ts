import type { D1Database } from '@cloudflare/workers-types';

export interface PersonTemplate {
	id: string;
	name: string;
	role: string;
	race_template_id?: string;
	skills: string; // JSON array
	description?: string;
	image?: string;
	default_location?: string; // JSON
	created_at: number;
	updated_at: number;
}

export interface RaceTemplate {
	id: string;
	name: string;
	description?: string;
	default_technology: string; // JSON array
	default_ships: string; // JSON array
	created_at: number;
	updated_at: number;
}

export async function getAllPersonTemplates(db: D1Database): Promise<PersonTemplate[]> {
	const result = await db.prepare('SELECT * FROM person_templates ORDER BY role, name').all();
	return result.results as unknown as PersonTemplate[];
}

export async function getPersonTemplateById(db: D1Database, id: string): Promise<PersonTemplate | null> {
	const result = await db.prepare('SELECT * FROM person_templates WHERE id = ?').bind(id).first();
	return result as unknown as PersonTemplate | null;
}

export async function getPersonTemplatesByRole(db: D1Database, role: string): Promise<PersonTemplate[]> {
	const result = await db.prepare('SELECT * FROM person_templates WHERE role = ? ORDER BY name').bind(role).all();
	return result.results as unknown as PersonTemplate[];
}

export async function getAllRaceTemplates(db: D1Database): Promise<RaceTemplate[]> {
	const result = await db.prepare('SELECT * FROM race_templates ORDER BY name').all();
	return result.results as unknown as RaceTemplate[];
}

export async function getRaceTemplateById(db: D1Database, id: string): Promise<RaceTemplate | null> {
	const result = await db.prepare('SELECT * FROM race_templates WHERE id = ?').bind(id).first();
	return result as unknown as RaceTemplate | null;
}
