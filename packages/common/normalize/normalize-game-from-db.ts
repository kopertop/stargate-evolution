/**
 * Normalize raw DB rows for all game entities into the shape expected by GameSchema.
 * Handles JSON parsing and nested objects for our auto-generated schema.
 */
import { GalaxySchema } from '../types/galaxy';
import { StarSystemSchema } from '../types/galaxy';
import { StarSchema } from '../types/galaxy';
import { PlanetSchema } from '../types/galaxy';
import { PersonSchema } from '../types/people';
import { TechnologySchema, RaceSchema, ShipSchema } from '../types/ship';
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
	people: any[],
}): any {
	// Helper to safely parse JSON strings
	const parseJson = (str: string | null | undefined, fallback: any = null) => {
		if (!str) return fallback;
		try {
			return JSON.parse(str);
		} catch {
			return fallback;
		}
	};

	// Normalize chevrons (simple mapping, no complex fields)
	const chevrons = raw.chevrons.map((c: any) =>
		CheveronSymbolSchema.parse({
			id: c.id,
			symbol: c.symbol,
			description: c.description || undefined,
			image: c.image || undefined,
		}),
	);

	// Normalize stargates and parse JSON fields
	const stargates = raw.stargates.map((sg: any) => {
		return StargateSchema.parse({
			id: sg.id,
			address: parseJson(sg.address, []),
			type: sg.type,
			locationId: sg.locationId,
			connectedTo: parseJson(sg.connectedTo, []),
		});
	});

	// Normalize planets
	const planets = raw.planets.map((p: any) => {
		return PlanetSchema.parse({
			id: p.id,
			name: p.name,
			type: p.type,
			resources: parseJson(p.resources, []),
			inhabitants: parseJson(p.inhabitants, []),
			stargate: undefined, // Will be set later if needed
		});
	});

	// Normalize stars
	const stars = raw.stars.map((s: any) => StarSchema.parse({
		id: s.id,
		name: s.name,
		type: s.type,
		description: s.description || undefined,
		image: s.image || undefined,
		radius: s.radius,
		mass: s.mass,
		temperature: s.temperature,
		luminosity: s.luminosity,
		age: s.age,
	}));

	// Normalize star systems and attach planets, stargates, stars
	const starSystems = raw.starSystems.map((ss: any) => {
		const planetsInSystem = planets.filter((p, j) => raw.planets[j]?.starSystemId === ss.id);
		const stargatesInSystem = stargates.filter((sg, j) => raw.stargates[j]?.locationId === ss.id);
		const starsInSystem = stars.filter((st, j) => raw.stars[j]?.starSystemId === ss.id);

		return StarSystemSchema.parse({
			id: ss.id,
			name: ss.name,
			position: { x: ss.x || 0, y: ss.y || 0 },
			planets: planetsInSystem,
			stargates: stargatesInSystem,
			stars: starsInSystem,
			description: ss.description || undefined,
			image: ss.image || undefined,
		});
	});

	// Normalize galaxies and attach starSystems
	const galaxies = raw.galaxies.map((g: any, i: number) => {
		const systems = starSystems.filter((ss, j) => raw.starSystems[j]?.galaxyId === g.id);
		return GalaxySchema.parse({
			id: g.id,
			name: g.name,
			position: { x: g.x || i * 1000, y: g.y || 0 },
			starSystems: systems,
		});
	});

	// Normalize technology
	const technology = raw.technology.map((t: any) => TechnologySchema.parse({
		id: t.id,
		name: t.name,
		description: t.description,
		unlocked: Boolean(t.unlocked),
		cost: t.cost,
		image: t.image || undefined,
		number_on_destiny: t.numberOnDestiny || 0,
	}));

	// Normalize ships and parse JSON fields
	const ships = raw.ships.map((s: any) => {
		return ShipSchema.parse({
			id: s.id,
			name: s.name,
			power: s.power,
			maxPower: s.maxPower,
			shields: s.shields,
			maxShields: s.maxShields,
			hull: s.hull,
			maxHull: s.maxHull,
			raceId: s.raceId,
			crew: parseJson(s.crew, []),
			location: parseJson(s.location, {}),
			stargate: s.stargate || undefined,
		});
	});

	// Normalize races and parse JSON fields
	const races = raw.races.map((r: any) => {
		return RaceSchema.parse({
			id: r.id,
			name: r.name,
			technology: parseJson(r.technology, []),
			ships: parseJson(r.ships, []),
		});
	});

	// Normalize people and parse JSON fields
	const people = raw.people.map((p: any) => {
		return PersonSchema.parse({
			id: p.id,
			name: p.name,
			raceId: p.raceId,
			role: p.role,
			location: parseJson(p.location, {}),
			description: p.description || undefined,
			image: p.image || undefined,
			conditions: parseJson(p.conditions, []),
		});
	});

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
	};
}
