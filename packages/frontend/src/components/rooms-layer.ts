import type { RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

export interface RoomsLayerOptions {
	onRoomStateChange?: (roomId: string, newState: string) => void;
}

export class RoomsLayer extends PIXI.Container {
	private rooms: RoomTemplate[] = [];
	private options: RoomsLayerOptions;

	constructor(options: RoomsLayerOptions = {}) {
		super();
		this.options = options;
	}

	public setRooms(rooms: RoomTemplate[]): void {
		console.log('[RoomsLayer] setRooms called with:', rooms);
		this.rooms = [...rooms];
		this.render();
	}

	public getRooms(): RoomTemplate[] {
		return [...this.rooms];
	}

	public findRoom(roomId: string): RoomTemplate | undefined {
		return this.rooms.find(r => r.id === roomId);
	}

	public findRoomContainingPoint(x: number, y: number): RoomTemplate | null {
		return this.rooms.find(room =>
			x >= room.startX && x <= room.endX &&
			y >= room.startY && y <= room.endY,
		) || null;
	}

	public findRoomContainingPointWithThreshold(x: number, y: number, threshold: number): RoomTemplate | null {
		return this.rooms.find(room =>
			x >= room.startX + threshold && x <= room.endX - threshold &&
			y >= room.startY + threshold && y <= room.endY - threshold,
		) || null;
	}

	public findSafePositionInRoom(originalX: number, originalY: number, playerRadius: number, wallThreshold: number): { x: number; y: number }[] {
		const currentRoom = this.findRoomContainingPoint(originalX, originalY);
		if (!currentRoom) return [];

		const stepSize = 10; // Grid step size for testing positions
		const candidates: { x: number; y: number }[] = [];

		// Calculate safe bounds within the room
		const safeStartX = currentRoom.startX + wallThreshold;
		const safeEndX = currentRoom.endX - wallThreshold;
		const safeStartY = currentRoom.startY + wallThreshold;
		const safeEndY = currentRoom.endY - wallThreshold;

		// Try positions in a spiral pattern starting from room center
		const roomCenterX = currentRoom.startX + (currentRoom.endX - currentRoom.startX) / 2;
		const roomCenterY = currentRoom.startY + (currentRoom.endY - currentRoom.startY) / 2;

		// Test positions in expanding rings around the center
		for (let radius = 0; radius < Math.max(currentRoom.endX - currentRoom.startX, currentRoom.endY - currentRoom.startY) / 2; radius += stepSize) {
			const testPositions = [];

			if (radius === 0) {
				// Test center position first
				testPositions.push({ x: roomCenterX, y: roomCenterY });
			} else {
				// Test positions in a circle around the center
				const numSteps = Math.max(8, Math.floor(radius / stepSize * 2));
				for (let i = 0; i < numSteps; i++) {
					const angle = (i / numSteps) * 2 * Math.PI;
					const testX = roomCenterX + Math.cos(angle) * radius;
					const testY = roomCenterY + Math.sin(angle) * radius;

					// Keep within room bounds
					if (testX >= safeStartX && testX <= safeEndX && testY >= safeStartY && testY <= safeEndY) {
						testPositions.push({ x: testX, y: testY });
					}
				}
			}

			// Add all valid positions from this radius
			candidates.push(...testPositions);
		}

		console.log(`[ROOMS] Generated ${candidates.length} candidate safe positions`);
		return candidates;
	}

	public getCameraCenterPoint(): { x: number; y: number } | null {
		if (this.rooms.length === 0) return null;

		// Calculate center point of all rooms
		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		this.rooms.forEach(room => {
			minX = Math.min(minX, room.startX);
			maxX = Math.max(maxX, room.endX);
			minY = Math.min(minY, room.startY);
			maxY = Math.max(maxY, room.endY);
		});

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;

		return { x: centerX, y: centerY };
	}

	private render(): void {
		this.removeChildren();

		this.rooms.forEach(room => {
			this.renderRoom(room);
		});

		console.log('[ROOMS] Rendered', this.rooms.length, 'rooms');
	}

	private renderRoom(room: RoomTemplate): void {
		console.log('[RoomsLayer] Rendering room:', room);
		// Calculate room dimensions from coordinates
		const width = room.endX - room.startX;
		const height = room.endY - room.startY;
		const centerX = room.startX + width / 2;
		const centerY = room.startY + height / 2;

		// Create room graphics
		const roomGraphics = new PIXI.Graphics();

		// Room floor (bright color for visibility)
		roomGraphics.rect(-width/2, -height/2, width, height).fill(0x333355); // Dark blue-gray floor

		// Room walls (bright border)
		roomGraphics.rect(-width/2, -height/2, width, height).stroke({ color: 0x88AAFF, width: 8 }); // Light blue border - very visible

		// Position room
		roomGraphics.x = centerX;
		roomGraphics.y = centerY;

		// Add room label (larger and brighter)
		const label = new PIXI.Text({
			text: room.name,
			style: {
				fontFamily: 'Arial',
				fontSize: 18,
				fill: 0xFFFF00, // Yellow text - very visible
				align: 'center',
			},
		});
		label.anchor.set(0.5);
		label.x = centerX;
		label.y = centerY - height/2 - 30;

		this.addChild(roomGraphics);
		this.addChild(label);

		console.log(`[ROOMS] Rendered room: ${room.name} at (${centerX}, ${centerY}) size (${width}x${height})`);
	}
}
