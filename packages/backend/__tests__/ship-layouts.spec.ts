import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllLayoutIds, getRoomsByLayoutId, getShipLayoutById, getRoomById } from '../src/templates/ship-layouts';
import type { Env } from '../src/types';

describe('ship-layouts', () => {
	it('returns all layout ids', async () => {
		const layouts = await getAllLayoutIds((env as Env).DB);
		expect(layouts.length).toBeGreaterThan(0);
	});

	it.skip('returns rooms by layout id', async () => {
		const rooms = await getRoomsByLayoutId((env as Env).DB, 'destiny');
		expect(Array.isArray(rooms)).toBe(true);
	});

	it.skip('returns ship layout by id', async () => {
		const layout = await getShipLayoutById((env as Env).DB, 'destiny');
		expect(layout).not.toBeNull();
		expect(layout).toHaveProperty('rooms');
	});

	it('returns null for missing ship layout', async () => {
		const layout = await getShipLayoutById((env as Env).DB, 'not-a-layout');
		expect(layout).toBeNull();
	});

	it('returns a room by id', async () => {
		const room = await getRoomById((env as Env).DB, 'gate_room');
		expect(room).not.toBeNull();
	});

	it('returns null for missing room', async () => {
		const room = await getRoomById((env as Env).DB, 'not-a-room');
		expect(room).toBeNull();
	});
});
