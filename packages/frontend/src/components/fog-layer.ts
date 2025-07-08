import * as PIXI from 'pixi.js';

import { FogOfWarManager } from '../services/fog-of-war-manager';

export interface FogLayerOptions {
    onFogDiscovery?: (newTilesDiscovered: number) => void;
    onFogClear?: () => void;
}

export interface ViewportBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export class FogLayer extends PIXI.Container {
	private fogOfWarManager: FogOfWarManager | null = null;
	private fogLayer: PIXI.Container | null = null;
    
	// Object pooling for performance
	private fogTilePool: PIXI.Graphics[] = [];
	private activeFogTiles: PIXI.Graphics[] = [];
    
	// Viewport optimization
	private lastViewportBounds: ViewportBounds | null = null;
    
	private options: FogLayerOptions;

	constructor(options: FogLayerOptions = {}) {
		super();
		this.options = options;
		this.initialize();
	}

	private initialize(): void {
		// Initialize Fog of War manager
		this.fogOfWarManager = new FogOfWarManager();

		// Initialize fog layer container
		this.fogLayer = new PIXI.Container();
		this.addChild(this.fogLayer);

		console.log('[FOG] Fog layer initialized');
	}

	public getFogOfWarManager(): FogOfWarManager | null {
		return this.fogOfWarManager;
	}

	public isTileDiscovered(worldX: number, worldY: number): boolean {
		return this.fogOfWarManager?.isTileDiscovered(worldX, worldY) || false;
	}

	public forceDiscoverArea(centerX: number, centerY: number, radius: number): void {
		this.fogOfWarManager?.forceDiscoverArea(centerX, centerY, radius);
		// Force re-render after discovery
		this.lastViewportBounds = null;
	}

	public clearFogOfWar(): void {
		this.fogOfWarManager?.clearFog();
		this.returnFogTilesToPool();
		this.lastViewportBounds = null;
        
		if (this.options.onFogClear) {
			this.options.onFogClear();
		}
	}

	public updatePlayerPosition(position: { x: number; y: number; roomId: string }): boolean {
		if (!this.fogOfWarManager) return false;

		const hasNewDiscoveries = this.fogOfWarManager.updatePlayerPosition(position);
        
		if (hasNewDiscoveries) {
			// Force re-render when new tiles are discovered
			this.lastViewportBounds = null;
            
			if (this.options.onFogDiscovery) {
				this.options.onFogDiscovery(1); // Could be enhanced to count actual tiles
			}
		}

		return hasNewDiscoveries;
	}

	public renderFogOfWar(viewportBounds: ViewportBounds): void {
		if (!this.fogLayer || !this.fogOfWarManager) return;

		const config = this.fogOfWarManager.getConfig();

		// Check if viewport has changed significantly to avoid unnecessary work
		if (this.lastViewportBounds &&
            Math.abs(viewportBounds.left - this.lastViewportBounds.left) < config.tileSize &&
            Math.abs(viewportBounds.right - this.lastViewportBounds.right) < config.tileSize &&
            Math.abs(viewportBounds.top - this.lastViewportBounds.top) < config.tileSize &&
            Math.abs(viewportBounds.bottom - this.lastViewportBounds.bottom) < config.tileSize) {
			return; // Viewport hasn't changed enough to warrant re-rendering
		}

		this.lastViewportBounds = { ...viewportBounds };

		// Return all active fog tiles to the pool
		this.returnFogTilesToPool();

		// Calculate tile bounds to render
		const startTileX = Math.floor(viewportBounds.left / config.tileSize);
		const endTileX = Math.ceil(viewportBounds.right / config.tileSize);
		const startTileY = Math.floor(viewportBounds.top / config.tileSize);
		const endTileY = Math.ceil(viewportBounds.bottom / config.tileSize);

		let tilesRendered = 0;

		// Render fog tiles
		for (let tileX = startTileX; tileX <= endTileX; tileX++) {
			for (let tileY = startTileY; tileY <= endTileY; tileY++) {
				const worldX = tileX * config.tileSize;
				const worldY = tileY * config.tileSize;

				// Check if this tile is discovered
				const isDiscovered = this.fogOfWarManager.isTileDiscovered(worldX, worldY);

				if (!isDiscovered) {
					// Get or create fog tile from pool
					const fogTile = this.getFogTileFromPool();
					fogTile.x = worldX;
					fogTile.y = worldY;
					fogTile.visible = true;

					this.fogLayer.addChild(fogTile);
					this.activeFogTiles.push(fogTile);
					tilesRendered++;
				}
			}
		}

		console.log(`[FOG] Rendered ${tilesRendered} fog tiles (${this.activeFogTiles.length} total active)`);
	}

	private getFogTileFromPool(): PIXI.Graphics {
		if (this.fogTilePool.length > 0) {
			return this.fogTilePool.pop()!;
		}

		// Create new fog tile
		const fogTile = new PIXI.Graphics();
		const config = this.fogOfWarManager?.getConfig();
		if (config) {
			fogTile.rect(0, 0, config.tileSize, config.tileSize)
				.fill({ color: 0x000000, alpha: 0.7 }); // Semi-transparent black
		}
		return fogTile;
	}

	private returnFogTilesToPool(): void {
		// Remove from display and return to pool
		for (const fogTile of this.activeFogTiles) {
			if (fogTile.parent) {
				fogTile.parent.removeChild(fogTile);
			}
			fogTile.visible = false;
			this.fogTilePool.push(fogTile);
		}
		this.activeFogTiles = [];
	}

	public initializeFogData(fogData: any, playerPosition: { x: number; y: number; roomId: string }): void {
		if (this.fogOfWarManager) {
			this.fogOfWarManager.initialize(fogData, playerPosition);
			// Force re-render after initialization
			this.lastViewportBounds = null;
			console.log('[FOG] Fog data initialized');
		}
	}

	public getFogData(): any {
		return this.fogOfWarManager?.getFogData() || {};
	}

	public getConfig(): any {
		return this.fogOfWarManager?.getConfig() || {};
	}

	public destroy(): void {
		this.destroyFogResources();
        
		if (this.fogOfWarManager) {
			this.fogOfWarManager = null;
		}
        
		if (this.fogLayer) {
			this.fogLayer.destroy();
			this.fogLayer = null;
		}

		console.log('[FOG] Fog layer destroyed');
		super.destroy();
	}

	private destroyFogResources(): void {
		this.returnFogTilesToPool();

		// Destroy all pooled fog tiles
		for (const fogTile of this.fogTilePool) {
			fogTile.destroy();
		}
		this.fogTilePool = [];

		// Clear viewport tracking
		this.lastViewportBounds = null;
	}

	// Development and debugging utilities
	public getDebugInfo(): object {
		return {
			activeFogTiles: this.activeFogTiles.length,
			fogTilePool: this.fogTilePool.length,
			lastViewportBounds: this.lastViewportBounds,
			fogOfWarManagerExists: !!this.fogOfWarManager,
			config: this.getConfig(),
		};
	}

	public forceClearViewportCache(): void {
		this.lastViewportBounds = null;
		console.log('[FOG] Viewport cache cleared - next render will be forced');
	}

	// Performance monitoring
	public getPerformanceMetrics(): object {
		return {
			totalTilesInPool: this.fogTilePool.length,
			activeTilesCount: this.activeFogTiles.length,
			memoryEfficiency: this.fogTilePool.length / (this.fogTilePool.length + this.activeFogTiles.length) || 0,
			hasViewportCache: !!this.lastViewportBounds,
		};
	}
}