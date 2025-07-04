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

	constructor(npcLayer: PIXI.Container) {
		this.npcLayer = npcLayer;
	}

	public addNPC(npc: NPC): void {
		this.npcs.set(npc.id, npc);
		this.createNPCSprite(npc);
	}

	public removeNPC(npcId: string): void {
		const sprite = this.npcSprites.get(npcId);
		if (sprite) {
			this.npcLayer.removeChild(sprite);
			this.npcSprites.delete(npcId);
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
		// Generate random target within room boundaries
		if (npc.movement.target_x === null || npc.movement.target_y === null) {
			const roomCenterX = currentRoom.startX + (currentRoom.endX - currentRoom.startX) / 2;
			const roomCenterY = currentRoom.startY + (currentRoom.endY - currentRoom.startY) / 2;

			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * Math.min(npc.behavior.wander_radius,
				Math.min(currentRoom.endX - currentRoom.startX, currentRoom.endY - currentRoom.startY) / 4);

			npc.movement.target_x = roomCenterX + Math.cos(angle) * distance;
			npc.movement.target_y = roomCenterY + Math.sin(angle) * distance;
		}

		// Check if reached target
		if (npc.movement.target_x === null || npc.movement.target_y === null ||
			npc.movement.target_x === undefined || npc.movement.target_y === undefined) return;

		const distance = Math.sqrt(
			(npc.movement.x - npc.movement.target_x) ** 2 +
			(npc.movement.y - npc.movement.target_y) ** 2,
		);

		if (distance < 5) {
			// Reached target, pick a new one after a delay
			setTimeout(() => {
				npc.movement.target_x = null;
				npc.movement.target_y = null;
			}, 1000 + Math.random() * 3000); // Wait 1-4 seconds
		}
	}

	private updateGuardBehavior(npc: NPC, currentRoom: RoomTemplate): void {
		// Guard behavior: stay in current position unless threatened
		// For now, just keep NPCs stationary
		npc.movement.target_x = null;
		npc.movement.target_y = null;
	}

	private checkDoorInteractions(npc: NPC, doors: DoorTemplate[], activateDoorCallback: (doorId: string, isNPC: boolean) => boolean): { doorId: string; action: 'open' | 'close' } | null {
		if (!npc.can_open_doors) return null;

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

		// Check collision with walls and furniture (similar to player collision)
		if (this.isValidNPCPosition(newX, newY, npc, doors, rooms)) {
			npc.movement.x = newX;
			npc.movement.y = newY;
			npc.movement.last_updated = Date.now();
			return true;
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

		// Check door collisions (only closed doors block movement)
		for (const door of doors) {
			if (door.state === 'closed') {
				const doorDistance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
				if (doorDistance < npc.size + door.width / 2) {
					return false;
				}
			}
		}

		return true;
	}

	private createNPCSprite(npc: NPC): void {
		const sprite = new PIXI.Graphics();
		sprite.circle(0, 0, npc.size).fill(parseInt(npc.color.replace('#', '0x')));
		sprite.circle(0, 0, npc.size).stroke({ color: 0xFFFFFF, width: 1 });
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
}
