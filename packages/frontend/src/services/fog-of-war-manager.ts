import type { FogOfWarData, PlayerPosition } from '@stargate/common';

export interface FogOfWarConfig {
	/** Size of each fog tile in pixels */
	tileSize: number;
	/** Visibility range in tiles */
	visibilityRange: number;
	/** Whether to use line-of-sight calculations */
	useLineOfSight: boolean;
}

export class FogOfWarManager {
	private fogData: FogOfWarData = {};
	private config: FogOfWarConfig;
	private playerPosition: PlayerPosition | null = null;

	// Performance optimization fields
	private lastPlayerTileX: number = Number.MAX_SAFE_INTEGER;
	private lastPlayerTileY: number = Number.MAX_SAFE_INTEGER;
	private discoveredTilesCache: Set<string> = new Set();
	private hasNewDiscoveriesFlag: boolean = false;

	// Pre-calculated visibility pattern for circular discovery
	private visibilityPattern: Array<{ dx: number; dy: number; distance: number }> = [];

	constructor(config: FogOfWarConfig = {
		tileSize: 64,
		visibilityRange: 5,
		useLineOfSight: true,
	}) {
		this.config = config;
		this.precalculateVisibilityPattern();
	}

	/**
	 * Pre-calculate the visibility pattern for circular discovery
	 * This avoids expensive distance calculations in the main loop
	 */
	private precalculateVisibilityPattern(): void {
		this.visibilityPattern = [];
		const range = this.config.visibilityRange;

		for (let dx = -range; dx <= range; dx++) {
			for (let dy = -range; dy <= range; dy++) {
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance <= range) {
					this.visibilityPattern.push({ dx, dy, distance });
				}
			}
		}

		// Sort by distance for more natural discovery order
		this.visibilityPattern.sort((a, b) => a.distance - b.distance);
	}

	/**
	 * Initialize the fog of war with existing data
	 */
	public initialize(fogData: FogOfWarData, playerPosition: PlayerPosition): void {
		this.fogData = { ...fogData };
		this.playerPosition = { ...playerPosition };

		// Update cache
		this.discoveredTilesCache.clear();
		for (const [key, value] of Object.entries(this.fogData)) {
			if (value) {
				this.discoveredTilesCache.add(key);
			}
		}

		// Reset position tracking
		const { tileX, tileY } = this.worldToFogTile(playerPosition.x, playerPosition.y);
		this.lastPlayerTileX = tileX;
		this.lastPlayerTileY = tileY;
		this.hasNewDiscoveriesFlag = false;
	}

	/**
	 * Get the current fog of war data
	 */
	public getFogData(): FogOfWarData {
		return { ...this.fogData };
	}

	/**
	 * Update the player's position and discover new tiles
	 * Returns true if new tiles were discovered
	 */
	public updatePlayerPosition(position: PlayerPosition): boolean {
		this.playerPosition = { ...position };

		const { tileX, tileY } = this.worldToFogTile(position.x, position.y);

		// Check if player moved to a different tile
		if (tileX === this.lastPlayerTileX && tileY === this.lastPlayerTileY) {
			return false; // No tile change, no need to discover
		}

		this.lastPlayerTileX = tileX;
		this.lastPlayerTileY = tileY;
		this.hasNewDiscoveriesFlag = false;

		this.discoverVisibleTiles();
		return this.hasNewDiscoveriesFlag;
	}

	/**
	 * Check if there are new discoveries since last update
	 */
	public hasNewDiscoveries(): boolean {
		return this.hasNewDiscoveriesFlag;
	}

	/**
	 * Convert world coordinates to fog tile coordinates
	 */
	private worldToFogTile(worldX: number, worldY: number): { tileX: number; tileY: number } {
		return {
			tileX: Math.floor(worldX / this.config.tileSize),
			tileY: Math.floor(worldY / this.config.tileSize),
		};
	}

	/**
	 * Convert fog tile coordinates to world coordinates (center of tile)
	 */
	private fogTileToWorld(tileX: number, tileY: number): { worldX: number; worldY: number } {
		return {
			worldX: (tileX * this.config.tileSize) + (this.config.tileSize / 2),
			worldY: (tileY * this.config.tileSize) + (this.config.tileSize / 2),
		};
	}

	/**
	 * Generate a key for a fog tile
	 */
	private getTileKey(tileX: number, tileY: number): string {
		return `${tileX},${tileY}`;
	}

	/**
	 * Check if a tile is discovered
	 */
	public isTileDiscovered(worldX: number, worldY: number): boolean {
		const { tileX, tileY } = this.worldToFogTile(worldX, worldY);
		const key = this.getTileKey(tileX, tileY);
		return this.discoveredTilesCache.has(key);
	}

	/**
	 * Mark a tile as discovered
	 */
	private discoverTile(tileX: number, tileY: number): void {
		const key = this.getTileKey(tileX, tileY);
		if (!this.discoveredTilesCache.has(key)) {
			this.fogData[key] = true;
			this.discoveredTilesCache.add(key);
			this.hasNewDiscoveriesFlag = true;
		}
	}

	/**
	 * Calculate distance between two points
	 */
	private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Check if a tile is within visibility range
	 */
	private isWithinRange(playerTileX: number, playerTileY: number, targetTileX: number, targetTileY: number): boolean {
		const distance = this.calculateDistance(playerTileX, playerTileY, targetTileX, targetTileY);
		return distance <= this.config.visibilityRange;
	}

	/**
	 * Discover all tiles within the player's current visibility range
	 * Now uses pre-calculated pattern for better performance
	 */
	private discoverVisibleTiles(): void {
		if (!this.playerPosition) return;

		const { tileX: playerTileX, tileY: playerTileY } = this.worldToFogTile(
			this.playerPosition.x,
			this.playerPosition.y,
		);

		// Use pre-calculated visibility pattern for efficiency
		for (const { dx, dy } of this.visibilityPattern) {
			const targetTileX = playerTileX + dx;
			const targetTileY = playerTileY + dy;

			if (!this.config.useLineOfSight || this.hasLineOfSight(playerTileX, playerTileY, targetTileX, targetTileY)) {
				this.discoverTile(targetTileX, targetTileY);
			}
		}
	}

	/**
	 * Check if there's a clear line of sight between two tiles using Bresenham's line algorithm
	 * This checks for obstacles like walls between the player and target tile
	 */
	private hasLineOfSight(fromTileX: number, fromTileY: number, toTileX: number, toTileY: number): boolean {
		// Get all tiles along the line from source to target
		const linePoints = this.getLinePoints(fromTileX, fromTileY, toTileX, toTileY);

		// Check each point along the line for obstacles
		for (const point of linePoints) {
			if (this.isObstacle(point.x, point.y)) {
				return false; // Line is blocked
			}
		}

		return true; // Clear line of sight
	}

	/**
	 * Get all integer points along a line using Bresenham's line algorithm
	 */
	private getLinePoints(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
		const points: Array<{ x: number; y: number }> = [];

		const dx = Math.abs(x1 - x0);
		const dy = Math.abs(y1 - y0);
		const sx = x0 < x1 ? 1 : -1;
		const sy = y0 < y1 ? 1 : -1;
		let err = dx - dy;

		let x = x0;
		let y = y0;

		while (true) {
			points.push({ x, y });

			if (x === x1 && y === y1) break;

			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				x += sx;
			}
			if (e2 < dx) {
				err += dx;
				y += sy;
			}
		}

		return points;
	}

	/**
	 * Check if a tile coordinate represents an obstacle (wall, closed door, etc.)
	 * This is a placeholder that can be enhanced to check against actual room/wall data
	 */
	private isObstacle(tileX: number, tileY: number): boolean {
		// For now, no obstacles are considered
		// This can be enhanced to check against:
		// - Room boundaries
		// - Wall positions
		// - Closed doors
		// - Furniture that blocks sight
		return false;
	}

	/**
	 * Get all discovered tiles as an array of coordinates
	 */
	public getDiscoveredTiles(): Array<{ tileX: number; tileY: number; worldX: number; worldY: number }> {
		return Array.from(this.discoveredTilesCache).map(key => {
			const [tileX, tileY] = key.split(',').map(Number);
			const { worldX, worldY } = this.fogTileToWorld(tileX, tileY);
			return { tileX, tileY, worldX, worldY };
		});
	}

	/**
	 * Clear all fog data (for debugging or new game)
	 */
	public clearFog(): void {
		this.fogData = {};
		this.discoveredTilesCache.clear();
		this.hasNewDiscoveriesFlag = false;

		// Reset position tracking to force rediscovery on next update
		this.lastPlayerTileX = Number.MAX_SAFE_INTEGER;
		this.lastPlayerTileY = Number.MAX_SAFE_INTEGER;
	}

	/**
	 * Force discover a specific tile (for debugging or special events)
	 */
	public forceDiscoverTile(worldX: number, worldY: number): void {
		const { tileX, tileY } = this.worldToFogTile(worldX, worldY);
		this.discoverTile(tileX, tileY);
	}

	/**
	 * Force discover an area around a point
	 */
	public forceDiscoverArea(centerWorldX: number, centerWorldY: number, radius: number): void {
		const { tileX: centerTileX, tileY: centerTileY } = this.worldToFogTile(centerWorldX, centerWorldY);
		const tileRadius = radius / this.config.tileSize;

		for (let dx = -Math.ceil(tileRadius); dx <= Math.ceil(tileRadius); dx++) {
			for (let dy = -Math.ceil(tileRadius); dy <= Math.ceil(tileRadius); dy++) {
				const targetTileX = centerTileX + dx;
				const targetTileY = centerTileY + dy;
				const distance = this.calculateDistance(centerTileX, centerTileY, targetTileX, targetTileY);

				if (distance < tileRadius) {
					this.discoverTile(targetTileX, targetTileY);
				}
			}
		}
	}

	/**
	 * Get configuration
	 */
	public getConfig(): FogOfWarConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<FogOfWarConfig>): void {
		const oldRange = this.config.visibilityRange;
		this.config = { ...this.config, ...newConfig };

		// Recalculate visibility pattern if range changed
		if (oldRange !== this.config.visibilityRange) {
			this.precalculateVisibilityPattern();
		}
	}
}
