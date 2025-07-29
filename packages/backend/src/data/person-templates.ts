import type { D1Database } from '@cloudflare/workers-types';
import { PersonTemplateSchema, type PersonTemplate } from '@stargate/common/models/person-template';
import { RaceTemplateSchema, type RaceTemplate } from '@stargate/common/models/race-template';

export async function getAllPersonTemplates(db: D1Database): Promise<PersonTemplate[]> {
	const result = await db.prepare('SELECT * FROM person_templates ORDER BY id').all();
	return PersonTemplateSchema.array().parse(result.results);
}

export async function getPersonTemplateById(db: D1Database, id: string): Promise<PersonTemplate | null> {
	const result = await db.prepare('SELECT * FROM person_templates WHERE id = ?').bind(id).first();
	return result ? PersonTemplateSchema.parse(result) : null;
}

export async function getPersonTemplatesByRole(db: D1Database, role: string): Promise<PersonTemplate[]> {
	const result = await db.prepare('SELECT * FROM person_templates WHERE role = ? ORDER BY name').bind(role).all();
	return PersonTemplateSchema.array().parse(result.results);
}

export async function getAllRaceTemplates(db: D1Database): Promise<RaceTemplate[]> {
	const result = await db.prepare('SELECT * FROM race_templates ORDER BY name').all();
	return RaceTemplateSchema.array().parse(result.results);
}

export async function getRaceTemplateById(db: D1Database, id: string): Promise<RaceTemplate | null> {
	const result = await db.prepare('SELECT * FROM race_templates WHERE id = ?').bind(id).first();
	return result ? RaceTemplateSchema.parse(result) : null;
}
