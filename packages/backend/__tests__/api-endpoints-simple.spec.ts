import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getDefaultDestinyStatusTemplate } from '../src/templates/destiny-status-template';
import { getAllGalaxyTemplates } from '../src/templates/galaxy-templates';
import { getAllPersonTemplates } from '../src/templates/person-templates';
// import { getAllRaceTemplates } from '../src/templates/race-templates'; // Not available
import { getAllRoomTemplates, getRoomTemplateById } from '../src/templates/room-templates';
import { getAllLayoutIds } from '../src/templates/ship-layouts';
import { getAllStarSystemTemplates } from '../src/templates/star-system-templates';
import { getAllTechnologyTemplates } from '../src/templates/technology-templates';
import type { Env } from '../src/types';

describe('API Template Functions', () => {
	describe('Room Templates', () => {
		it('should fetch all room templates', async () => {
			const rooms = await getAllRoomTemplates((env as Env).DB);
			expect(Array.isArray(rooms)).toBe(true);
			expect(rooms.length).toBeGreaterThan(0);

			// Check that we have some basic room data
			if (rooms.length > 0) {
				const room = rooms[0];
				expect(room).toHaveProperty('id');
				expect(room).toHaveProperty('name');
				expect(room).toHaveProperty('layout_id');
				expect(room).toHaveProperty('startX');
				expect(room).toHaveProperty('endX');
				expect(room).toHaveProperty('startY');
				expect(room).toHaveProperty('endY');
			}
		});

		it('should fetch a specific room template by ID', async () => {
			// First get all rooms to get a valid ID
			const rooms = await getAllRoomTemplates((env as Env).DB);

			if (rooms.length > 0) {
				const roomId = rooms[0].id;
				const room = await getRoomTemplateById((env as Env).DB, roomId);
				expect(room).not.toBeNull();
				expect(room?.id).toBe(roomId);
			}
		});

		it('should return null for non-existent room template', async () => {
			const room = await getRoomTemplateById((env as Env).DB, 'non-existent-room');
			expect(room).toBeNull();
		});
	});

	describe('Technology Templates', () => {
		it('should fetch all technology templates', async () => {
			const techs = await getAllTechnologyTemplates((env as Env).DB);
			expect(Array.isArray(techs)).toBe(true);
			expect(techs.length).toBeGreaterThan(0);

			if (techs.length > 0) {
				const tech = techs[0];
				expect(tech).toHaveProperty('id');
				expect(tech).toHaveProperty('name');
				expect(tech).toHaveProperty('description');
			}
		});
	});

	describe('Person Templates', () => {
		it('should fetch all person templates', async () => {
			const people = await getAllPersonTemplates((env as Env).DB);
			expect(Array.isArray(people)).toBe(true);
		});
	});

	// Race templates not available yet
	// describe('Race Templates', () => {
	//	it('should fetch all race templates', async () => {
	//		const races = await getAllRaceTemplates((env as Env).DB);
	//		expect(Array.isArray(races)).toBe(true);
	//	});
	// });

	describe('Galaxy Templates', () => {
		it('should fetch all galaxy templates', async () => {
			const galaxies = await getAllGalaxyTemplates((env as Env).DB);
			expect(Array.isArray(galaxies)).toBe(true);
		});
	});

	describe('Star System Templates', () => {
		it('should fetch all star system templates', async () => {
			const systems = await getAllStarSystemTemplates((env as Env).DB);
			expect(Array.isArray(systems)).toBe(true);
		});
	});

	describe('Ship Layouts', () => {
		it('should fetch ship layout IDs', async () => {
			const layouts = await getAllLayoutIds((env as Env).DB);
			expect(Array.isArray(layouts)).toBe(true);
		});
	});

	describe('Destiny Status', () => {
		it('should fetch destiny status template', async () => {
			const status = getDefaultDestinyStatusTemplate();
			expect(status).toHaveProperty('id');
			expect(status).toHaveProperty('power');
			expect(status).toHaveProperty('shields');
		});
	});
});
