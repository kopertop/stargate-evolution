import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllStarSystemTemplates, getStarSystemTemplateById } from '../src/templates/star-system-templates';
import type { Env } from '../src/types';

describe('star-system-templates', () => {
	it('returns all star system templates', async () => {
		const systems = await getAllStarSystemTemplates((env as Env).DB);
		expect(systems.length).toBeGreaterThan(0);
		expect(systems[0]).toHaveProperty('id');
		expect(systems[0]).toHaveProperty('x');
		expect(systems[0]).toHaveProperty('y');
	});

	it('returns a star system by id', async () => {
		const system = await getStarSystemTemplateById((env as Env).DB, 'system-sol');
		expect(system).not.toBeNull();
		expect(system?.name).toBe('Sol System');
	});

	it('returns null for missing star system', async () => {
		const system = await getStarSystemTemplateById((env as Env).DB, 'not-a-system');
		expect(system).toBeNull();
	});
});
