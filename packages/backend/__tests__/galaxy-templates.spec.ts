import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllGalaxyTemplates, getGalaxyTemplateById } from '../src/templates/galaxy-templates';
import type { Env } from '../src/types';

describe('galaxy-templates', () => {
	it('returns all galaxy templates', async () => {
		const galaxies = await getAllGalaxyTemplates((env as Env).DB);
		expect(galaxies.length).toBeGreaterThan(0);
		for (const galaxy of galaxies) {
			expect(galaxy).toHaveProperty('id');
			expect(galaxy).toHaveProperty('x');
			expect(galaxy).toHaveProperty('y');
		}
	});

	it('returns a galaxy by id', async () => {
		const galaxy = await getGalaxyTemplateById((env as Env).DB, 'galaxy-milky-way');
		expect(galaxy).not.toBeNull();
		expect(galaxy?.name).toBe('Milky Way');
	});

	it('returns null for missing galaxy', async () => {
		const galaxy = await getGalaxyTemplateById((env as Env).DB, 'not-a-galaxy');
		expect(galaxy).toBeNull();
	});
});
