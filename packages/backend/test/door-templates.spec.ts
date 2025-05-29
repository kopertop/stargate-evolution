import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllDoorTemplates, getDoorTemplateById, getDoorsByLayoutId } from '../src/templates/door-templates';
import type { Env } from '../src/types';

describe('door-templates', () => {
	it('returns all door templates', async () => {
		const doors = await getAllDoorTemplates((env as Env).DB);
		expect(doors.length).toBeGreaterThan(0);
		expect(doors[0]).toHaveProperty('id');
	});

	it('returns a door by id', async () => {
		const door = await getDoorTemplateById((env as Env).DB, 'door_gate_north');
		expect(door).not.toBeNull();
		expect(door?.description).toContain('corridor');
	});

	it('returns null for missing door', async () => {
		const door = await getDoorTemplateById((env as Env).DB, 'not-a-door');
		expect(door).toBeNull();
	});

	it('returns doors by layout id', async () => {
		const doors = await getDoorsByLayoutId((env as Env).DB, 'destiny');
		expect(Array.isArray(doors)).toBe(true);
	});
});
