import * as PIXI from 'pixi.js';

import { HelpPopover } from './help-popover';
import { AdminService } from './services/admin-service';
import type { RoomTemplate, DoorTemplate, RoomFurniture } from '@stargate/common';

const SHIP_SPEED = 4;
const STAR_COUNT = 200;
const STAR_COLOR = 0xffffff;
const STAR_RADIUS = 1.5;
const WORLD_BOUNDS = { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 };
const ELI_SPRITE_PATH = '/assets/people/eli-wallace.png';

export class Game {
	private app: PIXI.Application;
	private player: PIXI.Sprite;
	private keys: Record<string, boolean> = {};
	private starfield: PIXI.Graphics;
	private world: PIXI.Container;
	private gameData: any;
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
		// Load Eli's sprite
		this.player = PIXI.Sprite.from(ELI_SPRITE_PATH);
		this.player.anchor.set(0.5);
		this.player.x = 0;
		this.player.y = 0;
		this.player.width = 64;
		this.player.height = 64;
		this.world.addChild(this.player);
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
		// Keyboard input
		if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
		if (this.keys['arrowdown'] || this.keys['s']) dy += 1;
		if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
		if (this.keys['arrowright'] || this.keys['d']) dx += 1;

		// Gamepad input
		const gp = this.gamepadIndex !== null ? navigator.getGamepads()[this.gamepadIndex] : null;
		if (gp) {
			// Left stick - movement
			const leftAxisX = gp.axes[0] || 0;
			const leftAxisY = gp.axes[1] || 0;
			if (Math.abs(leftAxisX) > 0.15) dx += leftAxisX;
			if (Math.abs(leftAxisY) > 0.15) dy += leftAxisY;
			
			// Right stick - zoom controls
			const rightAxisY = gp.axes[3] || 0; // Right stick Y-axis
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
			if (gp.buttons[12]?.pressed) dy -= 1;
			if (gp.buttons[13]?.pressed) dy += 1;
			if (gp.buttons[14]?.pressed) dx -= 1;
			if (gp.buttons[15]?.pressed) dx += 1;
		}

		if (dx !== 0 || dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= len;
			dy /= len;
			this.player.x += dx * SHIP_SPEED;
			this.player.y += dy * SHIP_SPEED;
			// Clamp to world bounds
			this.player.x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, this.player.x));
			this.player.y = Math.max(WORLD_BOUNDS.minY, Math.min(WORLD_BOUNDS.maxY, this.player.y));
		}
		// Center camera on player
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		this.world.x = centerX - this.player.x;
		this.world.y = centerY - this.player.y;
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
			
			// Create rendering layers
			this.roomsLayer = new PIXI.Container();
			this.doorsLayer = new PIXI.Container();
			this.furnitureLayer = new PIXI.Container();
			
			// Add layers to world in correct order (rooms first, then doors, then furniture)
			this.world.addChild(this.roomsLayer);
			this.world.addChild(this.doorsLayer);
			this.world.addChild(this.furnitureLayer);
			
			// Load room data from admin API
			await this.loadRoomData();
			
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
		try {
			console.log('[DEBUG] Loading room data...');
			
			// Load all room data
			this.rooms = await AdminService.getAllRoomTemplates();
			this.doors = await AdminService.getAllDoors();
			this.furniture = await AdminService.getAllFurniture();
			
			console.log(`[DEBUG] Loaded ${this.rooms.length} rooms, ${this.doors.length} doors, ${this.furniture.length} furniture`);
			console.log('[DEBUG] Rooms:', this.rooms.map(r => ({ id: r.id, name: r.name, type: r.type })));
			
			// Hide starfield when we have rooms to render
			if (this.rooms.length > 0) {
				console.log('[DEBUG] Hiding starfield and showing rooms');
				this.starfield.visible = false;
				// Change background color to make rooms more visible
				this.app.renderer.background.color = 0x111111; // Dark gray instead of space black
			}
		} catch (error) {
			console.error('[DEBUG] Error loading room data:', error);
			// Create demo rooms as fallback
			this.createDemoRooms();
		}
	}

	private createDemoRooms() {
		console.log('[DEBUG] Creating demo rooms as fallback...');
		
		// Create demo room data when API fails
		this.rooms = [
			{
				id: 'demo-gate-room',
				layout_id: 'demo',
				type: 'gate_room',
				name: 'Gate Room',
				description: 'Demo Gate Room',
				startX: -128,
				endX: 128,
				startY: -128,
				endY: 128,
				floor: 0,
				width: 256,
				height: 256,
				image: null,
				created_at: Date.now(),
				updated_at: Date.now()
			},
			{
				id: 'demo-corridor',
				layout_id: 'demo',
				type: 'corridor',
				name: 'Corridor',
				description: 'Demo Corridor',
				startX: 128,
				endX: 256,
				startY: -64,
				endY: 64,
				floor: 0,
				width: 128,
				height: 128,
				image: null,
				created_at: Date.now(),
				updated_at: Date.now()
			}
		] as RoomTemplate[];
		
		this.doors = [];
		this.furniture = [];
		
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
		roomGraphics.rect(-width/2, -height/2, width, height);
		roomGraphics.fill(0x444444); // Medium gray - more visible
		
		// Room walls (bright border)
		roomGraphics.rect(-width/2, -height/2, width, height);
		roomGraphics.stroke({ color: 0xFFFFFF, width: 6 }); // White border - very visible
		
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
				align: 'center'
			}
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
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height);
		doorGraphics.fill(0x8A2BE2); // Purple color like in admin
		
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
		
		// Create furniture graphics (green square for now)
		const furnitureGraphics = new PIXI.Graphics();
		furnitureGraphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height);
		furnitureGraphics.fill(0x00AA00); // Green color
		
		// Position furniture relative to room center
		furnitureGraphics.x = roomCenterX + furniture.x;
		furnitureGraphics.y = roomCenterY + furniture.y;
		furnitureGraphics.rotation = (furniture.rotation * Math.PI) / 180;
		
		this.furnitureLayer.addChild(furnitureGraphics);
		
		console.log(`[DEBUG] Rendered furniture: ${furniture.name} at room-relative (${furniture.x}, ${furniture.y})`);
	}

	private positionPlayerInStartingRoom() {
		// Find the Gate Room to spawn the player
		const gateRoom = this.rooms.find(room => 
			room.type === 'gate_room' || 
			room.name.toLowerCase().includes('gate') ||
			room.name.toLowerCase().includes('stargate')
		);
		
		if (gateRoom) {
			// Position player in center of gate room
			const roomCenterX = gateRoom.startX + (gateRoom.endX - gateRoom.startX) / 2;
			const roomCenterY = gateRoom.startY + (gateRoom.endY - gateRoom.startY) / 2;
			
			this.player.x = roomCenterX;
			this.player.y = roomCenterY;
			
			console.log(`[DEBUG] Player positioned in ${gateRoom.name} at (${roomCenterX}, ${roomCenterY})`);
		} else {
			// Fallback: position in first room
			if (this.rooms.length > 0) {
				const firstRoom = this.rooms[0];
				const roomCenterX = firstRoom.startX + (firstRoom.endX - firstRoom.startX) / 2;
				const roomCenterY = firstRoom.startY + (firstRoom.endY - firstRoom.startY) / 2;
				
				this.player.x = roomCenterX;
				this.player.y = roomCenterY;
				
				console.log(`[DEBUG] Player positioned in ${firstRoom.name} (fallback) at (${roomCenterX}, ${roomCenterY})`);
			}
		}
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
		
		// Center camera on rooms
		const screenCenterX = this.app.screen.width / 2;
		const screenCenterY = this.app.screen.height / 2;
		
		this.world.x = screenCenterX - centerX;
		this.world.y = screenCenterY - centerY;
		
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
