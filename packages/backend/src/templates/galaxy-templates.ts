import type { D1Database } from '@cloudflare/workers-types';
import { GalaxySchema, type Galaxy } from '@stargate/common/src/models/galaxy';

export async function getAllGalaxyTemplates(db: D1Database): Promise<Galaxy[]> {
	const result = await db.prepare('SELECT * FROM galaxy_templates ORDER BY name').all();
	return GalaxySchema.array().parse(result.results);
}

export async function getGalaxyTemplateById(db: D1Database, id: string): Promise<Galaxy | null> {
	const result = await db.prepare('SELECT * FROM galaxy_templates WHERE id = ?').bind(id).first();
	return result ? GalaxySchema.parse(result) : null;
}
