import type { NPC } from '@stargate/common';

/**
 * Utility functions for testing NPC functionality
 */

export function createTestNPC(overrides: Partial<NPC> = {}): NPC {
	const defaultNPC: NPC = {
		id: `npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		user_id: 'test-user',
		name: 'Test NPC',
		role: 'crew-member',
		race_template_id: null,
		progression: {
			total_experience: 0,
			current_level: 1,
			skills: [],
		},
		description: 'A test NPC for development purposes',
		image: null,
		current_room_id: 'bridge', // Default to bridge room
		health: 100,
		hunger: 100,
		thirst: 100,
		fatigue: 100,
		created_at: Date.now(),
		updated_at: Date.now(),

		// NPC-specific properties
		is_npc: true,
		active: true,

		movement: {
			x: 0, // Will be set based on room
			y: 0, // Will be set based on room
			target_x: null,
			target_y: null,
			speed: 2,
			last_updated: Date.now(),
		},

		behavior: {
			type: 'idle',
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 50,
			home_room_id: 'bridge',
			aggression_level: 0,
		},

		color: '#00ff00', // Green
		size: 5,
		can_interact: true,
		interaction_range: 25,
		can_open_doors: true,
		respect_restrictions: true,

		...overrides,
	};

	return defaultNPC;
}

export function createPatrolNPC(roomIds: string[], patrolPoints: Array<{x: number, y: number}>, overrides: Partial<NPC> = {}): NPC {
	if (roomIds.length !== patrolPoints.length) {
		throw new Error('Room IDs and patrol points arrays must have the same length');
	}

	const patrolData = roomIds.map((roomId, index) => ({
		room_id: roomId,
		x: patrolPoints[index].x,
		y: patrolPoints[index].y,
		wait_time: 2000, // Wait 2 seconds at each point
	}));

	return createTestNPC({
		name: 'Patrol Guard',
		role: 'security',
		color: '#ff6600', // Orange
		behavior: {
			type: 'patrol',
			patrol_points: patrolData,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 25,
			home_room_id: roomIds[0],
			aggression_level: 2,
		},
		movement: {
			x: patrolPoints[0].x,
			y: patrolPoints[0].y,
			target_x: null,
			target_y: null,
			speed: 3, // Slightly faster for patrol
			last_updated: Date.now(),
		},
		current_room_id: roomIds[0],
		...overrides,
	});
}

export function createWanderingNPC(roomId: string, centerX: number, centerY: number, overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Wandering Crew',
		role: 'civilian',
		color: '#0066ff', // Blue
		behavior: {
			type: 'wander',
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 75,
			home_room_id: roomId,
			aggression_level: 0,
		},
		movement: {
			x: centerX,
			y: centerY,
			target_x: null,
			target_y: null,
			speed: 1.5, // Slower wandering speed
			last_updated: Date.now(),
		},
		current_room_id: roomId,
		...overrides,
	});
}

export function createGuardNPC(roomId: string, x: number, y: number, overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Guard',
		role: 'security',
		color: '#ff0000', // Red
		behavior: {
			type: 'guard',
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 15, // Small radius for guard posts
			home_room_id: roomId,
			aggression_level: 5,
		},
		movement: {
			x: x,
			y: y,
			target_x: null,
			target_y: null,
			speed: 2.5,
			last_updated: Date.now(),
		},
		current_room_id: roomId,
		can_open_doors: false, // Guards don't leave their posts
		...overrides,
	});
}

export function createRestrictedAccessNPC(overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Restricted NPC',
		role: 'maintenance',
		color: '#666666', // Gray
		can_open_doors: true,
		respect_restrictions: false, // This NPC ignores restrictions for testing
		behavior: {
			type: 'wander',
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 100,
			home_room_id: 'bridge',
			aggression_level: 0,
		},
		...overrides,
	});
}

/**
 * Add test NPCs to a game instance for development and testing
 */
export function addTestNPCsToGame(game: any, roomData: Array<{id: string, centerX: number, centerY: number}> = []) {
	if (!game || typeof game.addNPC !== 'function') {
		console.error('Invalid game instance provided to addTestNPCsToGame');
		return;
	}

	console.log('[NPC-TEST] Adding test NPCs to game...');

	// Add a basic idle NPC
	const idleNPC = createTestNPC({
		name: 'Idle Officer',
		role: 'officer',
		color: '#00ffff',
	});
	game.addNPC(idleNPC);

	// Add NPCs based on provided room data
	if (roomData.length > 0) {
		// Add a wandering NPC to the first room
		const wandererNPC = createWanderingNPC(
			roomData[0].id,
			roomData[0].centerX,
			roomData[0].centerY,
			{ name: 'Wandering Engineer' },
		);
		game.addNPC(wandererNPC);

		// Add a patrol NPC if we have multiple rooms
		if (roomData.length > 1) {
			const patrolNPC = createPatrolNPC(
				roomData.slice(0, 3).map(r => r.id), // Use up to 3 rooms for patrol
				roomData.slice(0, 3).map(r => ({ x: r.centerX, y: r.centerY })),
				{ name: 'Security Patrol' },
			);
			game.addNPC(patrolNPC);
		}

		// Add a guard to the last room
		const lastRoom = roomData[roomData.length - 1];
		const guardNPC = createGuardNPC(
			lastRoom.id,
			lastRoom.centerX + 30, // Offset from center
			lastRoom.centerY - 20,
			{ name: 'Door Guard' },
		);
		game.addNPC(guardNPC);
	}

	console.log('[NPC-TEST] Added test NPCs successfully');
}

/**
 * Console helper for developers to add NPCs during runtime
 */
export function exposeNPCTestUtils() {
	(window as any).npcTestUtils = {
		createTestNPC,
		createPatrolNPC,
		createWanderingNPC,
		createGuardNPC,
		createRestrictedAccessNPC,
		addTestNPCsToGame,
	};

	console.log('[NPC-TEST] NPC test utilities exposed to window.npcTestUtils');
	console.log('[NPC-TEST] Available methods:', Object.keys((window as any).npcTestUtils));
}
