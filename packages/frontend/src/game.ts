import type {
	RoomTemplate,
	DoorTemplate,
	RoomFurniture,
} from '@stargate/common';
import * as PIXI from 'pixi.js';

import { GAMEPAD_BUTTONS } from './constants/gamepad';
import { HelpPopover } from './help-popover';
import { AdminService } from './services/admin-service';
import { TemplateService } from './services/template-service';

const SHIP_SPEED = 4;
const SPEED_MULTIPLIER = 5; // 5x speed when running (Shift/Right Trigger)
const STAR_COUNT = 200;
const STAR_COLOR = 0xffffff;
const STAR_RADIUS = 1.5;
const WORLD_BOUNDS = { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 };

export class Game {
	private app: PIXI.Application;
	private player: PIXI.Graphics;
	private keys: Record<string, boolean> = {};
	private starfield: PIXI.Graphics;
	private world: PIXI.Container;
	private gameData: any;
	private wasRunning: boolean = false;
	private mapZoom: number = 1;
	private mapLayer: PIXI.Container | null = null;
	private focusSystem: any = null;
	private focusPlanet: any = null;
	private gamepadIndex: number | null = null;
	private menuOpen: boolean = false;

	// Room rendering system
	private roomsLayer: PIXI.Container | null = null;
	private doorsLayer: PIXI.Container | null = null;
	private furnitureLayer: PIXI.Container | null = null;
	private rooms: RoomTemplate[] = [];
	private doors: DoorTemplate[] = [];
	private furniture: RoomFurniture[] = [];

	constructor(app: PIXI.Application, _unused: any, gameData?: any) {
		this.app = app;
		this.world = new PIXI.Container();
		this.starfield = this.createStarfield();
		this.gameData = gameData;
		// Only add starfield if we don't have room data - we'll render rooms instead
		this.world.addChild(this.starfield);
		// Create player as circular character sprite
		const playerGraphics = new PIXI.Graphics();
		playerGraphics.circle(0, 0, 10).fill(0xFF6600); // Bright orange circle for player
		playerGraphics.circle(0, 0, 10).stroke({ color: 0xFFFFFF, width: 2 }); // White border
		playerGraphics.circle(0, 0, 7).stroke({ color: 0xCC4400, width: 1 }); // Inner darker orange ring
		this.player = playerGraphics;
		console.log('[DEBUG] Created circular player character');
		this.player.x = 0;
		this.player.y = 0;
		// Player will be added to world after room system is initialized
		this.app.stage.addChild(this.world);
		this.setupInput();
		this.resizeToWindow();
		window.addEventListener('resize', () => this.resizeToWindow());
		if (this.app.ticker) {
			this.app.ticker.add(() => this.update());
		}
		this.setupLegendPopover();
		this.setupMapZoomControls();
		window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
			if (this.gamepadIndex === null) this.gamepadIndex = e.gamepad.index;
		});
		window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
			if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
		});

		// Initialize room rendering system
		this.initializeRoomSystem();
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

		// Skip game input when menu is open
		if (this.menuOpen) {
			return;
		}

		let dx = 0, dy = 0;
		let isRunning = false;

		// Keyboard input
		if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
		if (this.keys['arrowdown'] || this.keys['s']) dy += 1;
		if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
		if (this.keys['arrowright'] || this.keys['d']) dx += 1;

		// Check for shift key (running modifier) - properly track key state
		isRunning = this.keys['shift'] || false;

		// Gamepad input
		const gp = this.gamepadIndex !== null ? navigator.getGamepads()[this.gamepadIndex] : null;
		
		// Debug gamepad detection (log only once every 60 frames to avoid spam)
		if (this.gamepadIndex !== null && Math.floor(Date.now() / 1000) % 5 === 0) {
			console.log('[DEBUG] Game update - gamepad detected at index:', this.gamepadIndex, 'menuOpen:', this.menuOpen);
		}
		
		if (gp) {
			// Left stick - movement
			const leftAxisX = gp.axes[0] || 0;
			const leftAxisY = gp.axes[1] || 0;
			
			// Debug logging for thumbstick input (only when significant movement)
			if (Math.abs(leftAxisX) > 0.15 || Math.abs(leftAxisY) > 0.15) {
				console.log('[DEBUG] Left stick input:', { x: leftAxisX.toFixed(3), y: leftAxisY.toFixed(3) });
			}
			
			if (Math.abs(leftAxisX) > 0.15) dx += leftAxisX;
			if (Math.abs(leftAxisY) > 0.15) dy += leftAxisY;

			// Right stick - zoom controls
			const rightAxisY = gp.axes[3] || 0; // Right stick Y-axis
			
			// Debug logging for right stick zoom input
			if (Math.abs(rightAxisY) > 0.2) {
				console.log('[DEBUG] Right stick zoom input:', { y: rightAxisY.toFixed(3), currentZoom: this.mapZoom.toFixed(3) });
			}
			
			if (Math.abs(rightAxisY) > 0.2) { // Slightly higher deadzone for zoom
				const zoomSpeed = 0.02; // Zoom sensitivity
				if (rightAxisY < -0.2) {
					// Right stick up = zoom in
					this.setMapZoom(this.mapZoom * (1 + zoomSpeed));
				} else if (rightAxisY > 0.2) {
					// Right stick down = zoom out
					this.setMapZoom(this.mapZoom * (1 - zoomSpeed));
				}
			}

			// D-pad - movement (fallback/additional control)
			if (gp.buttons[GAMEPAD_BUTTONS.DPAD_UP]?.pressed) dy -= 1;
			if (gp.buttons[GAMEPAD_BUTTONS.DPAD_DOWN]?.pressed) dy += 1;
			if (gp.buttons[GAMEPAD_BUTTONS.DPAD_LEFT]?.pressed) dx -= 1;
			if (gp.buttons[GAMEPAD_BUTTONS.DPAD_RIGHT]?.pressed) dx += 1;

			// Right bumper (RB/R) - running modifier - properly track button state
			if (gp.buttons[GAMEPAD_BUTTONS.RB]?.pressed) isRunning = true;
		}

		if (dx !== 0 || dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= len;
			dy /= len;

			// Calculate movement speed (base speed or running speed)
			const currentSpeed = isRunning ? SHIP_SPEED * SPEED_MULTIPLIER : SHIP_SPEED;

			// Debug logging for running mode (only when state changes)
			if (isRunning && !this.wasRunning) {
				console.log('[DEBUG] Running mode activated - speed:', currentSpeed);
				this.wasRunning = true;
			} else if (!isRunning && this.wasRunning) {
				console.log('[DEBUG] Running mode deactivated - speed:', currentSpeed);
				this.wasRunning = false;
			}

			this.player.x += dx * currentSpeed;
			this.player.y += dy * currentSpeed;
			// Clamp to world bounds
			this.player.x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, this.player.x));
			this.player.y = Math.max(WORLD_BOUNDS.minY, Math.min(WORLD_BOUNDS.maxY, this.player.y));
		}
		// Center camera on player (accounting for zoom scale)
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		this.world.x = centerX - (this.player.x * this.mapZoom);
		this.world.y = centerY - (this.player.y * this.mapZoom);
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
				this.player.x = x;
				this.player.y = y - 30; // Slightly above the system
				this.world.addChild(this.player);
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
		// Also zoom the world container for room system
		if (this.world) {
			this.world.scale.set(this.mapZoom);
		}
	}

	public zoomIn() {
		this.setMapZoom(this.mapZoom * 1.25);
	}

	public zoomOut() {
		this.setMapZoom(this.mapZoom / 1.25);
	}

	public setMenuOpen(isOpen: boolean) {
		this.menuOpen = isOpen;
	}

	// Room rendering system methods
	private async initializeRoomSystem() {
		try {
			console.log('[DEBUG] Initializing room system...');

			// Always create demo rooms first as a safety measure
			this.createDemoRooms();

			// Create rendering layers
			this.roomsLayer = new PIXI.Container();
			this.doorsLayer = new PIXI.Container();
			this.furnitureLayer = new PIXI.Container();

			console.log('[DEBUG] Created rendering layers');

			// Add layers to world in correct order (rooms first, then doors, then furniture, then player)
			this.world.addChild(this.roomsLayer);
			this.world.addChild(this.doorsLayer);
			this.world.addChild(this.furnitureLayer);
			this.world.addChild(this.player); // Add player on top of everything

			console.log('[DEBUG] Added layers to world');

			// Try to load real room data from admin API
			try {
				await this.loadRoomData();
			} catch (error) {
				console.warn('[DEBUG] Failed to load real room data, using demo rooms:', error);
			}

			// Render all rooms
			this.renderRooms();

			// Position player in starting room (Gate Room)
			this.positionPlayerInStartingRoom();

			// Center camera on rooms
			this.centerCameraOnRooms();

			console.log('[DEBUG] Room system initialized successfully');
		} catch (error) {
			console.error('[DEBUG] Error initializing room system:', error);
		}
	}

	private async loadRoomData() {
		console.log('[DEBUG] Loading room data from API...');

		// Try to load real room data and replace demo rooms if successful
		const templateService = new TemplateService();
		const realRooms = await templateService.getRooms();
		const realDoors = await templateService.getDoors();
		const realFurniture = await templateService.getFurniture();

		console.log(`[DEBUG] Loaded ${realRooms.length} rooms, ${realDoors.length} doors, ${realFurniture.length} furniture from API`);

		// Only replace demo data if we actually got real data
		if (realRooms.length > 0) {
			this.rooms = realRooms;
			this.doors = realDoors;
			this.furniture = realFurniture;
			console.log('[DEBUG] Replaced demo data with real room data');
			console.log('[DEBUG] Real rooms:', this.rooms.map(r => ({ id: r.id, name: r.name, type: r.type })));
		} else {
			console.log('[DEBUG] No real rooms found, keeping demo rooms');
		}
	}

	private createDemoRooms() {
		console.log('[DEBUG] Creating demo rooms as fallback...');

		// Create demo room data with larger, more visible rooms
		this.rooms = [
			{
				id: 'demo-gate-room',
				layout_id: 'demo',
				type: 'gate_room',
				name: 'Gate Room',
				description: 'Demo Gate Room',
				startX: -200,
				endX: 200,
				startY: -150,
				endY: 150,
				floor: 0,
				width: 400,
				height: 300,
				image: null,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
			{
				id: 'demo-corridor',
				layout_id: 'demo',
				type: 'corridor',
				name: 'East Corridor',
				description: 'Demo Corridor',
				startX: 200,
				endX: 400,
				startY: -75,
				endY: 75,
				floor: 0,
				width: 200,
				height: 150,
				image: null,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		] as RoomTemplate[];

		// Add a demo door connecting the rooms
		this.doors = [
			{
				id: 'demo-door',
				name: 'Demo Door',
				from_room_id: 'demo-gate-room',
				to_room_id: 'demo-corridor',
				x: 200, // At the connection point between rooms
				y: 0,   // Center vertically
				width: 32,
				height: 8,
				rotation: 90, // Vertical door
				state: 'opened',
				is_automatic: true,
				open_direction: 'sliding',
				style: 'standard',
				power_required: 0,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		] as DoorTemplate[];

		// Add demo furniture (stargate in the gate room)
		this.furniture = [
			{
				id: 'demo-stargate',
				room_id: 'demo-gate-room',
				furniture_type: 'stargate',
				name: 'Demo Stargate',
				description: 'Demo Stargate',
				x: 0,  // Center of gate room
				y: 0,  // Center of gate room
				z: 1,
				width: 64,
				height: 64,
				rotation: 0,
				interactive: true,
				blocks_movement: true,
				power_required: 0,
				active: true,
				discovered: true,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		] as RoomFurniture[];

		// Hide starfield
		this.starfield.visible = false;
		// Change background color
		this.app.renderer.background.color = 0x111111;

		console.log('[DEBUG] Demo rooms created');
	}

	private renderRooms() {
		if (!this.roomsLayer) return;

		console.log('[DEBUG] Rendering rooms...');

		// Clear existing rooms
		this.roomsLayer.removeChildren();
		this.doorsLayer?.removeChildren();
		this.furnitureLayer?.removeChildren();

		// Render each room
		this.rooms.forEach(room => {
			this.renderRoom(room);
		});

		// Render doors
		this.doors.forEach(door => {
			this.renderDoor(door);
		});

		// Render furniture
		this.furniture.forEach(furniture => {
			this.renderFurnitureItem(furniture);
		});

		console.log('[DEBUG] Room rendering complete');
	}

	private renderRoom(room: RoomTemplate) {
		if (!this.roomsLayer) return;

		// Calculate room dimensions from coordinates
		const width = room.endX - room.startX;
		const height = room.endY - room.startY;
		const centerX = room.startX + width / 2;
		const centerY = room.startY + height / 2;

		// Create room graphics
		const roomGraphics = new PIXI.Graphics();

		// Room floor (bright color for visibility)
		roomGraphics.rect(-width/2, -height/2, width, height).fill(0x333355); // Dark blue-gray floor

		// Room walls (bright border)
		roomGraphics.rect(-width/2, -height/2, width, height).stroke({ color: 0x88AAFF, width: 8 }); // Light blue border - very visible

		// Position room
		roomGraphics.x = centerX;
		roomGraphics.y = centerY;

		// Add room label (larger and brighter)
		const label = new PIXI.Text({
			text: room.name,
			style: {
				fontFamily: 'Arial',
				fontSize: 18,
				fill: 0xFFFF00, // Yellow text - very visible
				align: 'center',
			},
		});
		label.anchor.set(0.5);
		label.x = centerX;
		label.y = centerY - height/2 - 30;

		this.roomsLayer.addChild(roomGraphics);
		this.roomsLayer.addChild(label);

		console.log(`[DEBUG] Rendered room: ${room.name} at (${centerX}, ${centerY}) size (${width}x${height})`);
	}

	private renderDoor(door: DoorTemplate) {
		if (!this.doorsLayer) return;

		// Create door graphics (purple rectangle)
		const doorGraphics = new PIXI.Graphics();
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).fill(0x8A2BE2); // Purple color like in admin

		// Position door
		doorGraphics.x = door.x;
		doorGraphics.y = door.y;
		doorGraphics.rotation = (door.rotation * Math.PI) / 180; // Convert degrees to radians

		this.doorsLayer.addChild(doorGraphics);

		console.log(`[DEBUG] Rendered door at (${door.x}, ${door.y}) size (${door.width}x${door.height})`);
	}

	private renderFurnitureItem(furniture: RoomFurniture) {
		if (!this.furnitureLayer) return;

		// Find the room this furniture belongs to
		const room = this.rooms.find(r => r.id === furniture.room_id);
		if (!room) {
			console.warn(`[DEBUG] Furniture ${furniture.name} has invalid room_id: ${furniture.room_id}`);
			return;
		}

		// Calculate room center
		const roomCenterX = room.startX + (room.endX - room.startX) / 2;
		const roomCenterY = room.startY + (room.endY - room.startY) / 2;

		// Create furniture graphics (bright color for visibility)
		const furnitureGraphics = new PIXI.Graphics();
		furnitureGraphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).fill(0x00FF88); // Bright green color
		furnitureGraphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).stroke({ color: 0xFFFFFF, width: 2 }); // White border

		// Position furniture relative to room center
		furnitureGraphics.x = roomCenterX + furniture.x;
		furnitureGraphics.y = roomCenterY + furniture.y;
		furnitureGraphics.rotation = (furniture.rotation * Math.PI) / 180;

		this.furnitureLayer.addChild(furnitureGraphics);

		console.log(`[DEBUG] Rendered furniture: ${furniture.name} at room-relative (${furniture.x}, ${furniture.y})`);
	}

	private positionPlayerInStartingRoom() {
		// Position player at world origin (0, 0)
		this.player.x = 0;
		this.player.y = 0;

		console.log('[DEBUG] Player positioned at origin (0, 0)');
	}

	private centerCameraOnRooms() {
		if (this.rooms.length === 0) return;

		// Calculate center point of all rooms
		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		this.rooms.forEach(room => {
			minX = Math.min(minX, room.startX);
			maxX = Math.max(maxX, room.endX);
			minY = Math.min(minY, room.startY);
			maxY = Math.max(maxY, room.endY);
		});

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;

		// Center camera on rooms (accounting for zoom scale)
		const screenCenterX = this.app.screen.width / 2;
		const screenCenterY = this.app.screen.height / 2;

		this.world.x = screenCenterX - (centerX * this.mapZoom);
		this.world.y = screenCenterY - (centerY * this.mapZoom);

		console.log(`[DEBUG] Camera centered on rooms at (${centerX}, ${centerY})`);
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
