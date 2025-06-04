import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

const CONNECTION_REVERSE_MAP = {
	connection_north: 'connection_south',
	connection_south: 'connection_north',
	connection_east: 'connection_west',
	connection_west: 'connection_east',
} as const;

describe('createNewGame integration', () => {
	it('fetches templates from backend APIs', async () => {
		// Test that all template endpoints are working
		const [roomsRes, peopleRes, racesRes, galaxiesRes, systemsRes, invRes] = await Promise.all([
			SELF.fetch('https://example.com/api/templates/rooms'),
			SELF.fetch('https://example.com/api/templates/people'),
			SELF.fetch('https://example.com/api/templates/races'),
			SELF.fetch('https://example.com/api/templates/galaxies'),
			SELF.fetch('https://example.com/api/templates/star-systems'),
			SELF.fetch('https://example.com/api/templates/starting-inventory'),
		]);

		// Verify all responses are successful
		expect(roomsRes.status).toBe(200);
		expect(peopleRes.status).toBe(200);
		expect(racesRes.status).toBe(200);
		expect(galaxiesRes.status).toBe(200);
		expect(systemsRes.status).toBe(200);
		expect(invRes.status).toBe(200);

		// Parse JSON data
		const [roomsT, peopleT, racesT, galaxiesT, systemsT, invT] = await Promise.all([
			roomsRes.json(),
			peopleRes.json(),
			racesRes.json(),
			galaxiesRes.json(),
			systemsRes.json(),
			invRes.json(),
		]);

		// Verify we have data
		expect(Array.isArray(roomsT)).toBe(true);
		expect(Array.isArray(peopleT)).toBe(true);
		expect(Array.isArray(racesT)).toBe(true);
		expect(Array.isArray(galaxiesT)).toBe(true);
		expect(Array.isArray(systemsT)).toBe(true);
		expect(Array.isArray(invT)).toBe(true);

		// Verify we have some data
		expect(roomsT.length).toBeGreaterThan(0);
		expect(peopleT.length).toBeGreaterThan(0);
		expect(racesT.length).toBeGreaterThan(0);
		expect(galaxiesT.length).toBeGreaterThan(0);
		expect(systemsT.length).toBeGreaterThan(0);
		expect(invT.length).toBeGreaterThan(0);

		console.log('API Test Results:');
		console.log(`- Rooms: ${roomsT.length} templates`);
		console.log(`- People: ${peopleT.length} templates`);
		console.log(`- Races: ${racesT.length} templates`);
		console.log(`- Galaxies: ${galaxiesT.length} templates`);
		console.log(`- Star Systems: ${systemsT.length} templates`);
		console.log(`- Starting Inventory: ${invT.length} templates`);
	});
	// Make sure all rooms have at least one connection, and all connections
	// are also connected in reverse (i.e. connection_north on Room A is connection_south on Room B)
	describe('connections', async () => {
		const roomsRes = await SELF.fetch('https://example.com/api/templates/rooms');
		const rooms = await roomsRes.json();
		for (const room of rooms) {
			describe(`${room.id} - ${room.name}`, () => {
				for (const [connection, reverseConnection] of Object.entries(CONNECTION_REVERSE_MAP)) {
					if (room[connection] === null) continue;
					const otherRoom = rooms.find((r: any) => r.id === room[connection]);
					it(`${room[connection]} should exist`, async () => {
						expect(otherRoom).toBeDefined();
						expect(otherRoom?.id).toBeDefined();
					});

					it(`${room[connection]} should have a valid ${reverseConnection} connection to ${room.id}`, async () => {
						expect(otherRoom).toBeDefined();
						expect(otherRoom?.id).toBeDefined();
						expect(otherRoom?.[reverseConnection]).toBe(room.id);
					});
				}
			});
		}
	});
});
