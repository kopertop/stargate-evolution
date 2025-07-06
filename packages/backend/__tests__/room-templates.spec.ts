import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllRoomTemplates, getRoomTemplateById, getRoomTemplatesByType, getRoomsByLayoutId } from '../src/templates/room-templates';
import type { Env } from '../src/types';

describe('room-templates', () => {
	it('returns all room templates', async () => {
		const rooms = await getAllRoomTemplates((env as Env).DB);
		expect(rooms.length).toBeGreaterThan(0);
		expect(rooms[0]).toHaveProperty('id');
	});

	it('returns a room by id', async () => {
		const room = await getRoomTemplateById((env as Env).DB, 'gate_room');
		expect(room).not.toBeNull();
		expect(room?.name).toBe('Gate Room');
	});

	it('returns null for missing room', async () => {
		const room = await getRoomTemplateById((env as Env).DB, 'not-a-room');
		expect(room).toBeNull();
	});

	it('returns rooms by type', async () => {
		const rooms = await getRoomTemplatesByType((env as Env).DB, 'corridor_basic');
		expect(Array.isArray(rooms)).toBe(true);
	});

	it('returns rooms by layout id', async () => {
		const rooms = await getRoomsByLayoutId((env as Env).DB, 'destiny');
		expect(Array.isArray(rooms)).toBe(true);
	});
});
