import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllLayoutIds, getRoomsByLayoutId, getDoorsByLayoutId, getShipLayoutById, getRoomById, getDoorById } from '../src/templates/ship-layouts';
import type { Env } from '../src/types';

describe('ship-layouts', () => {
	it('returns all layout ids', async () => {
		const layouts = await getAllLayoutIds((env as Env).DB);
		expect(layouts.length).toBeGreaterThan(0);
	});

	it('returns rooms by layout id', async () => {
		const rooms = await getRoomsByLayoutId((env as Env).DB, 'destiny');
		expect(Array.isArray(rooms)).toBe(true);
	});

	it('returns doors by layout id', async () => {
		const doors = await getDoorsByLayoutId((env as Env).DB, 'destiny');
		expect(Array.isArray(doors)).toBe(true);
	});

	it('returns ship layout by id', async () => {
		const layout = await getShipLayoutById((env as Env).DB, 'destiny');
		expect(layout).not.toBeNull();
		expect(layout).toHaveProperty('rooms');
		expect(layout).toHaveProperty('doors');
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

	it('returns a door by id', async () => {
		const door = await getDoorById((env as Env).DB, 'door_gate_north');
		expect(door).not.toBeNull();
	});

	it('returns null for missing door', async () => {
		const door = await getDoorById((env as Env).DB, 'not-a-door');
		expect(door).toBeNull();
	});
});
