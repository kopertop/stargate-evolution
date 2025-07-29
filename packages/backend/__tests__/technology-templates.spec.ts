import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllTechnologyTemplates, getTechnologyTemplateById, getTechnologyTemplatesByCategory } from '../src/data/technology-templates';
import type { Env } from '../src/types';

describe('technology-templates', () => {
	it('returns all technology templates', async () => {
		const techs = await getAllTechnologyTemplates((env as Env).DB);
		expect(techs.length).toBeGreaterThan(0);
		expect(techs[0]).toHaveProperty('id');
	});

	it('returns a technology by id', async () => {
		const tech = await getTechnologyTemplateById((env as Env).DB, 'stargate_dialer');
		expect(tech).not.toBeNull();
		expect(tech?.name).toBe('Stargate Dialer');
	});

	it('returns null for missing technology', async () => {
		const tech = await getTechnologyTemplateById((env as Env).DB, 'not-a-tech');
		expect(tech).toBeNull();
	});

	it('returns technology by category', async () => {
		const techs = await getTechnologyTemplatesByCategory((env as Env).DB, 'reconnaissance');
		expect(Array.isArray(techs)).toBe(true);
	});
});
