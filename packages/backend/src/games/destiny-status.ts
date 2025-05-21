import { DestinyStatus, DestinyStatusSchema, RoomSchema } from '@stargate/common/types/destiny';

import type { Env } from '../types';

import { insert } from './db-utils';

export async function saveDestinyStatus(env: Env, gameId: string, status: DestinyStatus) {
	await insert('destiny_status', {
		id: status.id,
		gameId,
		name: status.name,
		power: status.power,
		maxPower: status.maxPower,
		shields: status.shields,
		maxShields: status.maxShields,
		hull: status.hull,
		maxHull: status.maxHull,
		raceId: status.raceId,
		crew: JSON.stringify(status.crew),
		location: JSON.stringify(status.location),
		stargate: status.stargate ?? null,
		shield: {
			strength: status.shield.strength,
			max: status.shield.max,
			coverage: status.shield.coverage,
		},
		inventory: JSON.stringify(status.inventory),
		unlockedRooms: JSON.stringify(status.unlockedRooms),
		crewStatus: JSON.stringify(status.crewStatus),
		atmosphere: {
			co2: status.atmosphere.co2,
			o2: status.atmosphere.o2,
			co2Scrubbers: status.atmosphere.co2Scrubbers,
			o2Scrubbers: status.atmosphere.o2Scrubbers,
		},
		weapons: {
			mainGun: status.weapons.mainGun ? 1 : 0,
			turrets: {
				total: status.weapons.turrets.total,
				working: status.weapons.turrets.working,
			},
		},
		shuttles: {
			total: status.shuttles.total,
			working: status.shuttles.working,
			damaged: status.shuttles.damaged,
		},
		notes: status.notes ? JSON.stringify(status.notes) : null,
	}, env.DB);

	// Rooms
	for (const room of status.rooms) {
		insert('rooms', {
			id: room.id,
			game_id: gameId,
			type: room.type,
			created_at: Date.now(),
		}, env.DB);
	}
}

export function normalizeDestinyStatusFromDb(row: any, rooms: any[]): DestinyStatus {
	return DestinyStatusSchema.parse({
		id: row.id,
		name: row.name,
		power: row.power,
		maxPower: row.max_power,
		shields: row.shields,
		maxShields: row.max_shields,
		hull: row.hull,
		maxHull: row.max_hull,
		raceId: row.race_id,
		rooms: rooms.map((r) => RoomSchema.parse({
			id: r.id,
			type: r.type,
			created_at: r.created_at,
		})),
		crew: JSON.parse(row.crew_json),
		location: JSON.parse(row.location_json),
		stargate: row.stargate ?? undefined,
		shield: {
			strength: row.shield_strength,
			max: row.shield_max,
			coverage: row.shield_coverage,
		},
		inventory: JSON.parse(row.inventory_json),
		unlockedRooms: JSON.parse(row.unlocked_rooms_json),
		crewStatus: JSON.parse(row.crew_status_json),
		atmosphere: {
			co2: row.co2,
			o2: row.o2,
			co2Scrubbers: row.co2_scrubbers,
			o2Scrubbers: row.o2_scrubbers,
		},
		weapons: {
			mainGun: !!row.weapons_main_gun,
			turrets: {
				total: row.weapons_turrets_total,
				working: row.weapons_turrets_working,
			},
		},
		shuttles: {
			total: row.shuttles_total,
			working: row.shuttles_working,
			damaged: row.shuttles_damaged,
		},
		notes: row.notes_json ? JSON.parse(row.notes_json) : [],
	});
}

export async function loadDestinyStatus(env: Env, gameId: string): Promise<DestinyStatus | null> {
	const db = env.DB;
	const row = (await db.prepare('SELECT * FROM destiny_status WHERE game_id = ?').bind(gameId).first()) as any;
	if (!row) return null;
	const rooms = (await db.prepare('SELECT * FROM rooms WHERE game_id = ?').bind(gameId).all()).results as any[];
	return normalizeDestinyStatusFromDb(row, rooms);
}

// Cloudflare Worker handler for /api/destiny-status
export async function handleDestinyStatusRequest(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	if (request.method === 'GET') {
		const gameId = url.searchParams.get('gameId');
		if (!gameId) {
			return new Response(JSON.stringify({ error: 'Missing gameId' }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		console.log('handleDestinyStatusRequest', request.method, url.searchParams.get('gameId'));
		const status = await loadDestinyStatus(env, gameId);
		console.log('status', status);
		if (!status) {
			return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
		}
		return new Response(JSON.stringify(status), { status: 200, headers: { 'content-type': 'application/json' } });
	}
	if (request.method === 'POST') {
		const body = await request.json();
		const parse = DestinyStatusSchema.safeParse(body as any);
		if (!parse.success) {
			return new Response(JSON.stringify({ error: 'Invalid body', details: parse.error.errors }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		const gameId = url.searchParams.get('gameId') || (body as any).gameId;
		if (!gameId) {
			return new Response(JSON.stringify({ error: 'Missing gameId' }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		await saveDestinyStatus(env, gameId, parse.data);
		return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
	}
	return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
}
