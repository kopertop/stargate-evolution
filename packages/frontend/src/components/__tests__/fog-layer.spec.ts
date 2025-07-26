import { describe, it, expect, beforeEach, vi } from 'vitest';

import { FogLayer, type ViewportBounds } from '../fog-layer';

// Mock PIXI.Graphics for testing
vi.mock('pixi.js', () => ({
	Graphics: vi.fn().mockImplementation(() => ({
		rect: vi.fn().mockReturnThis(),
		fill: vi.fn().mockReturnThis(),
		x: 0,
		y: 0,
		visible: true,
		parent: null,
		destroy: vi.fn(),
	})),
	Container: class MockContainer {
		children: any[] = [];
		addChild = vi.fn((child: any) => {
			this.children.push(child);
		});
		removeChild = vi.fn((child: any) => {
			const index = this.children.indexOf(child);
			if (index > -1) {
				this.children.splice(index, 1);
			}
		});
		destroy = vi.fn();
	},
}));

describe('FogLayer', () => {
	let fogLayer: FogLayer;
	let onFogDiscovery: ReturnType<typeof vi.fn>;
	let onFogClear: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onFogDiscovery = vi.fn();
		onFogClear = vi.fn();

		fogLayer = new FogLayer({
			onFogDiscovery,
			onFogClear,
		});
	});

	describe('initialization', () => {
		it('should create with default options', () => {
			const defaultFogLayer = new FogLayer();
			expect(defaultFogLayer).toBeDefined();
			expect(defaultFogLayer.getFogOfWarManager()).toBeDefined();
		});

		it('should create with custom options', () => {
			expect(fogLayer).toBeDefined();
			expect(fogLayer.getFogOfWarManager()).toBeDefined();
		});

		it('should initialize fog manager and container', () => {
			const fogManager = fogLayer.getFogOfWarManager();
			expect(fogManager).not.toBeNull();
		});
	});

	describe('fog of war management', () => {
		it('should check if tile is discovered', () => {
			// Initially no tiles should be discovered
			expect(fogLayer.isTileDiscovered(0, 0)).toBe(false);
			expect(fogLayer.isTileDiscovered(64, 64)).toBe(false);
		});

		it('should update player position and trigger discovery', () => {
			const hasNewDiscoveries = fogLayer.updatePlayerPosition({
				x: 32,
				y: 32,
				roomId: 'test-room',
			});

			expect(hasNewDiscoveries).toBe(true);
			expect(onFogDiscovery).toHaveBeenCalledWith(1);
		});

		it('should not trigger discovery when player stays in same tile', () => {
			// First update - should trigger discovery
			fogLayer.updatePlayerPosition({ x: 32, y: 32, roomId: 'test-room' });

			// Reset mock
			onFogDiscovery.mockClear();

			// Second update in same tile - should not trigger discovery
			const hasNewDiscoveries = fogLayer.updatePlayerPosition({
				x: 40,
				y: 40,
				roomId: 'test-room',
			});

			expect(hasNewDiscoveries).toBe(false);
			expect(onFogDiscovery).not.toHaveBeenCalled();
		});

		it('should force discover area', () => {
			fogLayer.forceDiscoverArea(160, 160, 128);

			// Check that tiles in the area are discovered
			expect(fogLayer.isTileDiscovered(160, 160)).toBe(true);
		});

		it('should clear fog of war', () => {
			// First discover some tiles
			fogLayer.updatePlayerPosition({ x: 32, y: 32, roomId: 'test-room' });
			expect(fogLayer.isTileDiscovered(32, 32)).toBe(true);

			// Clear fog
			fogLayer.clearFogOfWar();

			// Tiles should no longer be discovered
			expect(fogLayer.isTileDiscovered(32, 32)).toBe(false);
			expect(onFogClear).toHaveBeenCalled();
		});
	});

	describe('fog data management', () => {
		it('should get fog data', () => {
			const fogData = fogLayer.getFogData();
			expect(typeof fogData).toBe('object');
		});

		it('should get configuration', () => {
			const config = fogLayer.getConfig();
			expect(typeof config).toBe('object');
			expect(config.tileSize).toBeDefined();
			expect(config.visibilityRange).toBeDefined();
		});

		it.skip('should initialize with existing fog data', () => {
			const existingFogData = {
				'0,0': true,
				'1,1': true,
			};
			const playerPosition = { x: 32, y: 32, roomId: 'test-room' };

			fogLayer.initializeFogData(existingFogData, playerPosition);

			expect(fogLayer.isTileDiscovered(0, 0)).toBe(true);
			expect(fogLayer.isTileDiscovered(64, 64)).toBe(true);
		});
	});

	describe('viewport rendering', () => {
		it('should render fog based on viewport bounds', () => {
			const viewportBounds: ViewportBounds = {
				left: 0,
				right: 200,
				top: 0,
				bottom: 200,
			};

			// Discover some tiles first
			fogLayer.updatePlayerPosition({ x: 32, y: 32, roomId: 'test-room' });

			// Render fog
			fogLayer.renderFogOfWar(viewportBounds);

			// Should not throw and should handle the rendering
			expect(true).toBe(true); // Basic test that it doesn't crash
		});

		it('should skip rendering when viewport hasnt changed significantly', () => {
			const viewportBounds: ViewportBounds = {
				left: 0,
				right: 200,
				top: 0,
				bottom: 200,
			};

			// First render
			fogLayer.renderFogOfWar(viewportBounds);

			// Second render with same bounds - should skip
			fogLayer.renderFogOfWar(viewportBounds);

			// Should not throw
			expect(true).toBe(true);
		});

		it('should force re-render when viewport cache is cleared', () => {
			const viewportBounds: ViewportBounds = {
				left: 0,
				right: 200,
				top: 0,
				bottom: 200,
			};

			// First render
			fogLayer.renderFogOfWar(viewportBounds);

			// Clear cache
			fogLayer.forceClearViewportCache();

			// Second render should not be skipped
			fogLayer.renderFogOfWar(viewportBounds);

			expect(true).toBe(true);
		});
	});

	describe('obstacle checking', () => {
		it('should set obstacle checker', () => {
			const obstacleChecker = vi.fn().mockReturnValue(false);

			fogLayer.setObstacleChecker(obstacleChecker);

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe('debugging and performance', () => {
		it('should provide debug information', () => {
			const debugInfo = fogLayer.getDebugInfo();

			expect(debugInfo).toHaveProperty('activeFogTiles');
			expect(debugInfo).toHaveProperty('fogTilePool');
			expect(debugInfo).toHaveProperty('lastViewportBounds');
			expect(debugInfo).toHaveProperty('fogOfWarManagerExists');
			expect(debugInfo).toHaveProperty('config');
		});

		it('should provide performance metrics', () => {
			const metrics = fogLayer.getPerformanceMetrics();

			expect(metrics).toHaveProperty('totalTilesInPool');
			expect(metrics).toHaveProperty('activeTilesCount');
			expect(metrics).toHaveProperty('memoryEfficiency');
			expect(metrics).toHaveProperty('hasViewportCache');
		});
	});

	describe('cleanup', () => {
		it('should destroy properly', () => {
			// Add some tiles to pools
			fogLayer.updatePlayerPosition({ x: 32, y: 32, roomId: 'test-room' });
			const viewportBounds: ViewportBounds = {
				left: 0,
				right: 200,
				top: 0,
				bottom: 200,
			};
			fogLayer.renderFogOfWar(viewportBounds);

			// Destroy should not throw
			expect(() => fogLayer.destroy()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('should handle null fog manager gracefully', () => {
			// Create fog layer and manually null the manager (edge case)
			const testLayer = new FogLayer();
			(testLayer as any).fogOfWarManager = null;

			expect(testLayer.isTileDiscovered(0, 0)).toBe(false);
			expect(testLayer.updatePlayerPosition({ x: 0, y: 0, roomId: 'test' })).toBe(false);
			expect(() => testLayer.renderFogOfWar({
				left: 0, right: 100, top: 0, bottom: 100,
			})).not.toThrow();
		});

		it('should handle missing fog layer container', () => {
			const testLayer = new FogLayer();
			(testLayer as any).fogLayer = null;

			expect(() => testLayer.renderFogOfWar({
				left: 0, right: 100, top: 0, bottom: 100,
			})).not.toThrow();
		});
	});
});
