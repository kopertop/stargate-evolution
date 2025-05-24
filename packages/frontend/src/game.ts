import * as PIXI from 'pixi.js';

import { HelpPopover } from './help-popover';

const SHIP_SPEED = 4;
const STAR_COUNT = 200;
const STAR_COLOR = 0xffffff;
const STAR_RADIUS = 1.5;

export class Game {
	private app: PIXI.Application;
	private ship: PIXI.Graphics;
	private keys: Record<string, boolean> = {};
	private starfield: PIXI.Graphics;
	private world: PIXI.Container;
	private gameData: any;
	private mapZoom: number = 1;
	private mapLayer: PIXI.Container | null = null;
	private focusSystem: any = null;
	private focusPlanet: any = null;

	constructor(app: PIXI.Application, ship: PIXI.Graphics, gameData?: any) {
		this.app = app;
		this.world = new PIXI.Container();
		this.starfield = this.createStarfield();
		this.ship = ship;
		this.gameData = gameData;
		this.world.addChild(this.starfield);
		// If gameData is present, render the correct galaxy and place the ship
		if (this.gameData && this.gameData.galaxies && this.gameData.galaxies.length > 0 && this.gameData.ships) {
			this.renderGalaxyForDestiny();
		} else {
			// Fallback: add placeholder ship
			this.world.addChild(this.ship);
		}
		this.app.stage.addChild(this.world);
		this.setupInput();
		this.resizeToWindow();
		window.addEventListener('resize', () => this.resizeToWindow());
		if (this.app.ticker) {
			this.app.ticker.add(() => this.update());
		}
		this.setupLegendPopover();
		this.setupMapZoomControls();
	}

	private createStarfield(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		for (let i = 0; i < STAR_COUNT; i++) {
			const x = Math.random() * 4000 - 2000;
			const y = Math.random() * 4000 - 2000;
			g.circle(x, y, STAR_RADIUS).fill(STAR_COLOR);
		}
		return g;
	}

	private setupInput() {
		window.addEventListener('keydown', (e) => {
			this.keys[e.key.toLowerCase()] = true;
		});
		window.addEventListener('keyup', (e) => {
			this.keys[e.key.toLowerCase()] = false;
		});
	}

	private resizeToWindow() {
		if (this.app && this.app.renderer) {
			this.app.renderer.resize(window.innerWidth, window.innerHeight);
		}
	}

	private update() {
		if (!this.app || !this.app.screen) return;

		let dx = 0, dy = 0;
		if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
		if (this.keys['arrowdown'] || this.keys['s']) dy += 1;
		if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
		if (this.keys['arrowright'] || this.keys['d']) dx += 1;
		if (dx !== 0 || dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= len;
			dy /= len;
			this.ship.x += dx * SHIP_SPEED;
			this.ship.y += dy * SHIP_SPEED;
		}
		// Center camera on ship
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		this.world.x = centerX - this.ship.x;
		this.world.y = centerY - this.ship.y;
	}

	private setupLegendPopover() {
		window.addEventListener('keydown', (e) => {
			if (e.key === '?' || e.key === '/') {
				HelpPopover.toggle();
			}
		});
	}

	private setupMapZoomControls() {
		window.addEventListener('keydown', (e) => {
			if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') return;
			if ((e.key === '+' || e.key === '=') && !document.getElementById('map-popover')) {
				this.zoomIn();
			} else if (e.key === '-' && !document.getElementById('map-popover')) {
				this.zoomOut();
			}
		});
	}

	private renderGalaxyForDestiny() {
		const destiny = (this.gameData.ships || []).find((s: any) => s.name === 'Destiny');
		if (!destiny) return;
		const systemId = destiny.location?.systemId;
		// Find the galaxy containing this system
		let foundGalaxy = null;
		let foundSystem = null;
		for (const galaxy of this.gameData.galaxies) {
			const sys = (galaxy.starSystems || []).find((s: any) => s.id === systemId);
			if (sys) {
				foundGalaxy = galaxy;
				foundSystem = sys;
				break;
			}
		}
		if (!foundGalaxy) return;
		this.renderGalaxyMap(foundGalaxy, foundSystem, destiny);
	}

	private renderGalaxyMap(galaxy: any, focusSystem?: any, shipData?: any) {
		if (this.mapLayer) {
			this.world.removeChild(this.mapLayer);
		}
		const mapLayer = new PIXI.Container();
		this.mapLayer = mapLayer;
		const systems = galaxy.starSystems || [];
		// Star type to color mapping
		const STAR_COLORS: Record<string, number> = {
			'yellow dwarf': 0xffe066,
			'red giant': 0xff6666,
			'white dwarf': 0xe0e0ff,
			'neutron star': 0xccccff,
			'black hole': 0x222233,
			'multi': 0x66ffcc, // For multi-star systems
			'unknown': 0x888888,
		};
		// Find bounds for centering
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		systems.forEach((sys: any) => {
			if (sys.position.x < minX) minX = sys.position.x;
			if (sys.position.y < minY) minY = sys.position.y;
			if (sys.position.x > maxX) maxX = sys.position.x;
			if (sys.position.y > maxY) maxY = sys.position.y;
		});
		const offsetX = (minX + maxX) / 2;
		const offsetY = (minY + maxY) / 2;
		const scale = 2; // base scale
		systems.forEach((sys: any) => {
			const x = (sys.position.x - offsetX) * scale;
			const y = (sys.position.y - offsetY) * scale;
			let color = STAR_COLORS['unknown'];
			if (sys.stars && sys.stars.length > 0) {
				if (sys.stars.length === 1) {
					color = STAR_COLORS[sys.stars[0].type] || STAR_COLORS['unknown'];
				} else {
					color = STAR_COLORS['multi'];
				}
			}
			const g = new PIXI.Graphics();
			g.circle(x, y, 18).fill(color);
			mapLayer.addChild(g);
			const label = new PIXI.Text({
				text: sys.name,
				style: { fill: '#fff', fontSize: 14, fontWeight: 'bold', align: 'center' },
			});
			label.x = x - label.width / 2;
			label.y = y + 22;
			mapLayer.addChild(label);
			// If this is the focus system and ship is present, place the ship here
			if (focusSystem && sys.id === focusSystem.id && shipData) {
				this.ship.x = x;
				this.ship.y = y - 30; // Slightly above the system
				this.world.addChild(this.ship);
			}
		});
		mapLayer.scale.set(this.mapZoom);
		this.world.addChild(mapLayer);
	}

	public setMapZoom(zoom: number) {
		this.mapZoom = Math.max(0.2, Math.min(zoom, 8));
		if (this.mapLayer) {
			this.mapLayer.scale.set(this.mapZoom);
		}
	}

	public zoomIn() {
		this.setMapZoom(this.mapZoom * 1.25);
	}

	public zoomOut() {
		this.setMapZoom(this.mapZoom / 1.25);
	}

	public focusOnSystem(systemId: string) {
		const galaxy = (this.gameData.galaxies || []).find((g: any) => (g.starSystems || []).some((s: any) => s.id === systemId));
		if (!galaxy) return;
		const system = (galaxy.starSystems || []).find((s: any) => s.id === systemId);
		if (!system) return;
		this.focusSystem = system;
		this.focusPlanet = null;
		this.renderGalaxyMap(galaxy, system, this.gameData.ships?.find((s: any) => s.name === 'Destiny'));
	}

	public focusOnPlanet(planetId: string) {
		for (const galaxy of this.gameData.galaxies || []) {
			for (const system of galaxy.starSystems || []) {
				const planet = (system.planets || []).find((p: any) => p.id === planetId);
				if (planet) {
					this.focusSystem = system;
					this.focusPlanet = planet;
					this.renderGalaxyMap(galaxy, system, this.gameData.ships?.find((s: any) => s.name === 'Destiny'));
					return;
				}
			}
		}
	}
}
