import { Galaxy, StarSystem, Planet, Star } from '@stargate/common/types/galaxy';
import { CreateGameRequestSchema } from '@stargate/common/types/game-requests';
import { Person } from '@stargate/common/types/people';
import { Ship, Room, Technology, Race } from '@stargate/common/types/ship';
import { Stargate, CheveronSymbol } from '@stargate/common/types/stargate';
import { ulid } from 'ulid';

import type { Env } from '../types';

export interface GameScaffoldData {
	galaxies: Galaxy[];
	starSystems: StarSystem[];
	stars: Star[];
	planets: Planet[];
	stargates: Stargate[];
	chevrons: CheveronSymbol[];
	technology: Technology[];
	races: Race[];
	ships: Ship[];
	rooms: Room[];
	people: Person[];
}

/**
 * Generate the default game objects
 *
 * @returns Scaffolded game data
 */
export function initGame(userId: string): GameScaffoldData {
	// Generate ULIDs for all entities
	const sysEarthId = ulid();
	const sysIcarusId = ulid();
	const sysDestinyId = ulid();
	const earthId = ulid();
	const icarusId = ulid();
	const destinyShipId = ulid();
	const destinyStargateId = ulid();
	const destinyBridgeId = ulid();
	const destinyStargateRoomId = ulid();
	const destinyEngineId = ulid();
	const destinyMedbayId = ulid();
	const ancientsRaceId = ulid();
	const humanRaceId = ulid();

	const chevrons: CheveronSymbol[] = [
		{ id: ulid(), symbol: 'A', description: 'Chevron 1', image: undefined },
		{ id: ulid(), symbol: 'B', description: 'Chevron 2', image: undefined },
		{ id: ulid(), symbol: 'C', description: 'Chevron 3', image: undefined },
		{ id: ulid(), symbol: 'D', description: 'Chevron 4', image: undefined },
		{ id: ulid(), symbol: 'E', description: 'Chevron 5', image: undefined },
		{ id: ulid(), symbol: 'F', description: 'Chevron 6', image: undefined },
	];

	const stargates: Stargate[] = [
		{
			id: destinyStargateId,
			address: chevrons.slice(0, 6),
			type: 'master',
			locationId: destinyStargateRoomId,
			connectedTo: [],
		},
	];

	const planets: Planet[] = [
		{ id: earthId, name: 'Earth', type: 'terrestrial', resources: [], inhabitants: [], stargate: undefined },
		{ id: icarusId, name: 'Icarus', type: 'terrestrial', resources: [], inhabitants: [], stargate: undefined },
	];

	const stars: Star[] = [
		{ id: ulid(), name: 'Sol', type: 'yellow dwarf', description: 'The Sun.', image: undefined, radius: 696340, mass: 1.989e30, temperature: 5778, luminosity: 1.0, age: 4.6e9 },
		{ id: ulid(), name: 'Icarus', type: 'yellow dwarf', description: 'Star powering Icarus planet.', image: undefined, radius: 700000, mass: 2.0e30, temperature: 6000, luminosity: 1.2, age: 5.0e9 },
		{ id: ulid(), name: 'Unknown', type: 'yellow dwarf', description: 'Star near Destiny.', image: undefined, radius: 700000, mass: 2.0e30, temperature: 6000, luminosity: 1.2, age: 5.0e9 },
	];

	const starSystems: StarSystem[] = [
		{ id: sysEarthId, name: 'Sol System', position: { x: 0, y: 0 }, planets: [planets[0]], stargates: [], description: 'The home system of Earth.', image: undefined, stars: [stars[0]] },
		{ id: sysIcarusId, name: 'Icarus System', position: { x: 100, y: 200 }, planets: [planets[1]], stargates: [], description: 'Remote system with Icarus planet.', image: undefined, stars: [stars[1]] },
		{ id: sysDestinyId, name: 'Destiny System', position: { x: 500, y: 500 }, planets: [], stargates: [], description: 'System where Destiny is found.', image: undefined, stars: [stars[2]] },
	];

	const galaxies: Galaxy[] = [
		{ id: ulid(), name: 'Milky Way', starSystems: [starSystems[0], starSystems[1]] },
		{ id: ulid(), name: 'Destiny Galaxy', starSystems: [starSystems[2]] },
	];

	const technology: Technology[] = [
		{ id: ulid(), name: 'Stargate', description: 'Allows travel via the stargate network.', unlocked: true, cost: 0, image: undefined },
	];

	const rooms: Room[] = [
		{ id: destinyBridgeId, type: 'bridge', assigned: [], technology: [], shipId: destinyShipId },
		{ id: destinyStargateRoomId, type: 'stargate', assigned: [], technology: [], shipId: destinyShipId },
		{ id: destinyEngineId, type: 'engine', assigned: [], technology: [], shipId: destinyShipId },
		{ id: destinyMedbayId, type: 'medbay', assigned: [], technology: [], shipId: destinyShipId },
	];

	const ships: Ship[] = [
		{ id: destinyShipId, name: 'Destiny', power: 1000, maxPower: 1000, shields: 500, maxShields: 500, hull: 1000, maxHull: 1000, raceId: ancientsRaceId, rooms: [], crew: [], location: { systemId: sysDestinyId }, stargate: destinyStargateId },
	];

	const races: Race[] = [
		{ id: ancientsRaceId, name: 'Ancients', technology: [], ships: [] },
		{ id: humanRaceId, name: 'Human', technology: [], ships: [] },
	];

	const people: Person[] = [
		{ id: ulid(), name: 'Dr. Nicholas Rush', raceId: humanRaceId, role: 'lead scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Brilliant but secretive scientist.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Eli Wallace', raceId: humanRaceId, role: 'jr scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Exceptionally gifted with mathematics and computers.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Col. Everett Young', raceId: humanRaceId, role: 'commanding officer', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Leader of the Destiny expedition.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Lt. Matthew Scott', raceId: humanRaceId, role: '2nd in command', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Young, resourceful, and loyal officer.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'MSgt. Ronald Greer', raceId: humanRaceId, role: 'security', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Tough, loyal, and resourceful marine.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Chloe Armstrong', raceId: humanRaceId, role: 'civilian', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Daughter of a U.S. Senator, becomes a key member of the crew.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Lt. Tamara Johansen', raceId: humanRaceId, role: 'medic', location: { roomId: destinyMedbayId, shipId: destinyShipId }, description: 'Field medic and trusted crew member.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Dr. Dale Volker', raceId: humanRaceId, role: 'scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Astrophysicist, part of the science team.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Dr. Adam Brody', raceId: humanRaceId, role: 'scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Engineer and science team member.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Dr. Lisa Park', raceId: humanRaceId, role: 'scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Talented scientist and engineer.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Lt. Vanessa James', raceId: humanRaceId, role: 'security', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Security team member.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Dr. Jeremy Franklin', raceId: humanRaceId, role: 'scientist', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Brilliant but troubled scientist.', image: undefined, conditions: [] },
		{ id: ulid(), name: 'Sgt. Hunter Riley', raceId: humanRaceId, role: 'technician', location: { roomId: destinyBridgeId, shipId: destinyShipId }, description: 'Technician and support crew.', image: undefined, conditions: [] },
	];

	return {
		galaxies,
		starSystems,
		stars,
		planets,
		stargates,
		chevrons,
		technology,
		races,
		ships,
		rooms,
		people,
	};
}

/**
 * Save the game data to the DB
 *
 * @param game Game data to save
 * @param env The Wrangler Enviornment object
 * @returns The game ID
 */
async function saveGame(game: GameScaffoldData, env: Env, userId: string): Promise<string> {
	const gameId = ulid();
	const now = Date.now();
	const db = env.DB;
	const statements: D1PreparedStatement[] = [];

	// Ensure user exists in users table (minimal upsert)
	await db.prepare(
		'INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
	).bind(
		userId,
		`${userId}@unknown`,
		'Unknown User',
		now,
		now,
	).run();

	// Insert game
	statements.push(
		db.prepare(
			'INSERT INTO games (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
		).bind(
			gameId,
			userId,
			game.galaxies[0]?.name || 'New Game',
			now,
			now,
		),
	);

	// Galaxies
	for (const galaxy of game.galaxies) {
		statements.push(
			db.prepare(
				'INSERT INTO galaxies (id, game_id, name, created_at) VALUES (?, ?, ?, ?)',
			).bind(
				galaxy.id,
				gameId,
				galaxy.name,
				now,
			),
		);
	}

	// Star Systems
	for (const system of game.starSystems) {
		const parentGalaxy = game.galaxies.find(g => g.starSystems.some(s => s.id === system.id));
		statements.push(
			db.prepare(
				'INSERT INTO star_systems (id, game_id, galaxy_id, name, x, y, description, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			).bind(
				system.id,
				gameId,
				parentGalaxy?.id ?? null,
				system.name,
				system.position.x,
				system.position.y,
				system.description ?? null,
				system.image ?? null,
				now,
			),
		);
	}

	// Stars
	for (const star of game.stars) {
		const parentSystem = game.starSystems.find(s => s.stars.some(st => st.id === star.id));
		statements.push(
			db.prepare(
				'INSERT INTO stars (id, game_id, star_system_id, name, type, description, image, radius, mass, temperature, luminosity, age, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			).bind(
				star.id,
				gameId,
				parentSystem?.id ?? null,
				star.name,
				star.type,
				star.description ?? null,
				star.image ?? null,
				star.radius,
				star.mass,
				star.temperature,
				star.luminosity,
				star.age,
				now,
			),
		);
	}

	// Planets
	for (const planet of game.planets) {
		statements.push(
			db.prepare(
				'INSERT INTO planets (id, game_id, star_system_id, name, type, stargate_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			).bind(
				planet.id,
				gameId,
				game.starSystems.find(s => s.planets.some(p => p.id === planet.id))?.id ?? null,
				planet.name,
				planet.type,
				planet.stargate ?? null,
				now,
			),
		);
	}

	// Stargates
	for (const stargate of game.stargates) {
		statements.push(
			db.prepare(
				'INSERT INTO stargates (id, game_id, location_type, location_id, type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			).bind(
				stargate.id,
				gameId,
				'room', // or 'planet', 'ship', etc. (adjust as needed)
				stargate.locationId,
				stargate.type,
				now,
			),
		);
	}

	// Chevrons (address for each stargate)
	for (const stargate of game.stargates) {
		if (stargate.address) {
			stargate.address.forEach((chevron, idx) => {
				statements.push(
					db.prepare(
						'INSERT INTO chevrons (id, game_id, stargate_id, symbol, description, image, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
					).bind(
						chevron.id,
						gameId,
						stargate.id,
						chevron.symbol,
						chevron.description ?? null,
						chevron.image ?? null,
						idx,
						now,
					),
				);
			});
		}
	}

	// Technology
	for (const tech of game.technology) {
		statements.push(
			db.prepare(
				'INSERT INTO technology (id, game_id, name, description, unlocked, cost, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			).bind(
				tech.id,
				gameId,
				tech.name,
				tech.description,
				tech.unlocked ? 1 : 0,
				tech.cost,
				tech.image ?? null,
				now,
			),
		);
	}

	// Races
	for (const race of game.races) {
		statements.push(
			db.prepare(
				'INSERT INTO races (id, game_id, name, created_at) VALUES (?, ?, ?, ?)',
			).bind(
				race.id,
				gameId,
				race.name,
				now,
			),
		);
	}

	// Ships
	for (const ship of game.ships) {
		statements.push(
			db.prepare(
				'INSERT INTO ships (id, game_id, name, power, max_power, shields, max_shields, hull, max_hull, race_id, stargate_id, location_system_id, location_planet_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			).bind(
				ship.id,
				gameId,
				ship.name,
				ship.power,
				ship.maxPower,
				ship.shields,
				ship.maxShields,
				ship.hull,
				ship.maxHull,
				ship.raceId,
				ship.stargate ?? null,
				ship.location.systemId,
				ship.location.planetId ?? null,
				now,
			),
		);
	}

	// Rooms
	for (const room of game.rooms) {
		statements.push(
			db.prepare(
				'INSERT INTO rooms (id, game_id, ship_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
			).bind(
				room.id,
				gameId,
				room.shipId,
				room.type,
				now,
			),
		);
	}

	// People
	for (const person of game.people) {
		statements.push(
			db.prepare(
				'INSERT INTO people (id, game_id, name, race_id, role, location_room_id, location_planet_id, location_ship_id, description, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			).bind(
				person.id,
				gameId,
				person.name,
				person.raceId,
				person.role,
				person.location.roomId ?? null,
				person.location.planetId ?? null,
				person.location.shipId ?? null,
				person.description ?? null,
				person.image ?? null,
				now,
			),
		);
	}

	await db.batch(statements);
	return gameId;
}

export async function handleCreateGameRequest(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json();
		const parsed = CreateGameRequestSchema.safeParse(body);
		if (!parsed.success) {
			return new Response(JSON.stringify({ error: 'Invalid request body', details: parsed.error.errors }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		const { userId } = parsed.data;
		const game = initGame(userId);
		// Save all game objects to the database
		await saveGame(game, env, userId);
		return new Response(JSON.stringify(game), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}

export default handleCreateGameRequest;
