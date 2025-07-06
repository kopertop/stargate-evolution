import type { FogOfWarData, PlayerPosition } from '@stargate/common';
import { describe, it, expect, beforeEach } from 'vitest';

import { FogOfWarManager } from '../fog-of-war-manager';

describe('FogOfWarManager', () => {
	let fogManager: FogOfWarManager;

	beforeEach(() => {
		fogManager = new FogOfWarManager({
			tileSize: 64,
			visibilityRange: 3,
			useLineOfSight: true,
		});
	});

	describe('initialization', () => {
		it('should create with default config', () => {
			const defaultManager = new FogOfWarManager();
			const config = defaultManager.getConfig();

			expect(config.tileSize).toBe(64);
			expect(config.visibilityRange).toBe(5);
			expect(config.useLineOfSight).toBe(true);
		});

		it('should create with custom config', () => {
			const config = fogManager.getConfig();

			expect(config.tileSize).toBe(64);
			expect(config.visibilityRange).toBe(3);
			expect(config.useLineOfSight).toBe(true);
		});

		it('should initialize with existing fog data', () => {
			const existingFogData: FogOfWarData = {
				'0,0': true,
				'1,1': true,
				'2,2': false,
			};
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };

			fogManager.initialize(existingFogData, playerPos);

			expect(fogManager.isTileDiscovered(0, 0)).toBe(true);
			expect(fogManager.isTileDiscovered(64, 64)).toBe(true);
			expect(fogManager.isTileDiscovered(128, 128)).toBe(false);
		});
	});

	describe('tile coordinate conversion', () => {
		it('should convert world coordinates to tile coordinates correctly', () => {
			// Test center of tile (0,0)
			expect(fogManager.isTileDiscovered(32, 32)).toBe(false);

			// Test edge cases
			expect(fogManager.isTileDiscovered(0, 0)).toBe(false);
			expect(fogManager.isTileDiscovered(63, 63)).toBe(false);
			expect(fogManager.isTileDiscovered(64, 64)).toBe(false); // This should be tile (1,1)
		});

		it('should handle negative coordinates', () => {
			expect(fogManager.isTileDiscovered(-32, -32)).toBe(false);
			expect(fogManager.isTileDiscovered(-64, -64)).toBe(false);
		});
	});

	describe('visibility and discovery', () => {
		it('should discover tiles when player moves', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' }; // Center of tile (0,0)

			const hasNewDiscoveries = fogManager.updatePlayerPosition(playerPos);

			// Should have new discoveries on first update
			expect(hasNewDiscoveries).toBe(true);

			// Player tile should be discovered
			expect(fogManager.isTileDiscovered(32, 32)).toBe(true);

			// Adjacent tiles within range should be discovered
			expect(fogManager.isTileDiscovered(96, 32)).toBe(true); // Tile (1,0)
			expect(fogManager.isTileDiscovered(32, 96)).toBe(true); // Tile (0,1)
		});

		it('should not discover tiles outside visibility range', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' }; // Center of tile (0,0)

			fogManager.updatePlayerPosition(playerPos);

			// Tiles far away should not be discovered (range is 3)
			expect(fogManager.isTileDiscovered(320, 32)).toBe(false); // Tile (5,0) - too far
			expect(fogManager.isTileDiscovered(32, 320)).toBe(false); // Tile (0,5) - too far
		});

		it('should discover tiles in circular pattern', () => {
			const playerPos: PlayerPosition = { x: 160, y: 160, roomId: 'test-room' }; // Center of tile (2,2)

			fogManager.updatePlayerPosition(playerPos);

			// Check circular discovery pattern
			expect(fogManager.isTileDiscovered(160, 160)).toBe(true); // Center
			expect(fogManager.isTileDiscovered(96, 160)).toBe(true);  // Left
			expect(fogManager.isTileDiscovered(224, 160)).toBe(true); // Right
			expect(fogManager.isTileDiscovered(160, 96)).toBe(true);  // Up
			expect(fogManager.isTileDiscovered(160, 224)).toBe(true); // Down

			// Diagonal tiles within range
			expect(fogManager.isTileDiscovered(224, 224)).toBe(true); // Down-right
		});

		it('should not discover new tiles if player stays in same tile', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };

			// First update should discover tiles
			const firstUpdate = fogManager.updatePlayerPosition(playerPos);
			expect(firstUpdate).toBe(true);

			// Moving within same tile should not discover new tiles
			const samePos = { x: 40, y: 40, roomId: 'test-room' }; // Still in tile (0,0)
			const secondUpdate = fogManager.updatePlayerPosition(samePos);
			expect(secondUpdate).toBe(false);
		});
	});

	describe('fog data management', () => {
		it('should return current fog data', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };
			fogManager.updatePlayerPosition(playerPos);

			const fogData = fogManager.getFogData();

			expect(typeof fogData).toBe('object');
			expect(fogData['0,0']).toBe(true); // Player tile should be discovered
		});

		it('should get list of discovered tiles', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };
			fogManager.updatePlayerPosition(playerPos);

			const discoveredTiles = fogManager.getDiscoveredTiles();

			expect(Array.isArray(discoveredTiles)).toBe(true);
			expect(discoveredTiles.length).toBeGreaterThan(0);

			// Check that each tile has required properties
			discoveredTiles.forEach(tile => {
				expect(tile).toHaveProperty('tileX');
				expect(tile).toHaveProperty('tileY');
				expect(tile).toHaveProperty('worldX');
				expect(tile).toHaveProperty('worldY');
				expect(typeof tile.tileX).toBe('number');
				expect(typeof tile.tileY).toBe('number');
				expect(typeof tile.worldX).toBe('number');
				expect(typeof tile.worldY).toBe('number');
			});
		});

		it('should clear all fog data', () => {
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };
			fogManager.updatePlayerPosition(playerPos);

			// Verify some tiles are discovered
			expect(fogManager.isTileDiscovered(32, 32)).toBe(true);

			fogManager.clearFog();

			// Verify all tiles are now undiscovered
			expect(fogManager.isTileDiscovered(32, 32)).toBe(false);
			expect(fogManager.getDiscoveredTiles()).toHaveLength(0);
		});
	});

	describe('forced discovery', () => {
		it('should force discover a specific tile', () => {
			// Tile should initially be undiscovered
			expect(fogManager.isTileDiscovered(320, 320)).toBe(false);

			fogManager.forceDiscoverTile(320, 320);

			// Tile should now be discovered
			expect(fogManager.isTileDiscovered(320, 320)).toBe(true);
		});

		it('should force discover an area', () => {
			const centerX = 160;
			const centerY = 160;
			const radius = 128; // 2 tiles

			fogManager.forceDiscoverArea(centerX, centerY, radius);

			// Center and nearby tiles should be discovered
			expect(fogManager.isTileDiscovered(160, 160)).toBe(true); // Center
			expect(fogManager.isTileDiscovered(96, 160)).toBe(true);  // Left
			expect(fogManager.isTileDiscovered(224, 160)).toBe(true); // Right
			expect(fogManager.isTileDiscovered(160, 96)).toBe(true);  // Up
			expect(fogManager.isTileDiscovered(160, 224)).toBe(true); // Down

			// Tiles outside radius should not be discovered
			expect(fogManager.isTileDiscovered(32, 160)).toBe(false);  // Too far left
			expect(fogManager.isTileDiscovered(288, 160)).toBe(false); // Too far right
		});
	});

	describe('line of sight', () => {
		it('should respect line of sight setting', () => {
			// Test with line of sight enabled
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };
			fogManager.updatePlayerPosition(playerPos);

			const tilesWithLOS = fogManager.getDiscoveredTiles().length;

			// Create new manager with line of sight disabled
			const noLOSManager = new FogOfWarManager({
				tileSize: 64,
				visibilityRange: 3,
				useLineOfSight: false,
			});

			noLOSManager.updatePlayerPosition(playerPos);
			const tilesWithoutLOS = noLOSManager.getDiscoveredTiles().length;

			// Both should discover the same tiles since we don't have obstacles
			// This test mainly ensures the setting is respected
			expect(tilesWithLOS).toBe(tilesWithoutLOS);
		});
	});

	describe('configuration management', () => {
		it('should update configuration', () => {
			const newConfig = {
				tileSize: 32,
				visibilityRange: 10,
			};

			fogManager.updateConfig(newConfig);
			const config = fogManager.getConfig();

			expect(config.tileSize).toBe(32);
			expect(config.visibilityRange).toBe(10);
			expect(config.useLineOfSight).toBe(true); // Should preserve existing value
		});

		it('should affect discovery after config update', () => {
			// Initial discovery with range 3
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };
			fogManager.updatePlayerPosition(playerPos);
			const initialTiles = fogManager.getDiscoveredTiles().length;

			// Clear fog and update to larger range
			fogManager.clearFog();
			fogManager.updateConfig({ visibilityRange: 6 });
			fogManager.updatePlayerPosition(playerPos);
			const newTiles = fogManager.getDiscoveredTiles().length;

			// Should discover more tiles with larger range
			expect(newTiles).toBeGreaterThan(initialTiles);
		});
	});

	describe('edge cases', () => {
		it('should handle very large coordinates', () => {
			const largePos: PlayerPosition = { x: 1000000, y: 1000000, roomId: 'test-room' };

			expect(() => {
				fogManager.updatePlayerPosition(largePos);
			}).not.toThrow();

			expect(fogManager.isTileDiscovered(1000000, 1000000)).toBe(true);
		});

		it('should handle zero visibility range', () => {
			fogManager.updateConfig({ visibilityRange: 0 });
			const playerPos: PlayerPosition = { x: 32, y: 32, roomId: 'test-room' };

			fogManager.updatePlayerPosition(playerPos);

			// Should only discover the player's current tile
			expect(fogManager.isTileDiscovered(32, 32)).toBe(true);
			expect(fogManager.isTileDiscovered(96, 32)).toBe(false); // Adjacent tile
		});

		it('should handle fractional coordinates', () => {
			const playerPos: PlayerPosition = { x: 32.5, y: 32.7, roomId: 'test-room' };

			fogManager.updatePlayerPosition(playerPos);

			// Should still work with fractional coordinates
			expect(fogManager.isTileDiscovered(32, 32)).toBe(true);
		});
	});
});
