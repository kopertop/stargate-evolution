import { makeAdapter } from '@livestore/adapter-node';
import { createStorePromise } from '@livestore/livestore';
import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, vi } from 'vitest';

import { schema, tables } from '../../frontend/src/livestore/schema';

let store: any;

vi.mock('@livestore/react', () => ({
	useStore: () => ({ store }),
}));

beforeAll(async () => {
	store = await createStorePromise({
		schema,
		adapter: makeAdapter({ storage: { type: 'in-memory' } }),
		storeId: 'integration',
		batchUpdates: (run: () => void) => run(),
		debug: { instanceId: 'test' },
	});
	global.fetch = (input: any, init?: any) => {
		const req = input instanceof Request ? input : new Request(input, init);
		return SELF.fetch(req);
	};
});

describe('createNewGame integration', () => {
	it('saves templates to frontend db', async () => {
		const [roomsT, peopleT, racesT, galaxiesT, systemsT, invT] = await Promise.all([
			SELF.fetch('/api/templates/rooms').then((res: Response) => res.json()),
			SELF.fetch('/api/templates/people').then((res: Response) => res.json()),
			SELF.fetch('/api/templates/races').then((res: Response) => res.json()),
			SELF.fetch('/api/templates/galaxies').then((res: Response) => res.json()),
			SELF.fetch('/api/templates/star-systems').then((res: Response) => res.json()),
			SELF.fetch('/api/templates/starting-inventory').then((res: Response) => res.json()),
		]);

		const { useGameService } = await import('../../frontend/src/services/use-game-service');
		const service = useGameService();
		const gameId = await service.createNewGame('integration test');

		expect(store.query(tables.rooms.where({ game_id: gameId })).length).toBe(roomsT.length);
		expect(store.query(tables.people.where({ game_id: gameId })).length).toBe(peopleT.length);
		expect(store.query(tables.races.where({ game_id: gameId })).length).toBe(racesT.length);
		expect(store.query(tables.galaxies.where({ game_id: gameId })).length).toBe(galaxiesT.length);
		expect(store.query(tables.starSystems.where({ game_id: gameId })).length).toBe(systemsT.length);
		expect(store.query(tables.inventory.where({ game_id: gameId })).length).toBe(invT.length);
	});
});
