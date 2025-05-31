import { DestinyStatusSchema, type DestinyStatus } from '@stargate/common/models/destiny-status';
import { Inventory } from '@stargate/common/models/inventory';
import { InventorySchema } from '@stargate/common/models/inventory';

/**
 * Default ship status for a new game
 */
export function getDefaultDestinyStatusTemplate(): DestinyStatus {
	// Fill with reasonable defaults for a new game
	return DestinyStatusSchema.parse({
		id: 'destiny-status-default',
		name: 'Destiny',
		power: 800,
		max_power: 1000,
		shields: 400,
		max_shields: 500,
		hull: 900,
		max_hull: 1000,
		race_id: 'ancients',
		star_system_id: 'system-destiny',
		stargate_id: 'destiny',
		game_days: 0,
		game_hours: 0,
		ftl_status: 'ftl',
		location: '{"systemId": "system-destiny"}',
		co2: 0.04,
		o2: 20.9,
		co2Scrubbers: 1,
		weapons: '{"mainGun": false, "turrets": {"total": 12, "working": 6}}',
		shuttles: '{"total": 2, "working": 1, "damaged": 1}',
		next_ftl_transition: (Math.floor(Math.random() * 43) + 6) * 3600,
		created_at: Date.now(),
		updated_at: Date.now(),
	});
}

/**
 * Default starting inventory for a new game.
 */
export function getStartingInventoryTemplate(): Inventory[] {
	const now = Date.now();
	return [
		{
			id: 'food',
			resource_type: 'food',
			amount: 50,
			location: 'ship',
			description: 'Emergency food supplies, each unit can sustain one person for one day.',
		},
		{
			id: 'water',
			resource_type: 'water',
			amount: 100,
			location: 'ship',
			description: 'Water reserves, each unit can sustain one person for one day.',
		},
		{
			id: 'parts',
			resource_type: 'parts',
			amount: 10,
			location: 'ship',
			description: 'Spare parts',
		},
		{
			id: 'medicine',
			resource_type: 'medicine',
			amount: 5,
			location: 'ship',
			description: 'Medical supplies',
		},
		{
			id: 'ancient_tech',
			resource_type: 'ancient_tech',
			amount: 2,
			location: 'ship',
			description: 'Ancient technology parts, used to repair the ship.',
		},
		{
			id: 'oxygen_canister',
			resource_type: 'oxygen_canister',
			amount: 5,
			location: 'ship',
			description: 'Oxygen canisters, used to replenish the ship\'s oxygen supply.',
		},
		{
			id: 'communication-stones',
			resource_type: 'communication_stones',
			amount: 4,
			location: 'ship',
			description: 'Communication stones, capable of sending messages back to Earth.',
		},
	].map((item) => {
		return InventorySchema.parse({
			...item,
			created_at: now,
			updated_at: now,
		});
	});
}