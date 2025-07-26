import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MapLayer, type Galaxy, type StarSystem, type ShipData } from '../map-layer';

// Mock PIXI.Graphics and PIXI.Text for testing
vi.mock('pixi.js', () => ({
	Graphics: vi.fn().mockImplementation(() => ({
		circle: vi.fn().mockReturnThis(),
		fill: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
		eventMode: 'static',
		cursor: 'pointer',
		on: vi.fn(),
	})),
	Text: vi.fn().mockImplementation(() => ({
		x: 0,
		y: 0,
		width: 100,
		height: 20,
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
		scale = { set: vi.fn() };
		getBounds = vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 });
	},
}));

describe('MapLayer', () => {
	let mapLayer: MapLayer;
	let onSystemFocus: ReturnType<typeof vi.fn>;
	let onPlanetFocus: ReturnType<typeof vi.fn>;
	let onZoomChange: ReturnType<typeof vi.fn>;

	const mockGalaxy: Galaxy = {
		id: 'galaxy-1',
		name: 'Test Galaxy',
		starSystems: [
			{
				id: 'system-1',
				name: 'Test System',
				position: { x: 100, y: 200 },
				stars: [{ type: 'yellow dwarf', name: 'Test Star' }],
				planets: [{ id: 'planet-1', name: 'Test Planet' }],
			},
			{
				id: 'system-2',
				name: 'Binary System',
				position: { x: 300, y: 400 },
				stars: [
					{ type: 'red giant', name: 'Star A' },
					{ type: 'white dwarf', name: 'Star B' },
				],
			},
		],
	};

	const mockShipData: ShipData = {
		name: 'Destiny',
		location: { systemId: 'system-1' },
	};

	beforeEach(() => {
		onSystemFocus = vi.fn();
		onPlanetFocus = vi.fn();
		onZoomChange = vi.fn();

		mapLayer = new MapLayer({
			onSystemFocus,
			onPlanetFocus,
			onZoomChange,
		});
	});

	describe('initialization', () => {
		it('should create with default options', () => {
			const defaultMapLayer = new MapLayer();
			expect(defaultMapLayer).toBeDefined();
			expect(defaultMapLayer.getMapZoom()).toBe(2.0);
		});

		it('should create with custom options', () => {
			expect(mapLayer).toBeDefined();
			expect(mapLayer.getMapZoom()).toBe(2.0);
		});

		it('should initialize without a map initially', () => {
			expect(mapLayer.isMapVisible()).toBe(false);
			expect(mapLayer.getFocusSystem()).toBeNull();
			expect(mapLayer.getFocusPlanet()).toBeNull();
		});
	});

	describe('galaxy map rendering', () => {
		it.skip('should render galaxy map with star systems', () => {
			mapLayer.renderGalaxyMap(mockGalaxy);

			expect(mapLayer.isMapVisible()).toBe(true);
			const debugInfo = mapLayer.getDebugInfo();
			expect(debugInfo).toHaveProperty('hasMapLayer', true);
		});

		it.skip('should render galaxy map with focus system', () => {
			const focusSystem = mockGalaxy.starSystems[0];

			mapLayer.renderGalaxyMap(mockGalaxy, focusSystem, mockShipData);

			expect(mapLayer.isMapVisible()).toBe(true);
			expect(mapLayer.getFocusSystem()).toEqual(focusSystem);
		});

		it('should handle galaxy with no star systems', () => {
			const emptyGalaxy: Galaxy = {
				id: 'empty-galaxy',
				name: 'Empty Galaxy',
				starSystems: [],
			};

			expect(() => mapLayer.renderGalaxyMap(emptyGalaxy)).not.toThrow();
		});

		it('should handle star systems with different star types', () => {
			expect(() => mapLayer.renderGalaxyMap(mockGalaxy)).not.toThrow();

			// Should handle systems with single stars and multi-star systems
			const debugInfo = mapLayer.getDebugInfo();
			expect(debugInfo).toHaveProperty('starColors');
		});

		it.skip('should clear existing map when rendering new one', () => {
			// Render first map
			mapLayer.renderGalaxyMap(mockGalaxy);
			expect(mapLayer.isMapVisible()).toBe(true);

			// Render second map - should clear first
			const newGalaxy: Galaxy = {
				id: 'galaxy-2',
				name: 'New Galaxy',
				starSystems: [],
			};
			mapLayer.renderGalaxyMap(newGalaxy);
			expect(mapLayer.isMapVisible()).toBe(false); // Empty galaxy
		});
	});

	describe('zoom management', () => {
		it('should set zoom within valid range', () => {
			mapLayer.setMapZoom(4.0);
			expect(mapLayer.getMapZoom()).toBe(4.0);
			expect(onZoomChange).toHaveBeenCalledWith(4.0);
		});

		it('should clamp zoom to minimum value', () => {
			mapLayer.setMapZoom(0.1);
			expect(mapLayer.getMapZoom()).toBe(0.2); // Min value
			expect(onZoomChange).toHaveBeenCalledWith(0.2);
		});

		it('should clamp zoom to maximum value', () => {
			mapLayer.setMapZoom(10.0);
			expect(mapLayer.getMapZoom()).toBe(8.0); // Max value
			expect(onZoomChange).toHaveBeenCalledWith(8.0);
		});

		it('should not trigger callback for same zoom level', () => {
			mapLayer.setMapZoom(2.0); // Same as initial
			expect(onZoomChange).not.toHaveBeenCalled();
		});

		it('should zoom in correctly', () => {
			const initialZoom = mapLayer.getMapZoom();
			mapLayer.zoomIn();
			expect(mapLayer.getMapZoom()).toBe(initialZoom * 1.25);
		});

		it('should zoom out correctly', () => {
			const initialZoom = mapLayer.getMapZoom();
			mapLayer.zoomOut();
			expect(mapLayer.getMapZoom()).toBe(initialZoom / 1.25);
		});

		it('should apply zoom to existing map', () => {
			mapLayer.renderGalaxyMap(mockGalaxy);
			const initialZoom = mapLayer.getMapZoom();

			mapLayer.setMapZoom(4.0);
			expect(mapLayer.getMapZoom()).toBe(4.0);
		});
	});

	describe('system and planet focus', () => {
		it('should focus on system successfully', () => {
			const success = mapLayer.focusOnSystem('system-1', [mockGalaxy]);

			expect(success).toBe(true);
			expect(mapLayer.getFocusSystem()?.id).toBe('system-1');
			expect(mapLayer.getFocusPlanet()).toBeNull();
		});

		it('should fail to focus on non-existent system', () => {
			const success = mapLayer.focusOnSystem('non-existent', [mockGalaxy]);

			expect(success).toBe(false);
			expect(mapLayer.getFocusSystem()).toBeNull();
		});

		it('should focus on planet successfully', () => {
			const success = mapLayer.focusOnPlanet('planet-1', [mockGalaxy]);

			expect(success).toBe(true);
			expect(mapLayer.getFocusSystem()?.id).toBe('system-1');
			expect(mapLayer.getFocusPlanet()?.id).toBe('planet-1');
		});

		it('should fail to focus on non-existent planet', () => {
			const success = mapLayer.focusOnPlanet('non-existent-planet', [mockGalaxy]);

			expect(success).toBe(false);
			expect(mapLayer.getFocusPlanet()).toBeNull();
		});

		it('should handle empty galaxies when focusing', () => {
			const success = mapLayer.focusOnSystem('system-1', []);
			expect(success).toBe(false);
		});
	});

	describe('destiny rendering', () => {
		it.skip('should render galaxy for destiny ship', () => {
			const gameData = {
				ships: [mockShipData],
				galaxies: [mockGalaxy],
			};

			expect(() => mapLayer.renderGalaxyForDestiny(gameData)).not.toThrow();
			expect(mapLayer.isMapVisible()).toBe(true);
		});

		it('should handle missing destiny ship', () => {
			const gameData = {
				ships: [],
				galaxies: [mockGalaxy],
			};

			expect(() => mapLayer.renderGalaxyForDestiny(gameData)).not.toThrow();
			expect(mapLayer.isMapVisible()).toBe(false);
		});

		it('should handle destiny without location', () => {
			const gameData = {
				ships: [{ name: 'Destiny' }], // No location
				galaxies: [mockGalaxy],
			};

			expect(() => mapLayer.renderGalaxyForDestiny(gameData)).not.toThrow();
			expect(mapLayer.isMapVisible()).toBe(false);
		});

		it('should handle missing galaxy for destiny location', () => {
			const gameData = {
				ships: [{ name: 'Destiny', location: { systemId: 'non-existent' } }],
				galaxies: [mockGalaxy],
			};

			expect(() => mapLayer.renderGalaxyForDestiny(gameData)).not.toThrow();
			expect(mapLayer.isMapVisible()).toBe(false);
		});
	});

	describe('map management', () => {
		it.skip('should clear map successfully', () => {
			mapLayer.renderGalaxyMap(mockGalaxy);
			expect(mapLayer.isMapVisible()).toBe(true);

			mapLayer.clearMap();
			expect(mapLayer.isMapVisible()).toBe(false);
			expect(mapLayer.getFocusSystem()).toBeNull();
			expect(mapLayer.getFocusPlanet()).toBeNull();
		});

		it.skip('should get map bounds when map exists', () => {
			mapLayer.renderGalaxyMap(mockGalaxy);
			const bounds = mapLayer.getMapBounds();

			expect(bounds).toBeTruthy();
			expect(bounds).toHaveProperty('minX');
			expect(bounds).toHaveProperty('maxX');
			expect(bounds).toHaveProperty('minY');
			expect(bounds).toHaveProperty('maxY');
		});

		it('should return null bounds when no map exists', () => {
			const bounds = mapLayer.getMapBounds();
			expect(bounds).toBeNull();
		});
	});

	describe('debugging and utilities', () => {
		it('should provide debug information', () => {
			const debugInfo = mapLayer.getDebugInfo();

			expect(debugInfo).toHaveProperty('mapZoom');
			expect(debugInfo).toHaveProperty('hasMapLayer');
			expect(debugInfo).toHaveProperty('focusSystemId');
			expect(debugInfo).toHaveProperty('focusPlanetId');
			expect(debugInfo).toHaveProperty('starColors');
		});

		it('should track focus state in debug info', () => {
			mapLayer.focusOnSystem('system-1', [mockGalaxy]);
			const debugInfo = mapLayer.getDebugInfo() as any;

			expect(debugInfo.focusSystemId).toBe('system-1');
		});

		it('should track planet focus in debug info', () => {
			mapLayer.focusOnPlanet('planet-1', [mockGalaxy]);
			const debugInfo = mapLayer.getDebugInfo() as any;

			expect(debugInfo.focusSystemId).toBe('system-1');
			expect(debugInfo.focusPlanetId).toBe('planet-1');
		});
	});

	describe('cleanup', () => {
		it.skip('should destroy properly', () => {
			mapLayer.renderGalaxyMap(mockGalaxy);
			mapLayer.focusOnSystem('system-1', [mockGalaxy]);

			expect(() => mapLayer.destroy()).not.toThrow();
			expect(mapLayer.isMapVisible()).toBe(false);
		});

		it('should handle destroy when no map exists', () => {
			expect(() => mapLayer.destroy()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('should handle star systems without stars', () => {
			const galaxyWithoutStars: Galaxy = {
				id: 'no-stars-galaxy',
				name: 'No Stars Galaxy',
				starSystems: [
					{
						id: 'system-no-stars',
						name: 'Empty System',
						position: { x: 0, y: 0 },
						stars: [],
					},
				],
			};

			expect(() => mapLayer.renderGalaxyMap(galaxyWithoutStars)).not.toThrow();
		});

		it('should handle star systems with unknown star types', () => {
			const galaxyWithUnknownStars: Galaxy = {
				id: 'unknown-stars-galaxy',
				name: 'Unknown Stars Galaxy',
				starSystems: [
					{
						id: 'system-unknown',
						name: 'Unknown System',
						position: { x: 0, y: 0 },
						stars: [{ type: 'exotic-matter-star', name: 'Weird Star' }],
					},
				],
			};

			expect(() => mapLayer.renderGalaxyMap(galaxyWithUnknownStars)).not.toThrow();
		});

		it('should handle zoom operations without rendered map', () => {
			expect(() => mapLayer.setMapZoom(4.0)).not.toThrow();
			expect(() => mapLayer.zoomIn()).not.toThrow();
			expect(() => mapLayer.zoomOut()).not.toThrow();
		});
	});
});
