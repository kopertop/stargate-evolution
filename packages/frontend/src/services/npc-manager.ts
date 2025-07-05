import type { NPC, DoorTemplate, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

export interface NPCUpdateResult {
	moved: boolean;
	doorInteraction?: {
		doorId: string;
		action: 'open' | 'close';
	};
}

export class NPCManager {
	private npcs: Map<string, NPC> = new Map();
	private npcSprites: Map<string, PIXI.Graphics> = new Map();
	private npcLayer: PIXI.Container;
	private gameInstance: any; // Reference to Game instance for accessing player position
	private fidgetLoops: Map<string, NodeJS.Timeout> = new Map(); // Track active fidget loops for each NPC

	constructor(npcLayer: PIXI.Container, gameInstance?: any) {
		this.npcLayer = npcLayer;
		this.gameInstance = gameInstance;
	}

	public addNPC(npc: NPC): void {
		// Ensure NPCs with gate_spawning behavior start at the stargate center
		if (npc.behavior.type === 'gate_spawning') {
			const stargatePosition = this.gameInstance?.getStargatePosition();
			if (stargatePosition) {
				// Start NPCs slightly offset from exact center to avoid being stuck inside furniture
				const offsetAngle = Math.random() * Math.PI * 2;
				const offsetDistance = 2; // Small offset to get them outside furniture collision
				npc.movement.x = stargatePosition.x + Math.cos(offsetAngle) * offsetDistance;
				npc.movement.y = stargatePosition.y + Math.sin(offsetAngle) * offsetDistance;
				console.log(`[NPC] Starting ${npc.name} at stargate position (${npc.movement.x}, ${npc.movement.y}) with small offset`);
			} else {
				// Fallback to 0,0 if stargate not found
				npc.movement.x = 0;
				npc.movement.y = 0;
				console.warn(`[NPC] Stargate not found, starting ${npc.name} at (0,0)`);
			}
			npc.movement.target_x = null;
			npc.movement.target_y = null;
		}

		this.npcs.set(npc.id, npc);
		this.createNPCSprite(npc);
	}

	public removeNPC(npcId: string): void {
		const sprite = this.npcSprites.get(npcId);
		if (sprite) {
			this.npcLayer.removeChild(sprite);
			this.npcSprites.delete(npcId);
		}

		// Clear any active fidget loop
		const fidgetLoop = this.fidgetLoops.get(npcId);
		if (fidgetLoop) {
			clearTimeout(fidgetLoop);
			this.fidgetLoops.delete(npcId);
		}

		this.npcs.delete(npcId);
	}

	public updateNPCs(doors: DoorTemplate[], rooms: RoomTemplate[], activateDoorCallback: (doorId: string, isNPC: boolean) => boolean): NPCUpdateResult[] {
		const results: NPCUpdateResult[] = [];

		for (const npc of this.npcs.values()) {
			if (!npc.active) continue;

			const result = this.updateNPC(npc, doors, rooms, activateDoorCallback);
			if (result.moved || result.doorInteraction) {
				results.push(result);
			}
		}

		return results;
	}

	private updateNPC(npc: NPC, doors: DoorTemplate[], rooms: RoomTemplate[], activateDoorCallback: (doorId: string, isNPC: boolean) => boolean): NPCUpdateResult {
		const result: NPCUpdateResult = { moved: false };

		// Update NPC position based on behavior
		this.updateNPCBehavior(npc, doors, rooms);

		// Check for door interactions
		const doorInteraction = this.checkDoorInteractions(npc, doors, activateDoorCallback);
		if (doorInteraction) {
			result.doorInteraction = doorInteraction;
		}

		// Move NPC towards target if one exists
		if (npc.movement.target_x !== null && npc.movement.target_y !== null) {
			const moved = this.moveNPCTowardsTarget(npc, doors, rooms);
			if (moved) {
				result.moved = true;
				this.updateNPCSprite(npc);
			}
		}

		return result;
	}

	private updateNPCBehavior(npc: NPC, doors: DoorTemplate[], rooms: RoomTemplate[]): void {
		const currentRoom = rooms.find(r => r.id === npc.current_room_id);
		if (!currentRoom) return;

		switch (npc.behavior.type) {
		case 'gate_spawning':
			this.updateGateSpawningBehavior(npc, currentRoom, rooms);
			break;
		case 'patrol':
			this.updatePatrolBehavior(npc, doors, rooms);
			break;
		case 'wander':
			this.updateWanderBehavior(npc, currentRoom);
			break;
		case 'guard':
			this.updateGuardBehavior(npc, currentRoom);
			break;
		case 'idle':
			// NPCs with idle behavior don't move
			npc.movement.target_x = null;
			npc.movement.target_y = null;
			break;
		}
	}

	private updatePatrolBehavior(npc: NPC, doors: DoorTemplate[], rooms: RoomTemplate[]): void {
		if (!npc.behavior.patrol_points || npc.behavior.patrol_points.length === 0) {
			return;
		}

		const currentTarget = npc.behavior.patrol_points[npc.behavior.patrol_index];
		if (!currentTarget) return;

		// Check if NPC has reached current patrol point
		const distance = Math.sqrt(
			(npc.movement.x - currentTarget.x) ** 2 +
			(npc.movement.y - currentTarget.y) ** 2,
		);

		if (distance < 10) {
			// Reached patrol point, move to next one
			npc.behavior.patrol_index = (npc.behavior.patrol_index + 1) % npc.behavior.patrol_points.length;
			const nextTarget = npc.behavior.patrol_points[npc.behavior.patrol_index];
			npc.movement.target_x = nextTarget.x;
			npc.movement.target_y = nextTarget.y;
		} else {
			// Move towards current patrol point
			npc.movement.target_x = currentTarget.x;
			npc.movement.target_y = currentTarget.y;
		}
	}

	private updateWanderBehavior(npc: NPC, currentRoom: RoomTemplate): void {
		// Start fidget loop if not already running
		if (!this.fidgetLoops.has(npc.id)) {
			console.log(`[NPC] Starting fidget loop for wandering ${npc.name}`);
			this.startFidgetLoop(npc, currentRoom);
		}
		// Fidget loop handles all movement and pausing
	}

	private updateGuardBehavior(npc: NPC, currentRoom: RoomTemplate): void {
		// Guard behavior: stay in current position unless threatened
		// For now, just keep NPCs stationary
		npc.movement.target_x = null;
		npc.movement.target_y = null;
	}

	private updateGateSpawningBehavior(npc: NPC, currentRoom: RoomTemplate, rooms: RoomTemplate[]): void {
		const now = Date.now();
		const timeSinceSpawn = now - npc.behavior.spawn_time;

		// Find the gate room (assuming it's the room with 'gate' in the name/type)
		const gateRoom = rooms.find(r =>
			r.name?.toLowerCase().includes('gate')
			|| r.type?.toLowerCase().includes('gate')
			|| r.id.toLowerCase().includes('gate'),
		);

		if (!gateRoom) {
			console.warn('[NPC] No gate room found, defaulting to idle behavior');
			npc.behavior.type = 'idle';
			return;
		}

		// Ensure NPC is in the gate room
		if (npc.current_room_id !== gateRoom.id) {
			npc.current_room_id = gateRoom.id;
		}

		// Check if enough time has passed to start moving
		if (timeSinceSpawn < npc.behavior.exit_gate_delay) {
			// Still in spawn delay - stay at stargate position
			npc.movement.target_x = null;
			npc.movement.target_y = null;
			console.log(`[NPC] ${npc.name} waiting in spawn delay (${timeSinceSpawn}ms < ${npc.behavior.exit_gate_delay}ms)`);
			return;
		}

		// Phase 1: Exit from stargate center to somewhere in the room
		if (!npc.behavior.has_exited_gate) {
			// First time moving - pick a random spot in the gate room to move to
			if (npc.movement.target_x === null || npc.movement.target_y === null) {
				const roomCenterX = gateRoom.startX + (gateRoom.endX - gateRoom.startX) / 2;
				const roomCenterY = gateRoom.startY + (gateRoom.endY - gateRoom.startY) / 2;

				// Find a safe position that avoids collisions
				const maxRadius = Math.min(
					Math.min(gateRoom.endX - gateRoom.startX, gateRoom.endY - gateRoom.startY) / 3,
					80, // Maximum initial spread
				);

				const safePosition = this.findSafePosition(npc, roomCenterX, roomCenterY, maxRadius, gateRoom);
				if (safePosition) {
					npc.movement.target_x = safePosition.x;
					npc.movement.target_y = safePosition.y;
					console.log(`[NPC] ${npc.name} exiting stargate to position (${safePosition.x}, ${safePosition.y})`);
				} else {
					console.warn(`[NPC] ${npc.name} could not find safe position to exit stargate!`);
				}
			}

			// Check if reached initial exit position
			if (npc.movement.target_x && npc.movement.target_y) {
				const distance = Math.sqrt(
					(npc.movement.x - npc.movement.target_x) ** 2 +
					(npc.movement.y - npc.movement.target_y) ** 2,
				);

				if (distance < 5) {
					// Reached initial position - mark as exited and start fidgeting phase
					npc.behavior.has_exited_gate = true;
					npc.movement.target_x = null;
					npc.movement.target_y = null;
					console.log(`[NPC] ${npc.name} has exited stargate, starting fidget loop`);

					// Start the fidget loop
					this.startFidgetLoop(npc, gateRoom);
				}
			}
			return;
		}

		// Phase 2: Fidget behavior (restricted to gate room)
		if (npc.behavior.restricted_to_gate_room) {
			// Fidget loop is now handled independently by startFidgetLoop method
			// This section is managed by the loop system, no need for manual logic here
		}
		// If not restricted, this would be where scripts would take over
		// For now, keep them in gate room until script system is implemented
	}

	private checkDoorInteractions(
		npc: NPC,
		doors: DoorTemplate[],
		activateDoorCallback: (doorId: string, isNPC: boolean) => boolean,
	): {
		doorId: string;
		action: 'open' | 'close';
	} | null {
		if (!npc.can_open_doors) return null;

		// If NPC is restricted to gate room, don't allow door interactions that would leave it
		if (npc.behavior.restricted_to_gate_room && npc.behavior.type === 'gate_spawning') {
			return null;
		}

		// Find nearby doors
		const nearbyDoors = doors.filter(door => {
			const distance = Math.sqrt(
				(npc.movement.x - door.x) ** 2 +
				(npc.movement.y - door.y) ** 2,
			);
			return distance <= npc.interaction_range;
		});

		for (const door of nearbyDoors) {
			// Check if NPC needs to open this door to continue movement
			if (door.state === 'closed' && this.npcNeedsDoorOpen(npc, door)) {
				if (activateDoorCallback(door.id, true)) {
					return { doorId: door.id, action: 'open' };
				}
			}
		}

		return null;
	}

	private npcNeedsDoorOpen(npc: NPC, door: DoorTemplate): boolean {
		// Check if NPC's target is on the other side of this door
		if (npc.movement.target_x === null || npc.movement.target_y === null) {
			return false;
		}

		// Simple check: if door is between NPC and target
		const npcToDoor = Math.sqrt(
			(npc.movement.x - door.x) ** 2 +
			(npc.movement.y - door.y) ** 2,
		);
		const doorToTarget = Math.sqrt(
			(door.x - (npc.movement.target_x ?? 0)) ** 2 +
			(door.y - (npc.movement.target_y ?? 0)) ** 2,
		);
		const npcToTarget = Math.sqrt(
			(npc.movement.x - (npc.movement.target_x ?? 0)) ** 2 +
			(npc.movement.y - (npc.movement.target_y ?? 0)) ** 2,
		);

		// If going through door is shorter than direct path, NPC needs door open
		return (npcToDoor + doorToTarget) < (npcToTarget + 20);
	}

	private moveNPCTowardsTarget(npc: NPC, doors: DoorTemplate[], rooms: RoomTemplate[]): boolean {
		if (npc.movement.target_x === null || npc.movement.target_y === null ||
			npc.movement.target_x === undefined || npc.movement.target_y === undefined) {
			return false;
		}

		const dx = npc.movement.target_x - npc.movement.x;
		const dy = npc.movement.target_y - npc.movement.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < 1) {
			// Reached target
			npc.movement.x = npc.movement.target_x ?? npc.movement.x;
			npc.movement.y = npc.movement.target_y ?? npc.movement.y;
			npc.movement.target_x = null;
			npc.movement.target_y = null;
			return true;
		}

		// Calculate movement step
		const moveX = (dx / distance) * npc.movement.speed;
		const moveY = (dy / distance) * npc.movement.speed;

		const newX = npc.movement.x + moveX;
		const newY = npc.movement.y + moveY;

		// Check collision with walls, furniture, other NPCs, and player
		if (this.isValidNPCPosition(newX, newY, npc, doors, rooms)) {
			npc.movement.x = newX;
			npc.movement.y = newY;
			npc.movement.last_updated = Date.now();
			return true;
		} else {
			// Debug: Log why movement was blocked
			console.log(`[NPC] ${npc.name} movement blocked from (${npc.movement.x}, ${npc.movement.y}) to (${newX}, ${newY})`);
		}

		return false;
	}

	private isValidNPCPosition(x: number, y: number, npc: NPC, doors: DoorTemplate[], rooms: RoomTemplate[]): boolean {
		// Check room boundaries
		const currentRoom = rooms.find(r => r.id === npc.current_room_id);
		if (!currentRoom) return false;

		const margin = npc.size + 5;
		if (x < currentRoom.startX + margin || x > currentRoom.endX - margin ||
			y < currentRoom.startY + margin || y > currentRoom.endY - margin) {
			return false;
		}

		// Check furniture collisions (but allow stargate spawning)
		if (this.gameInstance && this.gameInstance.findCollidingFurniture) {
			const collidingFurniture = this.gameInstance.findCollidingFurniture(x, y, npc.size);
			if (collidingFurniture) {
				// Allow NPCs to spawn and move within stargate area during gate spawning behavior
				if (npc.behavior.type === 'gate_spawning' && collidingFurniture.id === 'stargate') {
					// Allow movement within stargate area for spawning and initial exit
					const stargatePos = this.gameInstance.getStargatePosition();
					if (stargatePos) {
						const distanceFromStargate = Math.sqrt((x - stargatePos.x) ** 2 + (y - stargatePos.y) ** 2);
						// Allow larger radius for movement during gate spawning phase
						const allowedRadius = npc.behavior.has_exited_gate ? npc.size + 5 : npc.size + 15;
						if (distanceFromStargate <= allowedRadius) {
							console.log(`[NPC] ${npc.name} allowed to move within stargate area (distance: ${distanceFromStargate.toFixed(1)}, allowed: ${allowedRadius})`);
							return true;
						}
					}
				}
				console.log(`[NPC] ${npc.name} blocked by furniture: ${collidingFurniture.id}`);
				return false;
			}
		}

		// Check door collisions (only closed doors block movement)
		for (const door of doors) {
			if (door.state === 'closed') {
				const doorDistance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
				if (doorDistance < npc.size + door.width / 2) {
					return false;
				}
			}
		}

		// Check collision with player
		if (this.gameInstance && this.gameInstance.getPlayerPosition) {
			const playerPosition = this.gameInstance.getPlayerPosition();
			const playerDistance = Math.sqrt((x - playerPosition.x) ** 2 + (y - playerPosition.y) ** 2);
			const minPlayerDistance = npc.size + 8; // Player radius + NPC radius + small buffer
			if (playerDistance < minPlayerDistance) {
				return false;
			}
		}

		// Check collision with other NPCs only when stopping (not during movement)
		// NPCs can pass through each other but shouldn't stop on top of each other
		if (npc.movement.target_x !== null && npc.movement.target_y !== null) {
			// Check if this is close to the target position (i.e., about to stop)
			const distanceToTarget = Math.sqrt((x - npc.movement.target_x!) ** 2 + (y - npc.movement.target_y!) ** 2);
			if (distanceToTarget < 5) { // Close to target, check for NPC collisions
				for (const otherNpc of this.npcs.values()) {
					if (otherNpc.id === npc.id) continue; // Skip self

					const otherDistance = Math.sqrt((x - otherNpc.movement.x) ** 2 + (y - otherNpc.movement.y) ** 2);
					const minNpcDistance = npc.size + otherNpc.size + 3; // Both NPC radii + small buffer
					if (otherDistance < minNpcDistance) {
						console.log(`[NPC] ${npc.name} blocked from stopping near ${otherNpc.name} (distance: ${otherDistance.toFixed(1)})`);
						return false;
					}
				}
			}
			// Allow movement through other NPCs when not near target
		}

		return true;
	}

	private findSafePosition(npc: NPC, centerX: number, centerY: number, maxRadius: number, room: RoomTemplate): { x: number; y: number } | null {
		// Try to find a position that doesn't have other NPCs stopped there
		const maxAttempts = 20; // Increased attempts since NPCs can pass through each other

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * maxRadius;

			const testX = centerX + Math.cos(angle) * distance;
			const testY = centerY + Math.sin(angle) * distance;

			// Check basic room boundaries and furniture collisions
			const doors = this.gameInstance ? (this.gameInstance.doors || []) : [];
			const rooms = this.gameInstance ? (this.gameInstance.rooms || [room]) : [room];

			// Temporarily set target to test position for collision checking
			const originalTargetX = npc.movement.target_x;
			const originalTargetY = npc.movement.target_y;
			npc.movement.target_x = testX;
			npc.movement.target_y = testY;

			const isValid = this.isValidNPCPosition(testX, testY, npc, doors, rooms);

			// Restore original target
			npc.movement.target_x = originalTargetX;
			npc.movement.target_y = originalTargetY;

			if (isValid) {
				console.log(`[NPC] Found safe position for ${npc.name} at (${testX.toFixed(1)}, ${testY.toFixed(1)}) after ${attempt + 1} attempts`);
				return { x: testX, y: testY };
			}
		}

		// If no safe position found, return a position anyway (fallback)
		const angle = Math.random() * Math.PI * 2;
		const distance = Math.random() * maxRadius;
		console.warn(`[NPC] Could not find safe position for ${npc.name}, using fallback position`);
		return {
			x: centerX + Math.cos(angle) * distance,
			y: centerY + Math.sin(angle) * distance,
		};
	}

	private createNPCSprite(npc: NPC): void {
		const sprite = new PIXI.Graphics();
		// Solid circle with no outline
		sprite.circle(0, 0, npc.size).fill(parseInt(npc.color.replace('#', '0x')));
		sprite.x = npc.movement.x;
		sprite.y = npc.movement.y;

		this.npcSprites.set(npc.id, sprite);
		this.npcLayer.addChild(sprite);
	}

	private updateNPCSprite(npc: NPC): void {
		const sprite = this.npcSprites.get(npc.id);
		if (sprite) {
			sprite.x = npc.movement.x;
			sprite.y = npc.movement.y;
		}
	}

	public getNPCs(): NPC[] {
		return Array.from(this.npcs.values());
	}

	public getNPC(id: string): NPC | undefined {
		return this.npcs.get(id);
	}

	private startFidgetLoop(npc: NPC, room: RoomTemplate): void {
		// Clear any existing loop for this NPC
		const existingLoop = this.fidgetLoops.get(npc.id);
		if (existingLoop) {
			clearTimeout(existingLoop);
		}

		const fidgetLoop = () => {
			// Check if NPC still exists
			if (!this.npcs.has(npc.id)) {
				this.fidgetLoops.delete(npc.id);
				return;
			}

			// Phase 1: Move in one direction for 5-30 seconds
			const roomCenterX = room.startX + (room.endX - room.startX) / 2;
			const roomCenterY = room.startY + (room.endY - room.startY) / 2;

			// Choose a random direction and distance
			const angle = Math.random() * Math.PI * 2;
			const maxRadius = Math.min(npc.behavior.wander_radius || 50,
				Math.min(room.endX - room.startX, room.endY - room.startY) / 3);
			const distance = Math.random() * maxRadius;

			const targetX = roomCenterX + Math.cos(angle) * distance;
			const targetY = roomCenterY + Math.sin(angle) * distance;

			// Find a safe position near the target
			const safePosition = this.findSafePosition(npc, targetX, targetY, 20, room);
			if (safePosition) {
				npc.movement.target_x = safePosition.x;
				npc.movement.target_y = safePosition.y;

				const moveDuration = 5000 + Math.random() * 25000; // 5-30 seconds
				console.log(`[NPC] ${npc.name} starting ${(moveDuration/1000).toFixed(1)}s move to (${safePosition.x.toFixed(1)}, ${safePosition.y.toFixed(1)})`);

				// After move duration, stop and pause
				const moveTimeout = setTimeout(() => {
					// Phase 2: Pause for 30-120 seconds
					npc.movement.target_x = null;
					npc.movement.target_y = null;

					const pauseDuration = 30000 + Math.random() * 90000; // 30-120 seconds
					console.log(`[NPC] ${npc.name} pausing for ${(pauseDuration/1000).toFixed(1)}s`);

					// After pause, start the next loop iteration
					const pauseTimeout = setTimeout(() => {
						fidgetLoop(); // Recursive call to continue the loop
					}, pauseDuration);

					this.fidgetLoops.set(npc.id, pauseTimeout);
				}, moveDuration);

				this.fidgetLoops.set(npc.id, moveTimeout);
			} else {
				// If no safe position found, just pause and try again
				console.warn(`[NPC] ${npc.name} could not find safe fidget position, pausing`);
				const retryTimeout = setTimeout(() => {
					fidgetLoop();
				}, 10000); // Retry in 10 seconds

				this.fidgetLoops.set(npc.id, retryTimeout);
			}
		};

		// Start the first iteration
		fidgetLoop();
	}
}
