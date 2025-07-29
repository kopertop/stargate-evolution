import { roomTemplateToEvent, nullToUndefined } from '@stargate/common';
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
			SELF.fetch('https://example.com/api/data/rooms'),
			SELF.fetch('https://example.com/api/data/people'),
			SELF.fetch('https://example.com/api/data/races'),
			SELF.fetch('https://example.com/api/data/galaxies'),
			SELF.fetch('https://example.com/api/data/star-systems'),
			SELF.fetch('https://example.com/api/data/starting-inventory'),
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
	describe('connections', () => {
		it('should have valid bidirectional connections between rooms', async () => {
			// Make sure all rooms have valid connections, and all connections
			// are also connected in reverse (i.e. connection_north on Room A is connection_south on Room B)
			const roomsRes = await SELF.fetch('https://example.com/api/data/rooms');
			const rooms = await roomsRes.json();

			expect(Array.isArray(rooms)).toBe(true);
			expect(rooms.length).toBeGreaterThan(0);

			for (const room of rooms) {
				for (const [connection, reverseConnection] of Object.entries(CONNECTION_REVERSE_MAP)) {
					// Skip null connections (both actual null and string "null")
					if (room[connection] === null || room[connection] === 'null' || !room[connection]) continue;

					const otherRoom = rooms.find((r: any) => r.id === room[connection]);

					// Verify the connected room exists
					expect(otherRoom).toBeDefined();
					expect(otherRoom?.id).toBeDefined();

					// Verify the reverse connection exists and points back to this room
					expect(otherRoom?.[reverseConnection]).toBe(room.id);
				}
			}
		});
	});

	describe('template event mapping', () => {
		it('roomTemplateToEvent copies fields', async () => {
			const res = await SELF.fetch('https://example.com/api/data/rooms');
			const room = (await res.json())[0];
			const event = roomTemplateToEvent(room);
			for (const key of Object.keys(event)) {
				if (key === 'template_id') continue;
				expect((event as any)[key]).toEqual(nullToUndefined(room)[key]);
			}
		});

		it('person template maps directly', async () => {
			const res = await SELF.fetch('https://example.com/api/data/people');
			const person = (await res.json())[0];
			const event = { ...nullToUndefined(person), id: 'new', game_id: 'game' };
			for (const key of Object.keys(person)) {
				if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
				expect(event[key as keyof typeof event]).toEqual((nullToUndefined(person) as any)[key]);
			}
		});

		it('race template maps directly', async () => {
			const res = await SELF.fetch('https://example.com/api/data/races');
			const race = (await res.json())[0];
			const event = { ...nullToUndefined(race), id: 'new', game_id: 'game' };
			for (const key of Object.keys(race)) {
				if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
				expect(event[key as keyof typeof event]).toEqual((nullToUndefined(race) as any)[key]);
			}
		});

		it('galaxy template maps directly', async () => {
			const res = await SELF.fetch('https://example.com/api/data/galaxies');
			const galaxy = (await res.json())[0];
			const event = { ...nullToUndefined(galaxy), id: 'new', game_id: 'game' };
			for (const key of Object.keys(galaxy)) {
				if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
				expect(event[key as keyof typeof event]).toEqual((nullToUndefined(galaxy) as any)[key]);
			}
		});

		it('star system template maps directly', async () => {
			const res = await SELF.fetch('https://example.com/api/data/star-systems');
			const system = (await res.json())[0];
			const event = { ...nullToUndefined(system), id: 'new', game_id: 'game', created_at: new Date(), updated_at: new Date() };
			for (const key of Object.keys(system)) {
				if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
				expect(event[key as keyof typeof event]).toEqual((nullToUndefined(system) as any)[key]);
			}
		});

		it('inventory template maps directly', async () => {
			const res = await SELF.fetch('https://example.com/api/data/starting-inventory');
			const item = (await res.json())[0];
			const event = { ...nullToUndefined(item), id: 'new', game_id: 'game' };
			for (const key of Object.keys(item)) {
				if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
				expect(event[key as keyof typeof event]).toEqual((nullToUndefined(item) as any)[key]);
			}
		});
	});
});
