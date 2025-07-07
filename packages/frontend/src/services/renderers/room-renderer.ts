import type { RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

import type { LayerManager } from '../../types/renderer-types';

/**
 * RoomRenderer handles the rendering of room graphics including floors, walls, and labels.
 * This centralizes all room-specific rendering logic that was previously in the Game class.
 */
export class RoomRenderer {
	private layerManager: LayerManager;
	private roomsLayer: PIXI.Container;
	private rooms: RoomTemplate[] = [];

	// Room rendering configuration
	private config = {
		floorColor: 0x333355, // Dark blue-gray floor
		wallColor: 0x88AAFF, // Light blue walls
		wallWidth: 8, // Wall border thickness
		labelColor: 0xFFFF00, // Yellow labels
		labelFontSize: 18,
		labelOffset: 30, // Distance above room
	};

	constructor(layerManager: LayerManager) {
		this.layerManager = layerManager;

		// Get or create the rooms layer
		this.roomsLayer = this.layerManager.getLayer('rooms') || this.layerManager.createLayer('rooms', 1);

		console.log('[ROOM-RENDERER] Initialized with rooms layer');
	}

	/**
	 * Update the room data to be rendered
	 */
	updateRooms(rooms: RoomTemplate[]): void {
		this.rooms = rooms;
		console.log(`[ROOM-RENDERER] Updated room data: ${rooms.length} rooms`);
	}

	/**
	 * Update rendering configuration
	 */
	updateConfig(newConfig: Partial<typeof RoomRenderer.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[ROOM-RENDERER] Updated rendering config');
	}

	/**
	 * Render all rooms
	 */
	renderAll(): void {
		if (!this.roomsLayer) return;

		console.log('[ROOM-RENDERER] Rendering all rooms...');

		// Clear existing room graphics
		this.roomsLayer.removeChildren();

		// Render each room
		for (const room of this.rooms) {
			this.renderRoom(room);
		}

		console.log(`[ROOM-RENDERER] Rendered ${this.rooms.length} rooms`);
	}

	/**
	 * Render a single room
	 */
	renderRoom(room: RoomTemplate): void {
		if (!this.roomsLayer) return;

		// Calculate room dimensions from coordinates
		const width = room.endX - room.startX;
		const height = room.endY - room.startY;
		const centerX = room.startX + width / 2;
		const centerY = room.startY + height / 2;

		// Create room graphics container
		const roomContainer = new PIXI.Container();
		roomContainer.x = centerX;
		roomContainer.y = centerY;

		// Create room floor
		const floorGraphics = new PIXI.Graphics();
		floorGraphics.rect(-width/2, -height/2, width, height).fill(this.config.floorColor);
		roomContainer.addChild(floorGraphics);

		// Create room walls (border)
		const wallGraphics = new PIXI.Graphics();
		wallGraphics.rect(-width/2, -height/2, width, height)
			.stroke({ color: this.config.wallColor, width: this.config.wallWidth });
		roomContainer.addChild(wallGraphics);

		// Add room label
		const label = new PIXI.Text({
			text: room.name || room.id,
			style: {
				fontFamily: 'Arial',
				fontSize: this.config.labelFontSize,
				fill: this.config.labelColor,
				align: 'center',
			},
		});
		label.anchor.set(0.5);
		label.x = 0;
		label.y = -height/2 - this.config.labelOffset;
		roomContainer.addChild(label);

		// Add room container to layer
		this.roomsLayer.addChild(roomContainer);

		console.log(`[ROOM-RENDERER] Rendered room: ${room.name || room.id} at (${centerX}, ${centerY}) size (${width}x${height})`);
	}

	/**
	 * Get room bounds for camera positioning
	 */
	getRoomsBounds(): { minX: number; maxX: number; minY: number; maxY: number } | null {
		if (this.rooms.length === 0) return null;

		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		for (const room of this.rooms) {
			minX = Math.min(minX, room.startX);
			maxX = Math.max(maxX, room.endX);
			minY = Math.min(minY, room.startY);
			maxY = Math.max(maxY, room.endY);
		}

		return { minX, maxX, minY, maxY };
	}

	/**
	 * Get the center point of all rooms
	 */
	getRoomsCenter(): { x: number; y: number } | null {
		const bounds = this.getRoomsBounds();
		if (!bounds) return null;

		return {
			x: (bounds.minX + bounds.maxX) / 2,
			y: (bounds.minY + bounds.maxY) / 2,
		};
	}

	/**
	 * Find room containing a specific point
	 */
	findRoomContainingPoint(x: number, y: number): RoomTemplate | null {
		return this.rooms.find(room =>
			x >= room.startX && x <= room.endX &&
			y >= room.startY && y <= room.endY,
		) || null;
	}

	/**
	 * Get all rooms
	 */
	getRooms(): RoomTemplate[] {
		return [...this.rooms];
	}

	/**
	 * Get room by ID
	 */
	getRoomById(roomId: string): RoomTemplate | null {
		return this.rooms.find(room => room.id === roomId) || null;
	}

	/**
	 * Clear all rendered rooms
	 */
	clear(): void {
		if (this.roomsLayer) {
			this.roomsLayer.removeChildren();
		}
		console.log('[ROOM-RENDERER] Cleared all room graphics');
	}

	/**
	 * Show/hide room layer
	 */
	setVisible(visible: boolean): void {
		this.layerManager.setLayerVisibility('rooms', visible);
		console.log(`[ROOM-RENDERER] Set rooms layer visibility: ${visible}`);
	}

	/**
	 * Get room rendering statistics
	 */
	getStats(): {
		totalRooms: number;
		roomsLayer: string;
		config: typeof RoomRenderer.prototype.config;
		} {
		return {
			totalRooms: this.rooms.length,
			roomsLayer: this.roomsLayer ? 'available' : 'missing',
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		this.rooms = [];
		console.log('[ROOM-RENDERER] Room renderer destroyed');
	}
}
