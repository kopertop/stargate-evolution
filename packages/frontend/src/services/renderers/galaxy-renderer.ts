import * as PIXI from 'pixi.js';

import type { Position } from '../../types/game-types';
import type { LayerManager } from '../../types/renderer-types';

/**
 * GalaxyRenderer handles the rendering of the galaxy map including regions,
 * grid lines, and location markers.
 */
export class GalaxyRenderer {
	private layerManager: LayerManager;
	private galaxyLayer: PIXI.Container;
	private mapContainer: PIXI.Container | null = null;

	// Galaxy state
	private isMapVisible: boolean = false;
	private currentLocation: Position = { x: 0, y: 0 };
	private mapZoom: number = 1.0;

	// Galaxy configuration
	private config = {
		// Map dimensions
		mapWidth: 1000,
		mapHeight: 800,

		// Grid settings
		gridSize: 50,
		gridColor: 0x333333,
		gridLineWidth: 1,

		// Region colors
		regionColors: {
			safe: 0x00aa00,     // Green for safe regions
			dangerous: 0xaa0000, // Red for dangerous regions
			unknown: 0x666666,   // Gray for unknown regions
			nebula: 0x9966ff,    // Purple for nebula regions
		},

		// Location marker
		locationMarker: {
			color: 0xffff00,     // Yellow for current location
			size: 8,
			pulseSpeed: 0.05,     // Speed of pulsing animation
		},

		// Region settings
		regionAlpha: 0.3,
		regionBorderWidth: 2,
		regionBorderColor: 0xffffff,

		// Background
		backgroundColor: 0x000011, // Dark blue space background

		// Labels
		labelColor: 0xffffff,
		labelFontSize: 14,
	};

	// Animation state
	private animationFrame: number = 0;
	private isAnimating: boolean = false;

	constructor(layerManager: LayerManager) {
		this.layerManager = layerManager;

		// Create or get galaxy layer (high z-index for overlay)
		this.galaxyLayer = this.layerManager.getLayer('galaxy') || this.layerManager.createLayer('galaxy', 10);

		console.log('[GALAXY-RENDERER] Initialized with galaxy layer');
	}

	/**
	 * Update galaxy configuration
	 */
	updateConfig(newConfig: Partial<typeof GalaxyRenderer.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[GALAXY-RENDERER] Updated configuration');

		if (this.isMapVisible) {
			this.recreateGalaxyMap();
		}
	}

	/**
	 * Set the current location marker
	 */
	setCurrentLocation(position: Position): void {
		this.currentLocation = position;

		if (this.isMapVisible) {
			this.updateLocationMarker();
		}

		console.log(`[GALAXY-RENDERER] Updated current location to (${position.x}, ${position.y})`);
	}

	/**
	 * Set the galaxy map zoom level
	 */
	setMapZoom(zoom: number): void {
		this.mapZoom = Math.max(0.1, Math.min(5.0, zoom)); // Clamp between 0.1 and 5.0

		if (this.mapContainer) {
			this.mapContainer.scale.set(this.mapZoom);
		}

		console.log(`[GALAXY-RENDERER] Set map zoom to ${this.mapZoom}`);
	}

	/**
	 * Toggle galaxy map visibility
	 */
	toggleMap(): void {
		this.isMapVisible = !this.isMapVisible;

		if (this.isMapVisible) {
			this.showGalaxyMap();
		} else {
			this.hideGalaxyMap();
		}

		console.log(`[GALAXY-RENDERER] Toggled galaxy map visibility: ${this.isMapVisible}`);
	}

	/**
	 * Show the galaxy map
	 */
	showGalaxyMap(): void {
		if (!this.mapContainer) {
			this.createGalaxyMap();
		}

		if (this.mapContainer) {
			this.mapContainer.visible = true;
		}

		this.isMapVisible = true;
		this.startAnimation();

		console.log('[GALAXY-RENDERER] Showed galaxy map');
	}

	/**
	 * Hide the galaxy map
	 */
	hideGalaxyMap(): void {
		if (this.mapContainer) {
			this.mapContainer.visible = false;
		}

		this.isMapVisible = false;
		this.stopAnimation();

		console.log('[GALAXY-RENDERER] Hid galaxy map');
	}

	/**
	 * Create the galaxy map
	 */
	private createGalaxyMap(): void {
		if (this.mapContainer) {
			this.galaxyLayer.removeChild(this.mapContainer);
			this.mapContainer.destroy();
		}

		this.mapContainer = new PIXI.Container();

		// Create map background
		this.createMapBackground();

		// Draw galaxy regions
		this.drawGalaxyRegions();

		// Draw grid lines
		this.drawGalaxyGrid();

		// Draw current location marker
		this.drawCurrentLocation();

		// Add map to galaxy layer
		this.galaxyLayer.addChild(this.mapContainer);

		console.log('[GALAXY-RENDERER] Created galaxy map');
	}

	/**
	 * Recreate the galaxy map with updated configuration
	 */
	private recreateGalaxyMap(): void {
		if (this.isMapVisible) {
			this.createGalaxyMap();
		}
	}

	/**
	 * Create the map background
	 */
	private createMapBackground(): void {
		if (!this.mapContainer) return;

		const background = new PIXI.Graphics();
		background.rect(0, 0, this.config.mapWidth, this.config.mapHeight)
			.fill(this.config.backgroundColor);

		// Add subtle border
		background.rect(0, 0, this.config.mapWidth, this.config.mapHeight)
			.stroke({ color: 0x444444, width: 2 });

		this.mapContainer.addChild(background);
	}

	/**
	 * Draw galaxy regions
	 */
	private drawGalaxyRegions(): void {
		if (!this.mapContainer) return;

		const regions = this.getGalaxyRegions();

		for (const region of regions) {
			const regionGraphics = new PIXI.Graphics();

			// Draw region area
			regionGraphics.rect(region.x, region.y, region.width, region.height)
				.fill({ color: region.color, alpha: this.config.regionAlpha });

			// Draw region border
			regionGraphics.rect(region.x, region.y, region.width, region.height)
				.stroke({
					color: this.config.regionBorderColor,
					width: this.config.regionBorderWidth,
				});

			this.mapContainer.addChild(regionGraphics);

			// Add region label
			this.addRegionLabel(region);
		}
	}

	/**
	 * Get galaxy regions data
	 */
	private getGalaxyRegions(): Array<{
		x: number;
		y: number;
		width: number;
		height: number;
		color: number;
		name: string;
		type: keyof typeof this.config.regionColors;
	}> {
		return [
			{
				x: 50,
				y: 50,
				width: 200,
				height: 150,
				color: this.config.regionColors.safe,
				name: 'Safe Zone',
				type: 'safe',
			},
			{
				x: 300,
				y: 100,
				width: 180,
				height: 180,
				color: this.config.regionColors.dangerous,
				name: 'Asteroid Field',
				type: 'dangerous',
			},
			{
				x: 500,
				y: 200,
				width: 150,
				height: 120,
				color: this.config.regionColors.nebula,
				name: 'Nebula',
				type: 'nebula',
			},
			{
				x: 700,
				y: 150,
				width: 200,
				height: 200,
				color: this.config.regionColors.unknown,
				name: 'Unknown',
				type: 'unknown',
			},
			{
				x: 100,
				y: 350,
				width: 250,
				height: 100,
				color: this.config.regionColors.safe,
				name: 'Trade Route',
				type: 'safe',
			},
			{
				x: 400,
				y: 400,
				width: 300,
				height: 150,
				color: this.config.regionColors.dangerous,
				name: 'Hostile Territory',
				type: 'dangerous',
			},
		];
	}

	/**
	 * Add a region label
	 */
	private addRegionLabel(region: {
		x: number;
		y: number;
		width: number;
		height: number;
		name: string;
	}): void {
		if (!this.mapContainer) return;

		const label = new PIXI.Text({
			text: region.name,
			style: {
				fontSize: this.config.labelFontSize,
				fill: this.config.labelColor,
				align: 'center',
			},
		});

		// Center the label in the region
		label.x = region.x + region.width / 2 - label.width / 2;
		label.y = region.y + region.height / 2 - label.height / 2;

		this.mapContainer.addChild(label);
	}

	/**
	 * Draw galaxy grid lines
	 */
	private drawGalaxyGrid(): void {
		if (!this.mapContainer) return;

		const grid = new PIXI.Graphics();

		// Draw vertical grid lines
		for (let x = 0; x <= this.config.mapWidth; x += this.config.gridSize) {
			grid.moveTo(x, 0)
				.lineTo(x, this.config.mapHeight)
				.stroke({ color: this.config.gridColor, width: this.config.gridLineWidth });
		}

		// Draw horizontal grid lines
		for (let y = 0; y <= this.config.mapHeight; y += this.config.gridSize) {
			grid.moveTo(0, y)
				.lineTo(this.config.mapWidth, y)
				.stroke({ color: this.config.gridColor, width: this.config.gridLineWidth });
		}

		this.mapContainer.addChild(grid);
	}

	/**
	 * Draw current location marker
	 */
	private drawCurrentLocation(): void {
		if (!this.mapContainer) return;

		const marker = new PIXI.Graphics();

		// Convert world coordinates to map coordinates
		const mapX = (this.currentLocation.x / 4000) * this.config.mapWidth + this.config.mapWidth / 2;
		const mapY = (this.currentLocation.y / 4000) * this.config.mapHeight + this.config.mapHeight / 2;

		// Draw location marker (circle)
		marker.circle(mapX, mapY, this.config.locationMarker.size)
			.fill(this.config.locationMarker.color);

		// Add a border
		marker.circle(mapX, mapY, this.config.locationMarker.size)
			.stroke({ color: 0xffffff, width: 2 });

		// Store marker for animation
		(marker as any).isLocationMarker = true;
		(marker as any).centerX = mapX;
		(marker as any).centerY = mapY;

		this.mapContainer.addChild(marker);
	}

	/**
	 * Update location marker position
	 */
	private updateLocationMarker(): void {
		if (!this.mapContainer) return;

		// Remove existing location marker
		const existingMarker = this.mapContainer.children.find(child =>
			(child as any).isLocationMarker,
		);

		if (existingMarker) {
			this.mapContainer.removeChild(existingMarker);
		}

		// Draw new location marker
		this.drawCurrentLocation();
	}

	/**
	 * Start animation for pulsing location marker
	 */
	private startAnimation(): void {
		this.isAnimating = true;
		console.log('[GALAXY-RENDERER] Started animation');
	}

	/**
	 * Stop animation
	 */
	private stopAnimation(): void {
		this.isAnimating = false;
		console.log('[GALAXY-RENDERER] Stopped animation');
	}

	/**
	 * Update animation frame (called from game loop)
	 */
	update(): void {
		if (!this.isAnimating || !this.isMapVisible || !this.mapContainer) return;

		this.animationFrame++;
		this.animateLocationMarker();
	}

	/**
	 * Animate the location marker with pulsing effect
	 */
	private animateLocationMarker(): void {
		if (!this.mapContainer) return;

		const marker = this.mapContainer.children.find(child =>
			(child as any).isLocationMarker,
		) as PIXI.Graphics;

		if (!marker) return;

		// Create pulsing effect
		const pulse = Math.sin(this.animationFrame * this.config.locationMarker.pulseSpeed) * 0.3 + 1;
		marker.scale.set(pulse);

		// Optionally, make it slightly transparent when pulsing
		marker.alpha = 0.7 + (pulse - 0.7) * 0.3;
	}

	/**
	 * Check if the galaxy map is visible
	 */
	isVisible(): boolean {
		return this.isMapVisible;
	}

	/**
	 * Get current map zoom level
	 */
	getMapZoom(): number {
		return this.mapZoom;
	}

	/**
	 * Show/hide galaxy layer
	 */
	setVisible(visible: boolean): void {
		this.layerManager.setLayerVisibility('galaxy', visible);
		console.log(`[GALAXY-RENDERER] Set galaxy layer visibility: ${visible}`);
	}

	/**
	 * Clear all galaxy elements
	 */
	clear(): void {
		if (this.mapContainer) {
			this.galaxyLayer.removeChild(this.mapContainer);
			this.mapContainer.destroy();
			this.mapContainer = null;
		}

		this.isMapVisible = false;
		this.stopAnimation();

		console.log('[GALAXY-RENDERER] Cleared all galaxy elements');
	}

	/**
	 * Get galaxy rendering statistics
	 */
	getStats(): {
		isMapVisible: boolean;
		currentLocation: Position;
		mapZoom: number;
		isAnimating: boolean;
		animationFrame: number;
		galaxyLayer: string;
		config: typeof GalaxyRenderer.prototype.config;
		} {
		return {
			isMapVisible: this.isMapVisible,
			currentLocation: { ...this.currentLocation },
			mapZoom: this.mapZoom,
			isAnimating: this.isAnimating,
			animationFrame: this.animationFrame,
			galaxyLayer: this.galaxyLayer ? 'available' : 'missing',
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		console.log('[GALAXY-RENDERER] Galaxy renderer destroyed');
	}
}
