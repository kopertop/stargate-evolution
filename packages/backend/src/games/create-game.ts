import { Galaxy, StarSystem, Planet, Star } from '@stargate/common/types/galaxy';
import { Person } from '@stargate/common/types/people';
import { Ship, Room, Technology, Race } from '@stargate/common/types/ship';
import { Stargate, CheveronSymbol } from '@stargate/common/types/stargate';
import { ulid } from 'ulid';

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
	const milkywayId = ulid();
	const destinyGalaxyId = ulid();
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
		{ id: destinyBridgeId, type: 'bridge', assigned: [], technology: [] },
		{ id: destinyStargateRoomId, type: 'stargate', assigned: [], technology: [] },
		{ id: destinyEngineId, type: 'engine', assigned: [], technology: [] },
		{ id: destinyMedbayId, type: 'medbay', assigned: [], technology: [] },
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

export async function handleCreateGameRequest(request: Request): Promise<Response> {
	try {
		const { userId } = await request.json();
		if (!userId || typeof userId !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing or invalid userId' }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		const game = initGame(userId);
		return new Response(JSON.stringify(game), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}

export default handleCreateGameRequest;
