import type { RoomFurniture, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

export interface FurnitureLayerOptions {
    onFurnitureStateChange?: (furnitureId: string, newState: string) => void;
}

export class FurnitureLayer extends PIXI.Container {
	private furniture: RoomFurniture[] = [];
	private rooms: RoomTemplate[] = [];
	private furnitureTextureCache: Record<string, PIXI.Texture> = {};
	private options: FurnitureLayerOptions;

	constructor(options: FurnitureLayerOptions = {}) {
		super();
		this.options = options;
	}

	public setFurniture(furniture: RoomFurniture[]): void {
		this.furniture = furniture;
		this.render();
	}

	public getFurniture(): RoomFurniture[] {
		return this.furniture;
	}

	public setRooms(rooms: RoomTemplate[]): void {
		this.rooms = rooms;
		this.render();
	}

	public handleFurnitureActivation(playerX: number, playerY: number): void {
		console.log('[FURNITURE] Handling furniture activation');
        
		let closestFurniture: RoomFurniture | null = null;
		let closestDistance = Infinity;
		const interactionRadius = 25;

		for (const furniture of this.furniture) {
			if (!furniture.interactive) continue;

			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
			const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

			const distance = Math.sqrt(
				Math.pow(playerX - worldX, 2) + Math.pow(playerY - worldY, 2),
			);

			if (distance < interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestFurniture = furniture;
			}
		}

		if (closestFurniture) {
			console.log('[FURNITURE] Activating furniture:', closestFurniture.id);
            
			if (closestFurniture.interactive) {
				closestFurniture.active = !closestFurniture.active;
				console.log('[FURNITURE] Furniture active state:', closestFurniture.active);
				this.render();
                
				if (this.options.onFurnitureStateChange) {
					this.options.onFurnitureStateChange(
						closestFurniture.id,
						closestFurniture.active ? 'active' : 'inactive',
					);
				}
			}
		}
	}

	public findCollidingFurniture(x: number, y: number, playerRadius: number): RoomFurniture | null {
		for (const furniture of this.furniture) {
			if (!furniture.blocks_movement) continue;

			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
			const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

			const furnitureLeft = worldX - furniture.width / 2;
			const furnitureRight = worldX + furniture.width / 2;
			const furnitureTop = worldY - furniture.height / 2;
			const furnitureBottom = worldY + furniture.height / 2;

			const circleLeft = x - playerRadius;
			const circleRight = x + playerRadius;
			const circleTop = y - playerRadius;
			const circleBottom = y + playerRadius;

			if (
				circleLeft < furnitureRight &&
                circleRight > furnitureLeft &&
                circleTop < furnitureBottom &&
                circleBottom > furnitureTop
			) {
				return furniture;
			}
		}

		return null;
	}

	private render(): void {
		this.removeChildren();

		for (const furniture of this.furniture) {
			this.renderFurnitureItem(furniture);
		}
	}

	private renderFurnitureItem(furniture: RoomFurniture): void {
		const room = this.rooms.find(r => r.id === furniture.room_id);
		if (!room) return;

		const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
		const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

		let imagePath = '';
		if (furniture.image && typeof furniture.image === 'object') {
			if (furniture.active && furniture.image.active) {
				imagePath = furniture.image.active;
			} else if (furniture.image.default) {
				imagePath = furniture.image.default;
			} else {
				const fallbackKeys = ['broken', 'locked', 'danger'];
				for (const key of fallbackKeys) {
					if (furniture.image[key]) {
						imagePath = furniture.image[key];
						break;
					}
				}
			}
		} else if (typeof furniture.image === 'string') {
			imagePath = furniture.image;
		}

		if (!imagePath) {
			console.warn('[FURNITURE] No image path found for furniture:', furniture.id);
			this.renderFurnitureFallback(furniture, worldX, worldY);
			return;
		}

		if (this.furnitureTextureCache[imagePath]) {
			this.createFurnitureSprite(furniture, worldX, worldY, this.furnitureTextureCache[imagePath]);
		} else {
			// Use PIXI.Assets.load like in the original code
			PIXI.Assets.load(imagePath).then(texture => {
				this.furnitureTextureCache[imagePath] = texture;
				this.createFurnitureSprite(furniture, worldX, worldY, texture);
			}).catch(error => {
				console.warn(`[FURNITURE] Failed to load furniture image: ${imagePath}`, error);
				this.renderFurnitureFallback(furniture, worldX, worldY);
			});
		}
	}

	private createFurnitureSprite(furniture: RoomFurniture, worldX: number, worldY: number, texture: PIXI.Texture): void {
		const sprite = new PIXI.Sprite(texture);
		sprite.anchor.set(0.5);
		sprite.width = furniture.width;
		sprite.height = furniture.height;
		sprite.x = worldX;
		sprite.y = worldY;
		sprite.rotation = (furniture.rotation * Math.PI) / 180;
        
		this.addChild(sprite);
		console.log(`[FURNITURE] Rendered furniture sprite: ${furniture.name} at (${worldX}, ${worldY})`);
	}

	private renderFurnitureFallback(furniture: RoomFurniture, worldX: number, worldY: number): void {
		const graphics = new PIXI.Graphics();
		
		// Create furniture graphics (bright color for visibility, like original code)
		graphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).fill(0x00FF88); // Bright green color
		graphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).stroke({ color: 0xFFFFFF, width: 2 }); // White border
		
		// Position furniture
		graphics.x = worldX;
		graphics.y = worldY;
		graphics.rotation = (furniture.rotation * Math.PI) / 180;
		
		this.addChild(graphics);
		console.log(`[FURNITURE] Rendered furniture fallback: ${furniture.name} at (${worldX}, ${worldY})`);
	}
}