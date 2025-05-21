import { DestinyStatus } from '@stargate/common/types/destiny';
import { Galaxy, StarSystem, Planet, Star } from '@stargate/common/types/galaxy';
import { CreateGameRequestSchema } from '@stargate/common/types/game-requests';
import { Person } from '@stargate/common/types/people';
import { Ship, Technology, Race } from '@stargate/common/types/ship';
import { Stargate, CheveronSymbol } from '@stargate/common/types/stargate';
import { ulid } from 'ulid';

import type { Env } from '../types';

import { insert } from './db-utils';
import { saveDestinyStatus } from './destiny-status';


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
	people: Person[];
	destinyStatus: DestinyStatus;
}

/**
 * Generate the default game objects
 *
 * @returns Scaffolded game data
 */
export function initGame(): GameScaffoldData {
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
		{ id: ulid(), name: 'Milky Way', position: { x: 0, y: 0 }, starSystems: [starSystems[0], starSystems[1]] },
		{ id: ulid(), name: 'JADES-GS-z14-0', position: { x: 1000, y: 0 }, starSystems: [starSystems[2]] },
	];

	const technology: Technology[] = [
		{ id: ulid(), name: 'Stargate', description: 'Allows travel via the stargate network.', unlocked: true, cost: 0, image: undefined, number_on_destiny: 1 },
	];

	const ships: Ship[] = [];

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

	const destinyStatus: DestinyStatus = {
		id: destinyShipId,
		name: 'Destiny',
		power: 800,
		maxPower: 1000,
		shields: 400,
		maxShields: 500,
		hull: 900,
		maxHull: 1000,
		raceId: ancientsRaceId,
		crew: [],
		location: { systemId: sysDestinyId },
		stargate: destinyStargateId,
		shield: { strength: 400, max: 500, coverage: 80 },
		inventory: {},
		unlockedRooms: [],
		crewStatus: {
			onboard: 12,
			capacity: 100,
			manifest: [],
		},
		atmosphere: {
			co2: 0.04,
			o2: 20.9,
			co2Scrubbers: 1,
			o2Scrubbers: 1,
		},
		weapons: {
			mainGun: true,
			turrets: { total: 6, working: 3 },
		},
		rooms: [
			{ id: destinyBridgeId, type: 'bridge', assigned: [], technology: [] },
			{ id: destinyStargateRoomId, type: 'stargate', assigned: [], technology: [] },
			{ id: destinyEngineId, type: 'engine', assigned: [], technology: [] },
			{ id: destinyMedbayId, type: 'medbay', assigned: [], technology: [] },
		],
		shuttles: { total: 2, working: 1, damaged: 1 },
		notes: ['One shuttle is damaged. Some rooms are locked.'],
	};

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
		people,
		destinyStatus,
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
		insert('games', {
			id: gameId,
			user_id: userId,
			name: game.galaxies[0]?.name || 'New Game',
			created_at: now,
			updated_at: now,
		}, db),
	);

	// Galaxies
	for (const galaxy of game.galaxies) {
		statements.push(
			insert('galaxies', {
				id: galaxy.id,
				game_id: gameId,
				name: galaxy.name,
				x: galaxy.position.x,
				y: galaxy.position.y,
				created_at: now,
			}, db),
		);
	}

	// Star Systems
	for (const system of game.starSystems) {
		const parentGalaxy = game.galaxies.find(g => g.starSystems.some(s => s.id === system.id));
		statements.push(
			insert('star_systems', {
				id: system.id,
				game_id: gameId,
				galaxy_id: parentGalaxy?.id ?? null,
				name: system.name,
				x: system.position.x,
				y: system.position.y,
				description: system.description ?? null,
				image: system.image ?? null,
				created_at: now,
			}, db),
		);
	}

	// Stars
	for (const star of game.stars) {
		const parentSystem = game.starSystems.find(s => s.stars.some(st => st.id === star.id));
		statements.push(
			insert('stars', {
				id: star.id,
				game_id: gameId,
				star_system_id: parentSystem?.id ?? null,
				name: star.name,
				type: star.type,
				description: star.description ?? null,
				image: star.image ?? null,
				radius: star.radius,
				mass: star.mass,
				temperature: star.temperature,
				luminosity: star.luminosity,
				age: star.age,
				created_at: now,
			}, db),
		);
	}

	// Planets
	for (const planet of game.planets) {
		statements.push(
			insert('planets', {
				id: planet.id,
				game_id: gameId,
				star_system_id: game.starSystems.find(s => s.planets.some(p => p.id === planet.id))?.id ?? null,
				name: planet.name,
				type: planet.type,
				stargate_id: planet.stargate ?? null,
				created_at: now,
			}, db),
		);
	}

	// Stargates
	for (const stargate of game.stargates) {
		statements.push(
			insert('stargates', {
				id: stargate.id,
				game_id: gameId,
				location_type: 'room', // or 'planet', 'ship', etc. (adjust as needed)
				location_id: stargate.locationId,
				type: stargate.type,
				created_at: now,
			}, db),
		);
	}

	// Chevrons (address for each stargate)
	for (const stargate of game.stargates) {
		if (stargate.address) {
			stargate.address.forEach((chevron, idx) => {
				statements.push(
					insert('chevrons', {
						id: chevron.id,
						game_id: gameId,
						stargate_id: stargate.id,
						symbol: chevron.symbol,
						description: chevron.description ?? null,
						image: chevron.image ?? null,
						position: idx,
						created_at: now,
					}, db),
				);
			});
		}
	}

	// Technology
	for (const tech of game.technology) {
		statements.push(
			insert('technology', {
				id: tech.id,
				game_id: gameId,
				name: tech.name,
				description: tech.description,
				unlocked: tech.unlocked ? 1 : 0,
				cost: tech.cost,
				image: tech.image ?? null,
				created_at: now,
			}, db),
		);
	}

	// Races
	for (const race of game.races) {
		statements.push(
			insert('races', {
				id: race.id,
				game_id: gameId,
				name: race.name,
				created_at: now,
			}, db),
		);
	}

	// Ships
	for (const ship of game.ships) {
		statements.push(
			insert('ships', {
				id: ship.id,
				game_id: gameId,
				name: ship.name,
				power: ship.power,
				max_power: ship.maxPower,
				shields: ship.shields,
				max_shields: ship.maxShields,
				hull: ship.hull,
				max_hull: ship.maxHull,
				race_id: ship.raceId,
				stargate_id: ship.stargate ?? null,
				location_system_id: ship.location.systemId,
				location_planet_id: ship.location.planetId ?? null,
				created_at: now,
			}, db),
		);
	}

	// People
	for (const person of game.people) {
		statements.push(
			insert('people', {
				id: person.id,
				game_id: gameId,
				name: person.name,
				race_id: person.raceId,
				role: person.role,
				location_room_id: person.location.roomId ?? null,
				location_planet_id: person.location.planetId ?? null,
				location_ship_id: person.location.shipId ?? null,
				description: person.description ?? null,
				image: person.image ?? null,
				created_at: now,
			}, db),
		);
	}

	// Save DestinyStatus
	await saveDestinyStatus(env, gameId, game.destinyStatus);

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
		const game = initGame();
		// Save all game objects to the database
		await saveGame(game, env, userId);
		return new Response(JSON.stringify(game), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}

export default handleCreateGameRequest;
