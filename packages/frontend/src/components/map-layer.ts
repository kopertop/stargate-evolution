import * as PIXI from 'pixi.js';

export interface MapLayerOptions {
	onSystemFocus?: (systemId: string) => void;
	onPlanetFocus?: (planetId: string) => void;
	onZoomChange?: (newZoom: number) => void;
}

export interface Galaxy {
	id: string;
	name: string;
	starSystems: StarSystem[];
}

export interface StarSystem {
	id: string;
	name: string;
	position: { x: number; y: number };
	stars: Star[];
	planets?: Planet[];
}

export interface Star {
	type: string;
	name: string;
}

export interface Planet {
	id: string;
	name: string;
}

export interface ShipData {
	name: string;
	location?: {
		systemId: string;
	};
}

export class MapLayer extends PIXI.Container {
	private mapLayer: PIXI.Container | null = null;
	private mapZoom: number = 2.0; // Default zoom level
	private focusSystem: StarSystem | null = null;
	private focusPlanet: Planet | null = null;
	private options: MapLayerOptions;

	// Star type to color mapping
	private readonly STAR_COLORS: Record<string, number> = {
		'yellow dwarf': 0xffe066,
		'red giant': 0xff6666,
		'white dwarf': 0xe0e0ff,
		'neutron star': 0xccccff,
		'black hole': 0x222233,
		'multi': 0x66ffcc, // For multi-star systems
		'unknown': 0x888888,
	};

	constructor(options: MapLayerOptions = {}) {
		super();
		this.options = options;
		this.initialize();
	}

	private initialize(): void {
		console.log('[MAP] Map layer initialized');
	}

	public renderGalaxyMap(galaxy: Galaxy, focusSystem?: StarSystem, shipData?: ShipData): void {
		// Clear existing map
		if (this.mapLayer) {
			this.removeChild(this.mapLayer);
		}

		const mapLayer = new PIXI.Container();
		this.mapLayer = mapLayer;
		this.focusSystem = focusSystem || null;

		const systems = galaxy.starSystems || [];
		console.log(`[MAP] Rendering galaxy map with ${systems.length} systems`);

		// Find bounds for centering
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		systems.forEach((sys: StarSystem) => {
			if (sys.position.x < minX) minX = sys.position.x;
			if (sys.position.y < minY) minY = sys.position.y;
			if (sys.position.x > maxX) maxX = sys.position.x;
			if (sys.position.y > maxY) maxY = sys.position.y;
		});

		const offsetX = (minX + maxX) / 2;
		const offsetY = (minY + maxY) / 2;
		const scale = 2; // base scale

		// Render each star system
		systems.forEach((sys: StarSystem) => {
			const x = (sys.position.x - offsetX) * scale;
			const y = (sys.position.y - offsetY) * scale;

			// Determine star color based on system composition
			let color = this.STAR_COLORS['unknown'];
			if (sys.stars && sys.stars.length > 0) {
				if (sys.stars.length === 1) {
					color = this.STAR_COLORS[sys.stars[0].type] || this.STAR_COLORS['unknown'];
				} else {
					color = this.STAR_COLORS['multi'];
				}
			}

			// Create star system graphic
			const systemGraphic = new PIXI.Graphics();
			systemGraphic.circle(x, y, 18).fill(color);
			mapLayer.addChild(systemGraphic);

			// Create system label
			const label = new PIXI.Text({
				text: sys.name,
				style: { fill: '#fff', fontSize: 14, fontWeight: 'bold', align: 'center' },
			});
			label.x = x - label.width / 2;
			label.y = y + 22;
			mapLayer.addChild(label);

			// Store system data for interaction
			systemGraphic.eventMode = 'static';
			systemGraphic.cursor = 'pointer';
			(systemGraphic as any).systemId = sys.id;

			// Add click handler for system focus
			systemGraphic.on('pointerdown', () => {
				this.handleSystemClick(sys.id);
			});
		});

		// Position ship if provided and focus system matches
		if (focusSystem && shipData?.location?.systemId === focusSystem.id) {
			this.positionShipOnSystem(focusSystem, shipData, offsetX, offsetY, scale);
		}

		// Apply current zoom
		mapLayer.scale.set(this.mapZoom);
		this.addChild(mapLayer);

		console.log(`[MAP] Galaxy map rendered with zoom: ${this.mapZoom}`);
	}

	private positionShipOnSystem(
		focusSystem: StarSystem, 
		shipData: ShipData, 
		offsetX: number, 
		offsetY: number, 
		scale: number,
	): void {
		const x = (focusSystem.position.x - offsetX) * scale;
		const y = (focusSystem.position.y - offsetY) * scale;

		console.log(`[MAP] Positioning ship ${shipData.name} at system ${focusSystem.name} (${x}, ${y})`);
		
		// This would be handled by the game instance that owns the player
		// We'll provide the position via callback if needed
		if (this.options.onSystemFocus) {
			this.options.onSystemFocus(focusSystem.id);
		}
	}

	private handleSystemClick(systemId: string): void {
		console.log(`[MAP] System clicked: ${systemId}`);
		if (this.options.onSystemFocus) {
			this.options.onSystemFocus(systemId);
		}
	}

	public setMapZoom(zoom: number): void {
		const clampedZoom = Math.max(0.2, Math.min(zoom, 8));
		if (this.mapZoom !== clampedZoom) {
			this.mapZoom = clampedZoom;
			
			// Apply zoom to current map layer
			if (this.mapLayer) {
				this.mapLayer.scale.set(this.mapZoom);
			}

			console.log(`[MAP] Zoom set to: ${this.mapZoom}`);
			
			if (this.options.onZoomChange) {
				this.options.onZoomChange(this.mapZoom);
			}
		}
	}

	public getMapZoom(): number {
		return this.mapZoom;
	}

	public zoomIn(): void {
		this.setMapZoom(this.mapZoom * 1.25);
	}

	public zoomOut(): void {
		this.setMapZoom(this.mapZoom / 1.25);
	}

	public focusOnSystem(systemId: string, galaxies: Galaxy[]): boolean {
		const galaxy = galaxies.find((g: Galaxy) => 
			g.starSystems.some((s: StarSystem) => s.id === systemId),
		);
		
		if (!galaxy) {
			console.warn(`[MAP] Galaxy not found for system: ${systemId}`);
			return false;
		}

		const system = galaxy.starSystems.find((s: StarSystem) => s.id === systemId);
		if (!system) {
			console.warn(`[MAP] System not found: ${systemId}`);
			return false;
		}

		this.focusSystem = system;
		this.focusPlanet = null;

		// Find ship data for positioning (placeholder)
		const shipData: ShipData | undefined = undefined; // This would come from game data
		this.renderGalaxyMap(galaxy, system, shipData);

		console.log(`[MAP] Focused on system: ${system.name}`);
		return true;
	}

	public focusOnPlanet(planetId: string, galaxies: Galaxy[]): boolean {
		for (const galaxy of galaxies) {
			for (const system of galaxy.starSystems) {
				const planet = system.planets?.find((p: Planet) => p.id === planetId);
				if (planet) {
					this.focusSystem = system;
					this.focusPlanet = planet;

					// Find ship data for positioning (placeholder)
					const shipData: ShipData | undefined = undefined; // This would come from game data
					this.renderGalaxyMap(galaxy, system, shipData);

					console.log(`[MAP] Focused on planet: ${planet.name} in system: ${system.name}`);
					return true;
				}
			}
		}

		console.warn(`[MAP] Planet not found: ${planetId}`);
		return false;
	}

	public renderGalaxyForDestiny(gameData: any): void {
		const destiny = (gameData.ships || []).find((s: any) => s.name === 'Destiny');
		if (!destiny) {
			console.warn('[MAP] Destiny ship not found in game data');
			return;
		}

		const systemId = destiny.location?.systemId;
		if (!systemId) {
			console.warn('[MAP] Destiny has no system location');
			return;
		}

		// Find the galaxy containing this system
		let foundGalaxy = null;
		let foundSystem = null;

		for (const galaxy of gameData.galaxies || []) {
			const sys = (galaxy.starSystems || []).find((s: any) => s.id === systemId);
			if (sys) {
				foundGalaxy = galaxy;
				foundSystem = sys;
				break;
			}
		}

		if (!foundGalaxy || !foundSystem) {
			console.warn(`[MAP] Galaxy or system not found for Destiny at system: ${systemId}`);
			return;
		}

		this.renderGalaxyMap(foundGalaxy, foundSystem, destiny);
		console.log(`[MAP] Rendered galaxy map for Destiny at system: ${foundSystem.name}`);
	}

	public getFocusSystem(): StarSystem | null {
		return this.focusSystem;
	}

	public getFocusPlanet(): Planet | null {
		return this.focusPlanet;
	}

	public clearMap(): void {
		if (this.mapLayer) {
			this.removeChild(this.mapLayer);
			this.mapLayer?.destroy();
			this.mapLayer = null;
		}
		this.focusSystem = null;
		this.focusPlanet = null;
		console.log('[MAP] Map cleared');
	}

	public destroy(): void {
		this.clearMap();
		console.log('[MAP] Map layer destroyed');
		super.destroy();
	}

	// Development and debugging utilities
	public getDebugInfo(): object {
		return {
			mapZoom: this.mapZoom,
			hasMapLayer: !!this.mapLayer,
			focusSystemId: this.focusSystem?.id || null,
			focusPlanetId: this.focusPlanet?.id || null,
			starColors: Object.keys(this.STAR_COLORS),
		};
	}

	public isMapVisible(): boolean {
		return !!this.mapLayer && this.mapLayer.children.length > 0;
	}

	public getMapBounds(): { minX: number; maxX: number; minY: number; maxY: number } | null {
		if (!this.mapLayer) return null;

		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		
		this.mapLayer.children.forEach(child => {
			const bounds = child.getBounds();
			minX = Math.min(minX, bounds.x);
			maxX = Math.max(maxX, bounds.x + bounds.width);
			minY = Math.min(minY, bounds.y);
			maxY = Math.max(maxY, bounds.y + bounds.height);
		});

		return { minX, maxX, minY, maxY };
	}
}