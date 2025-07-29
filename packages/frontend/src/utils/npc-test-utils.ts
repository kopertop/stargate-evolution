import type { NPC } from '@stargate/common';

/**
 * Utility functions for testing NPC functionality
 */

export function createTestNPC(overrides: Partial<NPC> = {}): NPC {
	const now = Date.now();
	const defaultNPC: NPC = {
		id: `npc-${now}-${Math.random().toString(36).substr(2, 9)}`,
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
		current_room_id: 'gate_room', // Start in gate room
		health: 100,
		hunger: 100,
		thirst: 100,
		fatigue: 100,
		created_at: now,
		updated_at: now,

		// NPC-specific properties
		is_npc: true,
		active: true,
		floor: 0, // Default to floor 0, can be overridden

		movement: {
			x: 0, // Always start at 0,0 - gate spawning will position correctly
			y: 0, // Always start at 0,0 - gate spawning will position correctly
			target_x: null,
			target_y: null,
			speed: 0.5, // Slow movement speed
			last_updated: now,
		},

		behavior: {
			type: 'gate_spawning', // Start with gate spawning behavior
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 50, // Moderate radius for spreading out in gate room
			home_room_id: 'gate_room',
			aggression_level: 0,
			// Gate spawning specific properties
			spawned_from_gate: true,
			spawn_time: now,
			exit_gate_delay: 3000, // 3 seconds before they start moving
			restricted_to_gate_room: true, // Keep them in gate room until scripted
			has_exited_gate: false, // Track two-phase spawning behavior
			script_id: null,
		},

		color: '#00aaff', // Light blue (default for civilian NPCs)
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
		color: '#00aa44', // Green for security
		behavior: {
			type: 'gate_spawning', // Start with gate spawning, will change to patrol when released
			patrol_points: patrolData,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 30, // Small radius for security patrol
			home_room_id: roomIds[0],
			aggression_level: 2,
			spawned_from_gate: true,
			spawn_time: Date.now(),
			exit_gate_delay: 3000,
			restricted_to_gate_room: true,
			has_exited_gate: false,
			script_id: null,
		},
		current_room_id: 'gate_room', // Start in gate room
		...overrides,
	});
}

export function createWanderingNPC(roomId: string, centerX: number, centerY: number, overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Wandering Crew',
		role: 'civilian',
		color: '#00aaff', // Light blue for civilians
		behavior: {
			type: 'gate_spawning', // Start with gate spawning, will change to wander when released
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 50, // Moderate radius for civilians
			home_room_id: roomId,
			aggression_level: 0,
			spawned_from_gate: true,
			spawn_time: Date.now(),
			exit_gate_delay: 3000,
			restricted_to_gate_room: true,
			has_exited_gate: false,
			script_id: null,
		},
		current_room_id: 'gate_room', // Start in gate room
		...overrides,
	});
}

export function createGuardNPC(roomId: string, x: number, y: number, overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Guard',
		role: 'security',
		color: '#00aa44', // Green for security
		behavior: {
			type: 'gate_spawning', // Start with gate spawning, will change to guard when released
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 20, // Small radius for guard posts
			home_room_id: roomId,
			aggression_level: 5,
			spawned_from_gate: true,
			spawn_time: Date.now(),
			exit_gate_delay: 3000,
			restricted_to_gate_room: true,
			has_exited_gate: false,
			script_id: null,
		},
		current_room_id: 'gate_room', // Start in gate room
		can_open_doors: false, // Guards don't leave their posts
		...overrides,
	});
}

export function createRestrictedAccessNPC(overrides: Partial<NPC> = {}): NPC {
	return createTestNPC({
		name: 'Restricted NPC',
		role: 'maintenance',
		color: '#00aa66', // Green for maintenance
		can_open_doors: true,
		respect_restrictions: false, // This NPC ignores restrictions for testing
		behavior: {
			type: 'wander',
			patrol_points: null,
			patrol_index: 0,
			follow_target_id: null,
			wander_radius: 40, // Moderate radius for maintenance
			home_room_id: 'bridge',
			aggression_level: 0,
			spawned_from_gate: false, // This NPC bypasses gate spawning for testing
			spawn_time: Date.now(),
			exit_gate_delay: 0,
			restricted_to_gate_room: false,
			has_exited_gate: true, // Already exited since it bypasses gate spawning
			script_id: null,
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

	// Find the gate room from available rooms
	const gateRoom = roomData.find(r => 
		r.id.toLowerCase().includes('gate') ||
		r.id.toLowerCase().includes('stargate'),
	);

	// Set default room ID for NPCs (prefer gate room if found)
	const defaultRoomId = gateRoom ? gateRoom.id : (roomData.length > 0 ? roomData[0].id : 'gate_room');

	// Add NPCs that spawn from the gate - all start on Floor 0 in gate room
	const npcConfigs = [
		{ name: 'Security Officer Alpha', role: 'security', color: '#00aa44', floor: 0 },
		{ name: 'Medical Officer', role: 'medical', color: '#00aaff', floor: 0 },
		{ name: 'Engineer Beta', role: 'engineer', color: '#0088cc', floor: 0 },
		{ name: 'Science Officer', role: 'science', color: '#00bbdd', floor: 0 },
	];

	npcConfigs.forEach((config, index) => {
		const npc = createTestNPC({
			...config,
			current_room_id: defaultRoomId,
			floor: config.floor, // Assign NPCs to specific floors
			behavior: {
				type: 'gate_spawning',
				patrol_points: null,
				patrol_index: 0,
				follow_target_id: null,
				wander_radius: 30,
				home_room_id: defaultRoomId,
				aggression_level: 0,
				spawned_from_gate: true,
				spawn_time: Date.now() + (index * 1000), // Stagger spawn times
				exit_gate_delay: 3000 + (index * 500), // Stagger exit delays
				restricted_to_gate_room: true,
				has_exited_gate: false,
				script_id: null,
			},
		});
		game.addNPC(npc);
	});

	console.log(`[NPC-TEST] Added ${npcConfigs.length} gate-spawning NPCs successfully`);
	console.log('[NPC-TEST] NPCs will emerge from the Stargate and remain in gate room until scripted');
}

/**
 * Helper function to release NPCs from gate room restriction
 */
export function releaseNPCFromGateRoom(game: any, npcId: string, newBehaviorType: 'patrol' | 'wander' | 'guard' | 'idle' = 'wander') {
	const npc = game.getNPC(npcId);
	if (!npc) {
		console.error(`[NPC-TEST] NPC with ID ${npcId} not found`);
		return false;
	}

	npc.behavior.restricted_to_gate_room = false;
	npc.behavior.type = newBehaviorType;
	
	console.log(`[NPC-TEST] Released NPC ${npc.name} from gate room with ${newBehaviorType} behavior`);
	return true;
}

/**
 * Helper function to release all NPCs from gate room
 */
export function releaseAllNPCsFromGateRoom(game: any, newBehaviorType: 'patrol' | 'wander' | 'guard' | 'idle' = 'wander') {
	const npcs = game.getNPCs();
	let releasedCount = 0;

	npcs.forEach((npc: any) => {
		if (npc.behavior.restricted_to_gate_room) {
			npc.behavior.restricted_to_gate_room = false;
			npc.behavior.type = newBehaviorType;
			releasedCount++;
		}
	});

	console.log(`[NPC-TEST] Released ${releasedCount} NPCs from gate room with ${newBehaviorType} behavior`);
	return releasedCount;
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
		releaseNPCFromGateRoom,
		releaseAllNPCsFromGateRoom,
	};

	console.log('[NPC-TEST] NPC test utilities exposed to window.npcTestUtils');
	console.log('[NPC-TEST] Available methods:', Object.keys((window as any).npcTestUtils));
	console.log('[NPC-TEST] Use releaseNPCFromGateRoom(game, npcId) to release specific NPCs');
	console.log('[NPC-TEST] Use releaseAllNPCsFromGateRoom(game) to release all NPCs');
}
