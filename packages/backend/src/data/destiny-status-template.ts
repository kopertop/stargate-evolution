import { DestinyStatusSchema, type DestinyStatus } from '@stargate/common/models/destiny-status';

/**
 * Default ship status for a new game
 */
export function getDefaultDestinyStatusTemplate(): DestinyStatus {
	// Fill with reasonable defaults for a new game
	const now = Date.now();
	return DestinyStatusSchema.parse({
		id: 'destiny-status-default',
		name: 'Destiny',
		power: 800,
		max_power: 1000,
		shields: 400,
		max_shields: 500,
		hull: 900,
		max_hull: 1000,
		water: 800,
		max_water: 1000,
		food: 500,
		max_food: 1000,
		spare_parts: 50,
		max_spare_parts: 100,
		medical_supplies: 50,
		max_medical_supplies: 100,
		race_id: 'ancients',
		star_system_id: 'system-destiny',
		stargate_id: 'destiny',
		game_time: 0,
		current_time: now,
		next_jump_time: now + (Math.floor(Math.random() * 43) + 6) * 3600 * 1000, // 6-49 hours from now
		time_speed: 1.0, // Normal time speed
		ftl_status: 'ftl',
		location: '{"systemId": "system-destiny"}',
		co2: 0.04,
		o2: 20.9,
		co2Scrubbers: 1,
		weapons: '{"mainGun": false, "turrets": {"total": 12, "working": 6}}',
		shuttles: '{"total": 2, "working": 1, "damaged": 1}',
		next_ftl_transition: (Math.floor(Math.random() * 43) + 6) * 3600,
		created_at: now,
		updated_at: now,
	});
}
