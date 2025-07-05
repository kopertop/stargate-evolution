import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import { getAllPersonTemplates, getPersonTemplateById, getPersonTemplatesByRole, getAllRaceTemplates, getRaceTemplateById } from '../src/templates/person-templates';
import type { Env } from '../src/types';

describe('person-templates', () => {
	it('returns all person templates', async () => {
		const people = await getAllPersonTemplates((env as Env).DB);
		expect(people.length).toBeGreaterThan(0);
		expect(people[0]).toHaveProperty('id');
	});

	it('returns a person by id', async () => {
		const person = await getPersonTemplateById((env as Env).DB, 'colonel_young');
		expect(person).not.toBeNull();
		expect(person?.name).toBe('Colonel Young');
	});

	it('returns null for missing person', async () => {
		const person = await getPersonTemplateById((env as Env).DB, 'not-a-person');
		expect(person).toBeNull();
	});

	it('returns people by role', async () => {
		const people = await getPersonTemplatesByRole((env as Env).DB, 'chief_scientist');
		expect(Array.isArray(people)).toBe(true);
	});

	it('returns all race templates', async () => {
		const races = await getAllRaceTemplates((env as Env).DB);
		expect(races.length).toBeGreaterThan(0);
	});

	it('returns a race by id', async () => {
		const race = await getRaceTemplateById((env as Env).DB, 'human');
		expect(race).not.toBeNull();
		expect(race?.name).toBe('Human');
	});

	it('returns null for missing race', async () => {
		const race = await getRaceTemplateById((env as Env).DB, 'not-a-race');
		expect(race).toBeNull();
	});
});
