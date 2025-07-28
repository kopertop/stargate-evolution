import type { D1Database } from '@cloudflare/workers-types';
import { StarSystemSchema, type StarSystem } from '@stargate/common/models/star-system';

export async function getAllStarSystemTemplates(db: D1Database): Promise<StarSystem[]> {
	const result = await db.prepare('SELECT * FROM star_system_templates ORDER BY name').all();
	return StarSystemSchema.array().parse(result.results);
}

export async function getStarSystemTemplateById(db: D1Database, id: string): Promise<StarSystem | null> {
	const result = await db.prepare('SELECT * FROM star_system_templates WHERE id = ?').bind(id).first();
	return result ? StarSystemSchema.parse(result) : null;
}

export async function getStarSystemsByGalaxyId(db: D1Database, galaxy_id: string): Promise<StarSystem[]> {
	const result = await db.prepare('SELECT * FROM star_system_templates WHERE galaxy_id = ? ORDER BY name').bind(galaxy_id).all();
	return StarSystemSchema.array().parse(result.results);
}
