import type { Door, RoomTemplate, NPC } from '@stargate/common';
import * as PIXI from 'pixi.js';

import { NPCManager } from '../services/npc-manager';
import { addTestNPCsToGame } from '../utils/npc-test-utils';

export interface NPCLayerOptions {
	onNPCStateChange?: (npcId: string, newState: string) => void;
	onNPCInteraction?: (npcId: string, interactionType: string) => void;
	gameInstance?: any; // For accessing collision detection, stargate position, etc.
}

export class NPCLayer extends PIXI.Container {
	private npcManager: NPCManager | null = null;
	private doors: Door[] = [];
	private rooms: RoomTemplate[] = [];
	private options: NPCLayerOptions;

	constructor(options: NPCLayerOptions = {}) {
		super();
		this.options = options;

		// Initialize NPCManager with this layer as container
		this.npcManager = new NPCManager(this, options.gameInstance);
	}

	public setDoors(doors: Door[]): void {
		this.doors = [...doors];
	}

	public getDoors(): Door[] {
		return [...this.doors];
	}

	public setRooms(rooms: RoomTemplate[]): void {
		this.rooms = [...rooms];
	}

	public getRooms(): RoomTemplate[] {
		return [...this.rooms];
	}

	public addNPC(npc: NPC): void {
		if (this.npcManager) {
			this.npcManager.addNPC(npc);
		}
	}

	public removeNPC(npcId: string): void {
		if (this.npcManager) {
			this.npcManager.removeNPC(npcId);
		}
	}

	public getNPCs(): NPC[] {
		if (this.npcManager) {
			return this.npcManager.getNPCs();
		}
		return [];
	}

	public getNPC(id: string): NPC | undefined {
		if (this.npcManager) {
			return this.npcManager.getNPC(id);
		}
		return undefined;
	}

	public setVisibleFloor(floor: number): void {
		// Filter NPCs to only show those on the specified floor
		if (this.npcManager) {
			const allNPCs = this.npcManager.getNPCs();
			const floorNPCs = allNPCs.filter(npc => (npc.floor || 0) === floor);

			// Hide all NPC sprites first
			this.npcManager.hideAllNPCs();

			// Show only NPCs on the current floor
			this.npcManager.showNPCsOnFloor(floor);
		}
	}

	public update(activateDoorCallback: (doorId: string, isNPC: boolean) => boolean): void {
		if (this.npcManager) {
			this.npcManager.updateNPCs(this.doors, this.rooms, activateDoorCallback);
		}
	}

	public initializeTestNPCs(): void {
		// console.log('[NPC] Initializing test NPCs...');

		if (this.rooms.length === 0) {
			console.warn('[NPC] No rooms available for test NPCs');
			return;
		}

		// Convert rooms to the format expected by test utils
		const roomData = this.rooms.map(room => ({
			id: room.id,
			centerX: room.startX + (room.endX - room.startX) / 2,
			centerY: room.startY + (room.endY - room.startY) / 2,
		}));

		// Add test NPCs using the utility function
		// Note: addTestNPCsToGame expects a game instance with addNPC method
		const mockGameInstance = {
			addNPC: (npc: NPC) => this.addNPC(npc),
		};

		try {
			addTestNPCsToGame(mockGameInstance, roomData);
			// console.log('[NPC] Test NPCs initialization requested');
		} catch (error) {
			console.error('[NPC] Failed to initialize test NPCs:', error);
		}
	}

	public destroy(): void {
		if (this.npcManager) {
			// Clean up NPCManager if it has cleanup methods
			this.npcManager = null;
		}
		super.destroy();
	}

	// Development utilities for console access
	public exposeTestUtilities(): void {
		if (typeof window !== 'undefined') {
			(window as any).npcLayer = {
				addNPC: (npc: NPC) => this.addNPC(npc),
				removeNPC: (npcId: string) => this.removeNPC(npcId),
				getNPCs: () => this.getNPCs(),
				getNPC: (id: string) => this.getNPC(id),
				initializeTestNPCs: () => this.initializeTestNPCs(),
				clearAllNPCs: () => {
					const npcs = this.getNPCs();
					npcs.forEach(npc => this.removeNPC(npc.id));
				},
			};
			console.log('[NPC] Test utilities exposed to window.npcLayer');
		}
	}
}
