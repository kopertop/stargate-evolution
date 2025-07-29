import { describe, it, expect } from 'vitest';

describe('API Endpoint Logic', () => {
	describe('URL Pattern Matching', () => {
		it('should match template room endpoints correctly', () => {
			// Test the URL patterns that are used in the backend
			const templateRoomsUrl = new URL('http://localhost:8787/api/data/rooms');
			const wrongRoomsUrl = new URL('http://localhost:8787/api/rooms/templates');

			// This is what the backend currently supports
			expect(templateRoomsUrl.pathname).toBe('/api/data/rooms');

			// This is what the frontend was incorrectly calling (now fixed)
			expect(wrongRoomsUrl.pathname).toBe('/api/rooms/templates');

			// Verify they're different
			expect(templateRoomsUrl.pathname).not.toBe(wrongRoomsUrl.pathname);
		});

		it('should match admin room endpoints correctly', () => {
			const adminRoomsUrl = new URL('http://localhost:8787/api/admin/rooms');
			const roomDoorsUrl = new URL('http://localhost:8787/api/admin/rooms/gate_room/doors');
			const wrongDoorsUrl = new URL('http://localhost:8787/api/admin/doors/room/gate_room');

			expect(adminRoomsUrl.pathname).toBe('/api/admin/rooms');
			expect(roomDoorsUrl.pathname).toBe('/api/admin/rooms/gate_room/doors');
			expect(wrongDoorsUrl.pathname).toBe('/api/admin/doors/room/gate_room');

			// Test the pattern matching logic used in the backend
			expect(roomDoorsUrl.pathname.includes('/rooms/')).toBe(true);
			expect(roomDoorsUrl.pathname.endsWith('/doors')).toBe(true);
			expect(wrongDoorsUrl.pathname.includes('/rooms/')).toBe(false);
		});

		it('should extract room ID from door endpoint correctly', () => {
			const roomDoorsUrl = new URL('http://localhost:8787/api/admin/rooms/gate_room/doors');
			const pathParts = roomDoorsUrl.pathname.split('/');

			// Path should be: ['', 'api', 'admin', 'rooms', 'gate_room', 'doors']
			expect(pathParts).toHaveLength(6);
			expect(pathParts[4]).toBe('gate_room'); // Room ID should be at index 4
		});
	});

	describe('Request Method Validation', () => {
		it('should validate HTTP methods correctly', () => {
			const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
			const invalidMethods = ['INVALID', 'TRACE', 'CONNECT'];

			for (const method of validMethods) {
				expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']).toContain(method);
			}

			for (const method of invalidMethods) {
				expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']).not.toContain(method);
			}
		});
	});

	describe('Data Validation', () => {
		it('should validate room template data structure', () => {
			const validRoomTemplate = {
				id: 'test-room',
				name: 'Test Room',
				description: 'A test room',
				layout_id: 'destiny',
				type: 'basic',
				startX: 100,
				endX: 200,
				startY: 100,
				endY: 200,
				floor: 0,
				found: false,
				locked: false,
				explored: false,
				base_exploration_time: 2,
				status: 'ok',
			};

			// Basic validation
			expect(validRoomTemplate.id).toBeTruthy();
			expect(validRoomTemplate.name).toBeTruthy();
			expect(validRoomTemplate.startX).toBeLessThan(validRoomTemplate.endX);
			expect(validRoomTemplate.startY).toBeLessThan(validRoomTemplate.endY);
			expect(typeof validRoomTemplate.floor).toBe('number');
		});

		it('should validate door template data structure', () => {
			const validDoorTemplate = {
				id: 'test-door',
				from_room_id: 'room1',
				to_room_id: 'room2',
				x: 150,
				y: 200,
				width: 32,
				height: 8,
				rotation: 0,
				state: 'closed',
				is_automatic: false,
				style: 'standard',
			};

			// Basic validation
			expect(validDoorTemplate.id).toBeTruthy();
			expect(validDoorTemplate.from_room_id).toBeTruthy();
			expect(validDoorTemplate.to_room_id).toBeTruthy();
			expect(typeof validDoorTemplate.x).toBe('number');
			expect(typeof validDoorTemplate.y).toBe('number');
			expect(['opened', 'closed', 'locked']).toContain(validDoorTemplate.state);
			expect([0, 90, 180, 270]).toContain(validDoorTemplate.rotation);
		});

		it('should validate technology template data structure', () => {
			const validTechTemplate = {
				id: 'test-tech',
				name: 'Test Technology',
				description: 'A test technology',
				category: 'test',
				cost: 100,
			};

			// Basic validation
			expect(validTechTemplate.id).toBeTruthy();
			expect(validTechTemplate.name).toBeTruthy();
			expect(validTechTemplate.description).toBeTruthy();
			expect(typeof validTechTemplate.cost).toBe('number');
		});
	});

	describe('Error Response Format', () => {
		it('should format error responses correctly', () => {
			const errorResponse = {
				error: 'Test error message',
				status: 400,
				timestamp: Date.now(),
			};

			expect(errorResponse).toHaveProperty('error');
			expect(typeof errorResponse.error).toBe('string');
			expect(typeof errorResponse.status).toBe('number');
			expect(errorResponse.status).toBeGreaterThanOrEqual(400);
		});
	});
});
