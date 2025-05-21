/**
 * Normalize raw DB rows for all game entities into the shape expected by GameSchema.
 * Handles snake_case to camelCase, nested objects, and default values.
 */
import { GalaxySchema } from '../types/galaxy';
import { StarSystemSchema } from '../types/galaxy';
import { StarSchema } from '../types/galaxy';
import { PlanetSchema } from '../types/galaxy';
import { PersonSchema } from '../types/people';
import { TechnologySchema, RaceSchema, ShipSchema, RoomSchema } from '../types/ship';
import { StargateSchema, CheveronSymbolSchema } from '../types/stargate';

export function normalizeGameFromDb(raw: {
	galaxies: any[],
	starSystems: any[],
	stars: any[],
	planets: any[],
	stargates: any[],
	chevrons: any[],
	technology: any[],
	races: any[],
	ships: any[],
	rooms: any[],
	people: any[],
}): any {
	const toCamel = (str: string) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
	const mapKeys = (obj: any) => {
		const out: any = {};
		for (const k in obj) {
			if (obj[k] !== undefined) out[toCamel(k)] = obj[k];
		}
		return out;
	};

	// Normalize chevrons (for relationship mapping, keep stargate_id and position from raw)
	const chevrons = raw.chevrons.map(mapKeys).map((c: any, i: number) =>
		CheveronSymbolSchema.parse({
			id: c.id,
			symbol: c.symbol,
			description: c.description,
			image: c.image ?? undefined,
		}),
	);

	// Normalize stargates and attach address (chevrons)
	const stargates = raw.stargates.map(mapKeys).map((sg: any, i: number) => {
		const address = raw.chevrons
			.map((c: any, j: number) => ({
				chevron: chevrons[j],
				position: c.position ?? 0,
				stargateId: c.stargate_id,
			}))
			.filter(c => c.stargateId === (sg.id ?? raw.stargates[i]?.id))
			.sort((a, b) => a.position - b.position)
			.map(c => c.chevron);
		return StargateSchema.parse({ ...sg, address });
	});

	// Normalize planets and attach stargate if present
	const planets = raw.planets.map(mapKeys).map((p: any, i: number) => {
		const stargate = stargates.find((sg, j) => (sg.locationId ?? raw.stargates[j]?.location_id) === (p.id ?? raw.planets[i]?.id) && sg.type === 'planetary');
		return PlanetSchema.parse({ ...p, stargate });
	});

	// Normalize stars
	const stars = raw.stars.map(mapKeys).map((s: any) => StarSchema.parse(s));

	// Normalize star systems and attach planets, stargates, stars
	const starSystems = raw.starSystems.map(mapKeys).map((ss: any, i: number) => {
		const planetsInSystem = planets.filter((p, j) => (raw.planets[j]?.star_system_id) === (ss.id ?? raw.starSystems[i]?.id));
		const stargatesInSystem = stargates.filter((sg, j) => (sg.locationId ?? raw.stargates[j]?.location_id) === (ss.id ?? raw.starSystems[i]?.id) && sg.type === 'master');
		const starsInSystem = stars.filter((st, j) => (raw.stars[j]?.star_system_id) === (ss.id ?? raw.starSystems[i]?.id));
		const { x, y, ...rest } = ss;
		return StarSystemSchema.parse({
			...rest,
			position: { x, y },
			planets: planetsInSystem,
			stargates: stargatesInSystem,
			stars: starsInSystem,
		});
	});

	// Normalize galaxies and attach starSystems
	const galaxies = raw.galaxies.map(mapKeys).map((g: any, i: number) => {
		const systems = starSystems.filter((ss, j) => (raw.starSystems[j]?.galaxy_id) === (g.id ?? raw.galaxies[i]?.id));
		const x = typeof g.x === 'number' ? g.x : i * 1000;
		const y = typeof g.y === 'number' ? g.y : 0;
		const position = { x, y };
		return GalaxySchema.parse({ ...g, position, starSystems: systems });
	});

	// Normalize technology
	const technology = raw.technology.map(mapKeys).map((t: any) => TechnologySchema.parse(t));

	// Normalize rooms
	const rooms = raw.rooms.map(mapKeys).map((r: any) => RoomSchema.parse(r));

	// Normalize ships and attach rooms (by shipId) and crew (people assigned to this ship)
	const ships = raw.ships.map(mapKeys).map((s: any, i: number) => {
		const shipRooms = rooms.filter((r, j) => (r.shipId ?? raw.rooms[j]?.ship_id) === (s.id ?? raw.ships[i]?.id));
		const crew = raw.people.map(mapKeys).filter((p: any, k: number) => (p.locationShipId ?? raw.people[k]?.location_ship_id) === (s.id ?? raw.ships[i]?.id)).map((p: any) => p.id);
		const location: Record<string, any> = { systemId: s.locationSystemId ?? raw.ships[i]?.location_system_id, planetId: s.locationPlanetId ?? raw.ships[i]?.location_planet_id };
		Object.keys(location).forEach(k => { if (location[k] === null) location[k] = undefined; });
		return ShipSchema.parse({ ...s, rooms: shipRooms, crew, location });
	});

	// Normalize races and attach ships/technology (by raceId)
	const races = raw.races.map(mapKeys).map((r: any, i: number) => {
		const raceShips = ships.filter((s, j) => (s.raceId ?? raw.ships[j]?.race_id) === (r.id ?? raw.races[i]?.id));
		// If you have raceId on tech, filter here; otherwise, just pass []
		return RaceSchema.parse({ ...r, ships: raceShips, technology: [] });
	});

	// Normalize people and attach location object
	let people: any[] = [];
	try {
		people = raw.people.map(mapKeys).map((p: any, i: number) => {
			const location: Record<string, any> = {
				roomId: (p.locationRoomId ?? raw.people[i]?.location_room_id) ?? undefined,
				planetId: (p.locationPlanetId ?? raw.people[i]?.location_planet_id) ?? undefined,
				shipId: (p.locationShipId ?? raw.people[i]?.location_ship_id) ?? undefined,
			};
			Object.keys(location).forEach(k => { if (location[k] === null) location[k] = undefined; });
			const personObj = { ...p, location };
			if (typeof location.planetId !== 'string' && location.planetId !== undefined) {
				throw new Error(
					'Invalid planetId in person location: ' +
					JSON.stringify({ raw: raw.people[i], computed: personObj }, null, 2),
				);
			}
			return PersonSchema.parse(personObj);
		});
	} catch (err) {
		console.error('DEBUG: All computed people objects:', JSON.stringify(
			raw.people.map(mapKeys).map((p: any, i: number) => {
				const location: Record<string, any> = {
					roomId: (p.locationRoomId ?? raw.people[i]?.location_room_id) ?? undefined,
					planetId: (p.locationPlanetId ?? raw.people[i]?.location_planet_id) ?? undefined,
					shipId: (p.locationShipId ?? raw.people[i]?.location_ship_id) ?? undefined,
				};
				Object.keys(location).forEach(k => { if (location[k] === null) location[k] = undefined; });
				return { ...p, location };
			}),
			null,
			2,
		));
		throw err;
	}

	return {
		galaxies,
		starSystems,
		stars,
		planets,
		stargates,
		chevrons,
		technology,
		races: races,
		ships,
		rooms,
		people,
	};
}
