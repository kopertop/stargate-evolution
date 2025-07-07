import type { RoomFurniture, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

import type { LayerManager } from '../../types/renderer-types';

/**
 * FurnitureRenderer handles the rendering of furniture items including image loading,
 * texture caching, and interaction detection.
 */
export class FurnitureRenderer {
	private layerManager: LayerManager;
	private furnitureLayer: PIXI.Container;
	private furniture: RoomFurniture[] = [];
	private rooms: RoomTemplate[] = [];

	// Texture cache for performance
	private furnitureTextureCache: Record<string, PIXI.Texture> = {};

	// Furniture rendering configuration
	private config = {
		fallbackColor: 0x00FF88, // Bright green for fallback graphics
		borderColor: 0xFFFFFF, // White border
		borderWidth: 2,
		interactionRadius: 25, // Distance for player activation
	};

	// Callbacks for external systems
	private callbacks: {
		onFurnitureActivation?: (furnitureId: string) => void;
	} = {};

	constructor(layerManager: LayerManager) {
		this.layerManager = layerManager;

		// Get or create the furniture layer
		this.furnitureLayer = this.layerManager.getLayer('furniture') || this.layerManager.createLayer('furniture', 3);

		console.log('[FURNITURE-RENDERER] Initialized with furniture layer');
	}

	/**
	 * Set callbacks for external system integration
	 */
	setCallbacks(callbacks: Partial<typeof FurnitureRenderer.prototype.callbacks>): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
		console.log('[FURNITURE-RENDERER] Updated system callbacks');
	}

	/**
	 * Update furniture and room data
	 */
	updateData(furniture: RoomFurniture[], rooms: RoomTemplate[]): void {
		this.furniture = furniture;
		this.rooms = rooms;
		console.log(`[FURNITURE-RENDERER] Updated data: ${furniture.length} furniture items, ${rooms.length} rooms`);
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<typeof FurnitureRenderer.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[FURNITURE-RENDERER] Updated configuration');
	}

	/**
	 * Render all furniture
	 */
	async renderAll(): Promise<void> {
		if (!this.furnitureLayer) return;

		console.log('[FURNITURE-RENDERER] Rendering all furniture...');

		// Clear existing furniture graphics
		this.furnitureLayer.removeChildren();

		// Render each furniture item
		for (const furniture of this.furniture) {
			await this.renderFurnitureItem(furniture);
		}

		console.log(`[FURNITURE-RENDERER] Rendered ${this.furniture.length} furniture items`);
	}

	/**
	 * Render a single furniture item
	 */
	private async renderFurnitureItem(furniture: RoomFurniture): Promise<void> {
		if (!this.furnitureLayer) return;

		// Find the room this furniture belongs to
		const room = this.rooms.find(r => r.id === furniture.room_id);
		if (!room) {
			console.warn(`[FURNITURE-RENDERER] Furniture ${furniture.name} has invalid room_id: ${furniture.room_id}`);
			return;
		}

		// Calculate room center
		const roomCenterX = room.startX + (room.endX - room.startX) / 2;
		const roomCenterY = room.startY + (room.endY - room.startY) / 2;

		// Calculate furniture world position
		const worldX = roomCenterX + furniture.x;
		const worldY = roomCenterY + furniture.y;

		// Try to render with image first
		const imageRendered = await this.tryRenderWithImage(furniture, worldX, worldY);

		if (!imageRendered) {
			// Fallback to graphics rendering
			this.renderWithGraphics(furniture, worldX, worldY);
		}
	}

	/**
	 * Try to render furniture with an image
	 */
	private async tryRenderWithImage(furniture: RoomFurniture, worldX: number, worldY: number): Promise<boolean> {
		const imageUrl = this.getImageUrl(furniture);

		if (!imageUrl) {
			return false; // No image available
		}

		try {
			// Check cache first
			let texture = this.furnitureTextureCache[imageUrl];

			if (!texture) {
				// Load texture and cache it
				texture = await PIXI.Assets.load(imageUrl);
				this.furnitureTextureCache[imageUrl] = texture;
				console.log('[FURNITURE-RENDERER] Cached texture for:', imageUrl);
			}

			// Create sprite
			const sprite = new PIXI.Sprite(texture);
			sprite.anchor.set(0.5); // Center anchor
			sprite.width = furniture.width;
			sprite.height = furniture.height;
			sprite.x = worldX;
			sprite.y = worldY;
			sprite.rotation = (furniture.rotation * Math.PI) / 180; // Convert degrees to radians

			// Store furniture reference for interaction
			(sprite as any).furnitureId = furniture.id;
			(sprite as any).interactive = furniture.interactive;

			this.furnitureLayer.addChild(sprite);

			console.log(`[FURNITURE-RENDERER] Rendered furniture image: ${furniture.name} at (${worldX}, ${worldY})`);
			return true;

		} catch (error) {
			console.warn(`[FURNITURE-RENDERER] Failed to load furniture image: ${imageUrl}`, error);
			return false;
		}
	}

	/**
	 * Render furniture with fallback graphics
	 */
	private renderWithGraphics(furniture: RoomFurniture, worldX: number, worldY: number): void {
		const furnitureGraphics = new PIXI.Graphics();

		// Draw furniture rectangle
		furnitureGraphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height)
			.fill(this.config.fallbackColor);

		// Add border
		furnitureGraphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height)
			.stroke({ color: this.config.borderColor, width: this.config.borderWidth });

		// Position furniture
		furnitureGraphics.x = worldX;
		furnitureGraphics.y = worldY;
		furnitureGraphics.rotation = (furniture.rotation * Math.PI) / 180;

		// Store furniture reference for interaction
		(furnitureGraphics as any).furnitureId = furniture.id;
		(furnitureGraphics as any).interactive = furniture.interactive;

		this.furnitureLayer.addChild(furnitureGraphics);

		console.log(`[FURNITURE-RENDERER] Rendered furniture graphics: ${furniture.name} at (${worldX}, ${worldY})`);
	}

	/**
	 * Get the appropriate image URL for furniture based on its state
	 */
	private getImageUrl(furniture: RoomFurniture): string | undefined {
		if (!furniture.image) return undefined;

		if (typeof furniture.image === 'string') {
			return furniture.image;
		}

		// Handle object-based image definitions
		if (typeof furniture.image === 'object') {
			// Try to pick the best image key based on state
			if (furniture.active && furniture.image.active) {
				return furniture.image.active;
			}

			if (furniture.image.default) {
				return furniture.image.default;
			}

			// Try other common keys
			const fallbackKeys = ['broken', 'locked', 'danger'];
			for (const key of fallbackKeys) {
				if (furniture.image[key]) {
					return furniture.image[key];
				}
			}
		}

		return undefined;
	}

	/**
	 * Handle player interaction with furniture
	 */
	handlePlayerActivation(playerX: number, playerY: number): boolean {
		// Find the closest interactive furniture within interaction range
		let closestFurniture: RoomFurniture | null = null;
		let closestDistance = Infinity;

		for (const furniture of this.furniture) {
			if (!furniture.interactive) continue;

			// Find the room this furniture belongs to
			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			// Calculate furniture world position
			const roomCenterX = room.startX + (room.endX - room.startX) / 2;
			const roomCenterY = room.startY + (room.endY - room.startY) / 2;
			const furnitureWorldX = roomCenterX + furniture.x;
			const furnitureWorldY = roomCenterY + furniture.y;

			const distance = Math.sqrt((playerX - furnitureWorldX) ** 2 + (playerY - furnitureWorldY) ** 2);
			if (distance <= this.config.interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestFurniture = furniture;
			}
		}

		if (closestFurniture) {
			return this.activateFurniture(closestFurniture);
		} else {
			console.log('[FURNITURE-RENDERER] No interactive furniture nearby to activate');
			return false;
		}
	}

	/**
	 * Activate furniture (toggle state)
	 */
	private activateFurniture(furniture: RoomFurniture): boolean {
		// Check if furniture supports activation (has multiple image states)
		if (furniture.image && typeof furniture.image === 'object' && 'active' in furniture.image) {
			const wasActive = furniture.active;
			furniture.active = !furniture.active;

			console.log(`[FURNITURE-RENDERER] Toggled furniture '${furniture.name}' to active=${furniture.active}`);

			// Notify external systems
			if (this.callbacks.onFurnitureActivation) {
				this.callbacks.onFurnitureActivation(furniture.id);
			}

			// Re-render to show state change
			this.renderAll();

			return true;
		} else {
			console.log(`[FURNITURE-RENDERER] Furniture '${furniture.name}' is not activatable`);
			return false;
		}
	}

	/**
	 * Check if player is colliding with furniture
	 */
	findCollidingFurniture(playerX: number, playerY: number, playerRadius: number): RoomFurniture | null {
		for (const furniture of this.furniture) {
			if (!furniture.blocks_movement) continue;

			// Find the room this furniture belongs to
			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			// Calculate furniture world position
			const roomCenterX = room.startX + (room.endX - room.startX) / 2;
			const roomCenterY = room.startY + (room.endY - room.startY) / 2;
			const furnitureWorldX = roomCenterX + furniture.x;
			const furnitureWorldY = roomCenterY + furniture.y;

			// Check collision with furniture bounding box
			const furnitureLeft = furnitureWorldX - furniture.width / 2;
			const furnitureRight = furnitureWorldX + furniture.width / 2;
			const furnitureTop = furnitureWorldY - furniture.height / 2;
			const furnitureBottom = furnitureWorldY + furniture.height / 2;

			// Check if player circle intersects with furniture rectangle
			const closestX = Math.max(furnitureLeft, Math.min(playerX, furnitureRight));
			const closestY = Math.max(furnitureTop, Math.min(playerY, furnitureBottom));
			const distance = Math.sqrt((playerX - closestX) ** 2 + (playerY - closestY) ** 2);

			if (distance <= playerRadius) {
				return furniture;
			}
		}
		return null;
	}

	/**
	 * Get furniture by ID
	 */
	getFurnitureById(furnitureId: string): RoomFurniture | null {
		return this.furniture.find(f => f.id === furnitureId) || null;
	}

	/**
	 * Get all furniture in a specific room
	 */
	getFurnitureInRoom(roomId: string): RoomFurniture[] {
		return this.furniture.filter(f => f.room_id === roomId);
	}

	/**
	 * Clear texture cache
	 */
	clearTextureCache(): void {
		this.furnitureTextureCache = {};
		console.log('[FURNITURE-RENDERER] Cleared texture cache');
	}

	/**
	 * Clear all rendered furniture
	 */
	clear(): void {
		if (this.furnitureLayer) {
			this.furnitureLayer.removeChildren();
		}
		console.log('[FURNITURE-RENDERER] Cleared all furniture graphics');
	}

	/**
	 * Show/hide furniture layer
	 */
	setVisible(visible: boolean): void {
		this.layerManager.setLayerVisibility('furniture', visible);
		console.log(`[FURNITURE-RENDERER] Set furniture layer visibility: ${visible}`);
	}

	/**
	 * Get furniture rendering statistics
	 */
	getStats(): {
		totalFurniture: number;
		interactiveFurniture: number;
		cachedTextures: number;
		furnitureLayer: string;
		config: typeof FurnitureRenderer.prototype.config;
		} {
		const interactiveFurniture = this.furniture.filter(f => f.interactive).length;
		const cachedTextures = Object.keys(this.furnitureTextureCache).length;

		return {
			totalFurniture: this.furniture.length,
			interactiveFurniture,
			cachedTextures,
			furnitureLayer: this.furnitureLayer ? 'available' : 'missing',
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		this.clearTextureCache();
		this.furniture = [];
		this.rooms = [];
		this.callbacks = {};
		console.log('[FURNITURE-RENDERER] Furniture renderer destroyed');
	}
}
