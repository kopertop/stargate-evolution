import type { Door, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

export interface DoorsLayerOptions {
	onDoorStateChange?: (doorId: string, newState: string) => void;
}

export class DoorsLayer extends PIXI.Container {
	private doors: Door[] = [];
	private rooms: RoomTemplate[] = [];
	private options: DoorsLayerOptions;

	constructor(options: DoorsLayerOptions = {}) {
		super();
		this.options = options;
	}

	public setDoors(doors: Door[]): void {
		this.doors = [...doors];
		this.render();
	}

	public setRooms(rooms: RoomTemplate[]): void {
		this.rooms = [...rooms];
	}

	public getDoors(): Door[] {
		return [...this.doors];
	}

	public findDoor(doorId: string): Door | undefined {
		return this.doors.find(d => d.id === doorId);
	}

	public findDoorBetweenRooms(roomId1: string, roomId2: string): Door | null {
		return this.doors.find(door =>
			(door.from_room_id === roomId1 && door.to_room_id === roomId2) ||
			(door.from_room_id === roomId2 && door.to_room_id === roomId1),
		) || null;
	}

	public findNearbyOpenDoor(x: number, y: number, radius: number): Door | null {
		return this.doors.find(door => {
			if (door.state !== 'opened') return false;
			const distance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
			return distance <= radius;
		}) || null;
	}

	public findCollidingDoor(x: number, y: number, playerRadius: number): Door | null {
		for (const door of this.doors) {
			if (this.isDoorColliding(door, x, y, playerRadius)) {
				return door;
			}
		}
		return null;
	}

	public isPointNearDoor(x: number, y: number, door: Door, tolerance: number): boolean {
		const dx = x - door.x;
		const dy = y - door.y;

		const rotationRad = (door.rotation * Math.PI) / 180;

		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		const halfWidth = door.width / 2 + tolerance;
		const halfHeight = door.height / 2 + tolerance;

		return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
	}

	public isPassingThroughDoor(currentX: number, currentY: number, newX: number, newY: number, door: Door, playerRadius: number): boolean {
		const doorTolerance = 15;

		const currentNearDoor = this.isPointNearDoor(currentX, currentY, door, playerRadius + doorTolerance);
		const newNearDoor = this.isPointNearDoor(newX, newY, door, playerRadius + doorTolerance);

		return currentNearDoor || newNearDoor;
	}

	public activateDoor(doorId: string, isNPC: boolean = false): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOORS] Door not found:', doorId);
			return false;
		}

		if (door.state === 'locked') {
			console.log('[DOORS] Cannot activate locked door:', doorId);
			return false;
		}

		if (isNPC) {
			if (!door.cleared) {
				console.log('[DOORS] NPC cannot open uncleared door:', doorId);
				return false;
			}
			if (door.restricted) {
				console.log('[DOORS] NPC cannot open restricted door:', doorId);
				return false;
			}
		}

		if (door.power_required > 0) {
			console.log('[DOORS] Door requires power:', door.power_required);
		}

		const oldState = door.state;
		if (door.state === 'opened') {
			door.state = 'closed';
			console.log('[DOORS] Closed door:', doorId);
		} else if (door.state === 'closed') {
			door.state = 'opened';
			console.log('[DOORS] Opened door:', doorId);

			if (!isNPC && !door.cleared) {
				door.cleared = true;
				console.log('[DOORS] Marked door as cleared by user:', doorId);
			}
		}

		this.render();

		if (this.options.onDoorStateChange && oldState !== door.state) {
			this.options.onDoorStateChange(doorId, door.state);
		}

		return true;
	}

	public handleActivation(playerX: number, playerY: number, interactionRadius: number = 25): string | null {
		let closestDoor: Door | null = null;
		let closestDistance = Infinity;

		for (const door of this.doors) {
			const distance = Math.sqrt((playerX - door.x) ** 2 + (playerY - door.y) ** 2);
			if (distance <= interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestDoor = door;
			}
		}

		if (closestDoor) {
			const success = this.activateDoor(closestDoor.id);
			return success ? closestDoor.id : null;
		}

		console.log('[DOORS] No doors nearby to activate');
		return null;
	}

	public setDoorRestricted(doorId: string, restricted: boolean): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOORS] Door not found for restriction update:', doorId);
			return false;
		}

		door.restricted = restricted;
		console.log('[DOORS] Set door restriction:', doorId, 'restricted:', restricted);
		this.render();
		return true;
	}

	public getDoorStates(): any[] {
		return this.doors.map(door => ({
			id: door.id,
			state: door.state,
			from_room_id: door.from_room_id,
			to_room_id: door.to_room_id,
			x: door.x,
			y: door.y,
			width: door.width,
			height: door.height,
			rotation: door.rotation,
			is_automatic: door.is_automatic,
			open_direction: door.open_direction,
			style: door.style,
			color: door.color,
			requirements: door.requirements,
			power_required: door.power_required,
			cleared: door.cleared,
			restricted: door.restricted,
		}));
	}

	public restoreDoorStates(doorStates: any[]): void {
		console.log('[DOORS] Restoring door states:', doorStates.length, 'doors');

		let restoredCount = 0;
		let skippedCount = 0;

		doorStates.forEach(savedDoor => {
			const doorIndex = this.doors.findIndex(d => d.id === savedDoor.id);
			if (doorIndex !== -1) {
				this.doors[doorIndex] = { ...this.doors[doorIndex], ...savedDoor };
				restoredCount++;
				console.log('[DOORS] Restored door state:', savedDoor.id, 'state:', savedDoor.state);
			} else {
				skippedCount++;
				console.log('[DOORS] Skipped missing door:', savedDoor.id);
			}
		});

		console.log(`[DOORS] Door restoration complete: ${restoredCount} restored, ${skippedCount} skipped`);
		this.render();
	}

	private isDoorColliding(door: Door, x: number, y: number, playerRadius: number): boolean {
		const dx = x - door.x;
		const dy = y - door.y;

		const rotationRad = (door.rotation * Math.PI) / 180;

		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		const halfWidth = door.width / 2;
		const halfHeight = door.height / 2;

		const closestX = Math.max(-halfWidth, Math.min(localX, halfWidth));
		const closestY = Math.max(-halfHeight, Math.min(localY, halfHeight));

		const distance = Math.sqrt((localX - closestX) ** 2 + (localY - closestY) ** 2);

		return distance <= playerRadius;
	}

	private render(): void {
		this.removeChildren();

		this.doors.forEach(door => {
			this.renderDoor(door);
		});

		console.log('[DOORS] Rendered', this.doors.length, 'doors');
	}

	private renderDoor(door: Door): void {
		const doorGraphics = new PIXI.Graphics();

		let doorColor: number;
		switch (door.state) {
		case 'opened':
			doorColor = 0x00FF00;
			break;
		case 'locked':
			doorColor = 0x800000;
			break;
		case 'closed':
		default:
			doorColor = 0xFF0000;
			break;
		}

		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).fill(doorColor);
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).stroke({ color: 0xFFFFFF, width: 2 });

		doorGraphics.x = door.x;
		doorGraphics.y = door.y;
		doorGraphics.rotation = (door.rotation * Math.PI) / 180;

		this.addChild(doorGraphics);

		console.log(`[DOORS] Rendered door at (${door.x}, ${door.y}) size (${door.width}x${door.height}) rotation: ${door.rotation}° state: ${door.state}`);
	}
}
