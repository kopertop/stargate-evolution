import { GalaxySchema, type Galaxy } from '@stargate/common/types/galaxy';

// Simple seeded RNG (mulberry32)
function mulberry32(seed: number) {
	return function () {
		let t = seed += 0x6d2b79f5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i);
	}
	return hash >>> 0;
}

// Procedural galaxy generator
export function generateGalaxy(id: string): Galaxy {
	const seed = hashString(id);
	const rand = mulberry32(seed);

	const starSystemCount = Math.floor(rand() * 8) + 3; // 3-10 systems
	const starSystems = [];
	for (let i = 0; i < starSystemCount; i++) {
		const sysId = `sys-${i}`;
		const planetCount = Math.floor(rand() * 6) + 1; // 1-6 planets
		const planets = [];
		for (let j = 0; j < planetCount; j++) {
			planets.push({
				id: `${sysId}-planet-${j}`,
				name: `Planet ${String.fromCharCode(65 + j)}`,
				type: rand() > 0.5 ? 'terrestrial' : 'gas giant',
				resources: [],
				inhabitants: [],
				stargate: undefined,
			});
		}
		starSystems.push({
			id: sysId,
			name: `System ${i + 1}`,
			position: { x: Math.floor(rand() * 1000), y: Math.floor(rand() * 1000) },
			planets,
			stargates: [],
		});
	}
	const galaxy = { seed: id, starSystems };
	return GalaxySchema.parse(galaxy);
}
