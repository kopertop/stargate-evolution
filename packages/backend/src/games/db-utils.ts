import type { D1Database } from '@cloudflare/workers-types';

export function insert(table: string, obj: Record<string, any>, db: D1Database) {
	const keys = Object.keys(obj);
	const placeholders = keys.map(() => '?').join(', ');
	const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
	return db.prepare(sql).bind(...keys.map(k => obj[k]));
}
