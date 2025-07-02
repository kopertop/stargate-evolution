import type {
	RoomTemplate,
	DoorTemplate,
	RoomFurniture,
} from '@stargate/common';
import * as PIXI from 'pixi.js';

import { HelpPopover } from './help-popover';
import type { GamepadAxis, GamepadButton } from './services/game-controller';
import { TemplateService } from './services/template-service';

const SHIP_SPEED = 4;
const SPEED_MULTIPLIER = 5; // 5x speed when running (Shift/Right Trigger)
const STAR_COUNT = 200;
const STAR_COLOR = 0xffffff;
const STAR_RADIUS = 1.5;

// Door configuration constants - EASILY ADJUSTABLE FOR FUTURE CHANGES
const DOOR_WIDTH = 64; // Width of doors (was 32, now doubled) - Adjust this to change all door widths
const DOOR_HEIGHT = 16; // Height of doors (was 8, now doubled) - Adjust this to change all door heights

// Player configuration constants
const PLAYER_RADIUS = 5; // Player radius (was 10, now halved)
const DEFAULT_ZOOM = 2.0; // Default zoom level (was 1.0, now more zoomed in)


export interface GameOptions {
	speed?: number;
	keybindings?: any;
	gamepadBindings?: any;
	// Controller subscription methods
	onButtonPress?: (button: GamepadButton, callback: () => void) => () => void;
	onButtonRelease?: (button: GamepadButton, callback: () => void) => () => void;
	onAxisChange?: (axis: GamepadAxis, callback: (value: number) => void) => () => void;
	getAxisValue?: (axis: GamepadAxis) => number;
	isPressed?: (button: GamepadButton) => boolean;
}

export class Game {
	private app: PIXI.Application;
	private player: PIXI.Graphics;
	private keys: Record<string, boolean> = {};
	private starfield: PIXI.Graphics;
	private world: PIXI.Container;
	private gameData: any;
	private wasRunning: boolean = false;
	private mapZoom: number = DEFAULT_ZOOM;
	private mapLayer: PIXI.Container | null = null;
	private focusSystem: any = null;
	private focusPlanet: any = null;
	private menuOpen: boolean = false;
	private options: GameOptions;

	// Controller subscription cleanup functions
	private controllerUnsubscribers: (() => void)[] = [];

	// Room rendering system
	private roomsLayer: PIXI.Container | null = null;
	private doorsLayer: PIXI.Container | null = null;
	private furnitureLayer: PIXI.Container | null = null;
	private rooms: RoomTemplate[] = [];
	private doors: DoorTemplate[] = [];
	private furniture: RoomFurniture[] = [];

	constructor(app: PIXI.Application, options: GameOptions = {}, gameData?: any) {
		this.app = app;
		this.options = options;
		this.world = new PIXI.Container();
		this.starfield = this.createStarfield();
		this.gameData = gameData;
		// Only add starfield if we don't have room data - we'll render rooms instead
		this.world.addChild(this.starfield);
		// Create player as circular character sprite
		const playerGraphics = new PIXI.Graphics();
		playerGraphics.circle(0, 0, PLAYER_RADIUS).fill(0xFF6600); // Bright orange circle for player
		playerGraphics.circle(0, 0, PLAYER_RADIUS).stroke({ color: 0xFFFFFF, width: 1 }); // White border (thinner for smaller player)
		playerGraphics.circle(0, 0, PLAYER_RADIUS - 2).stroke({ color: 0xCC4400, width: 1 }); // Inner darker orange ring
		this.player = playerGraphics;
		console.log('[GAME] Created circular player character with radius:', PLAYER_RADIUS);
		this.player.x = 0;
		this.player.y = 0;
		// Player will be added to world after room system is initialized
		this.app.stage.addChild(this.world);
		this.setupInput();
		this.setupControllerInput();
		this.resizeToWindow();
		window.addEventListener('resize', () => this.resizeToWindow());
		if (this.app.ticker) {
			this.app.ticker.add(() => this.update());
		}
		this.setupLegendPopover();
		this.setupMapZoomControls();

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

			// Handle door activation
			if (e.key.toLowerCase() === 'e' || e.key === 'Enter' || e.key === ' ') {
				this.handleDoorActivation();
			}
		});
		window.addEventListener('keyup', (e) => {
			this.keys[e.key.toLowerCase()] = false;
		});
	}

	private setupControllerInput() {
		if (!this.options.onAxisChange || !this.options.getAxisValue || !this.options.isPressed) {
			console.log('[GAME] Controller methods not available - skipping controller setup');
			return;
		}

		console.log('[GAME] Setting up controller input subscriptions');

		// Subscribe to axis changes for movement
		const unsubscribeLeftX = this.options.onAxisChange('LEFT_X', (value) => {
			// Movement will be handled in update loop by polling axis values
		});

		const unsubscribeLeftY = this.options.onAxisChange('LEFT_Y', (value) => {
			// Movement will be handled in update loop by polling axis values
		});

		// Subscribe to right stick for zoom
		const unsubscribeRightY = this.options.onAxisChange('RIGHT_Y', (value) => {
			if (Math.abs(value) > 0.2) {
				const zoomSpeed = 0.02;
				if (value < -0.2) {
					// Right stick up = zoom in
					this.setMapZoom(this.mapZoom * (1 + zoomSpeed));
				} else if (value > 0.2) {
					// Right stick down = zoom out
					this.setMapZoom(this.mapZoom * (1 - zoomSpeed));
				}
			}
		});

		// Subscribe to A button for door activation
		const unsubscribeAButton = this.options.onButtonRelease?.('A', () => {
			if (!this.menuOpen) {
				console.log('[GAME-INPUT] A button released - checking for door activation');
				this.handleDoorActivation();
			}
		});

		// Store unsubscribers for cleanup
		this.controllerUnsubscribers.push(unsubscribeLeftX, unsubscribeLeftY, unsubscribeRightY);
		if (unsubscribeAButton) {
			this.controllerUnsubscribers.push(unsubscribeAButton);
		}
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

		// Check for shift key (running modifier)
		isRunning = this.keys['shift'] || false;

		// Controller input (if available)
		if (this.options.getAxisValue && this.options.isPressed) {
			// Left stick - movement
			const leftAxisX = this.options.getAxisValue('LEFT_X');
			const leftAxisY = this.options.getAxisValue('LEFT_Y');

			if (Math.abs(leftAxisX) > 0.15) {
				dx += leftAxisX;
				console.log('[GAME-INPUT] Left stick X:', leftAxisX.toFixed(3));
			}
			if (Math.abs(leftAxisY) > 0.15) {
				dy += leftAxisY;
				console.log('[GAME-INPUT] Left stick Y:', leftAxisY.toFixed(3));
			}

			// D-pad - movement (fallback/additional control)
			if (this.options.isPressed('DPAD_UP')) {
				console.log('[GAME-INPUT] D-pad UP pressed');
				dy -= 1;
			}
			if (this.options.isPressed('DPAD_DOWN')) {
				console.log('[GAME-INPUT] D-pad DOWN pressed');
				dy += 1;
			}
			if (this.options.isPressed('DPAD_LEFT')) {
				console.log('[GAME-INPUT] D-pad LEFT pressed');
				dx -= 1;
			}
			if (this.options.isPressed('DPAD_RIGHT')) {
				console.log('[GAME-INPUT] D-pad RIGHT pressed');
				dx += 1;
			}

			// Right bumper (RB/R) - running modifier
			if (this.options.isPressed('RB')) {
				console.log('[GAME-INPUT] Right bumper (RB) pressed - running mode');
				isRunning = true;
			}
		}

		if (dx !== 0 || dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= len;
			dy /= len;

			// Calculate movement speed (base speed or running speed)
			const currentSpeed = isRunning ? SHIP_SPEED * SPEED_MULTIPLIER : SHIP_SPEED;

			console.log('[GAME-INPUT] Player movement:', {
				dx: dx.toFixed(3),
				dy: dy.toFixed(3),
				speed: currentSpeed,
				isRunning,
				playerPos: { x: this.player.x.toFixed(1), y: this.player.y.toFixed(1) },
			});

			// Debug logging for running mode (only when state changes)
			if (isRunning && !this.wasRunning) {
				console.log('[GAME] Running mode activated - speed:', currentSpeed);
				this.wasRunning = true;
			} else if (!isRunning && this.wasRunning) {
				console.log('[GAME] Running mode deactivated - speed:', currentSpeed);
				this.wasRunning = false;
			}

			// Calculate new position with collision detection
			const newX = this.player.x + dx * currentSpeed;
			const newY = this.player.y + dy * currentSpeed;

			// Check collision and apply movement
			const finalPosition = this.checkCollision(this.player.x, this.player.y, newX, newY);
			this.player.x = finalPosition.x;
			this.player.y = finalPosition.y;
		}
		// Check for door interactions
		this.checkDoorInteraction();

		// Center camera on player (accounting for world scale)
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		// Player's visual position is player.x * world.scale, so we need to offset by that amount
		this.world.x = centerX - (this.player.x * this.world.scale.x);
		this.world.y = centerY - (this.player.y * this.world.scale.y);
	}

	// Collision detection system
	private checkCollision(currentX: number, currentY: number, newX: number, newY: number): { x: number; y: number } {
		const playerRadius = PLAYER_RADIUS; // Player is a circle with configurable radius
		const wallThreshold = 8; // Reduced buffer zone for smaller player (was 15, now 8)

		// Check room boundaries - player must stay within accessible rooms with wall threshold
		const currentRoom = this.findRoomContainingPoint(currentX, currentY);
		const targetRoom = this.findRoomContainingPoint(newX, newY);
		const targetRoomSafe = this.findRoomContainingPointWithThreshold(newX, newY, wallThreshold);

		// If moving between rooms, check if there's a valid door passage
		if (currentRoom && targetRoom && currentRoom.id !== targetRoom.id) {
			const doorBetweenRooms = this.findDoorBetweenRooms(currentRoom.id, targetRoom.id);
			if (!doorBetweenRooms || doorBetweenRooms.state !== 'opened') {
				// No open door between rooms - block movement
				console.log('[COLLISION] Blocked movement between rooms - no open door');
				return { x: currentX, y: currentY };
			}

			// Check if the player is actually passing through the door opening
			if (!this.isPassingThroughDoor(currentX, currentY, newX, newY, doorBetweenRooms)) {
				// Player is trying to cross room boundary outside of door - block movement
				console.log('[COLLISION] Blocked movement - not passing through door opening');
				return { x: currentX, y: currentY };
			}
		}

		// If moving completely outside any room, block movement
		if (currentRoom && !targetRoom) {
			console.log('[COLLISION] Blocked movement - completely outside room boundaries');
			return { x: currentX, y: currentY };
		}

		// If moving to an area that's too close to walls (outside safe zone), block movement
		if (currentRoom && targetRoom && !targetRoomSafe) {
			// Check if we're near an open door - doors allow closer approach to walls
			const nearbyOpenDoor = this.findNearbyOpenDoor(newX, newY, playerRadius + 10); // Increased door detection range
			if (!nearbyOpenDoor) {
				// Not near an open door and too close to walls - hard stop at current position
				console.log('[COLLISION] Blocked movement - too close to walls (within', wallThreshold, 'px threshold)');
				return { x: currentX, y: currentY };
			}
		}

		// Check furniture collisions
		const collidingFurniture = this.findCollidingFurniture(newX, newY, playerRadius);
		if (collidingFurniture) {
			console.log('[COLLISION] Blocked by furniture:', collidingFurniture.name);
			return { x: currentX, y: currentY };
		}

		// Check door collisions (closed doors block movement)
		const collidingDoor = this.findCollidingDoor(newX, newY, playerRadius);
		if (collidingDoor && collidingDoor.state !== 'opened') {
			console.log('[COLLISION] Blocked by closed door');
			return { x: currentX, y: currentY };
		}

		// No collision detected
		return { x: newX, y: newY };
	}

	private findRoomContainingPoint(x: number, y: number): RoomTemplate | null {
		return this.rooms.find(room =>
			x >= room.startX && x <= room.endX &&
			y >= room.startY && y <= room.endY,
		) || null;
	}

	private findRoomContainingPointWithThreshold(x: number, y: number, threshold: number): RoomTemplate | null {
		return this.rooms.find(room =>
			x >= room.startX + threshold && x <= room.endX - threshold &&
			y >= room.startY + threshold && y <= room.endY - threshold,
		) || null;
	}

	private findDoorBetweenRooms(roomId1: string, roomId2: string): any | null {
		return this.doors.find(door =>
			(door.from_room_id === roomId1 && door.to_room_id === roomId2) ||
			(door.from_room_id === roomId2 && door.to_room_id === roomId1),
		) || null;
	}

	private isPassingThroughDoor(currentX: number, currentY: number, newX: number, newY: number, door: any): boolean {
		const playerRadius = PLAYER_RADIUS;
		const doorTolerance = 15; // Increased tolerance for smaller player (was 5, now 15)

		// Check if either current position or new position is within the door area
		const currentNearDoor = this.isPointNearDoor(currentX, currentY, door, playerRadius + doorTolerance);
		const newNearDoor = this.isPointNearDoor(newX, newY, door, playerRadius + doorTolerance);

		// Player must be moving through the door area (either starting near it or ending near it)
		return currentNearDoor || newNearDoor;
	}

	private isPointNearDoor(x: number, y: number, door: any, tolerance: number): boolean {
		// Transform point to door's local coordinate system to handle rotation
		const dx = x - door.x;
		const dy = y - door.y;

		// Convert door rotation from degrees to radians
		const rotationRad = (door.rotation * Math.PI) / 180;

		// Rotate the point by the negative door rotation to get local coordinates
		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		// Check if point is within the door's local bounding box plus tolerance
		const halfWidth = door.width / 2 + tolerance;
		const halfHeight = door.height / 2 + tolerance;

		return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
	}

	private findNearbyOpenDoor(x: number, y: number, radius: number): any | null {
		return this.doors.find(door => {
			if (door.state !== 'opened') return false;
			const distance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
			return distance <= radius;
		}) || null;
	}

	private findCollidingFurniture(x: number, y: number, playerRadius: number): RoomFurniture | null {
		for (const furniture of this.furniture) {
			if (!furniture.blocks_movement) continue;

			// Find the room this furniture belongs to
			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			// Calculate furniture world position
			const roomCenterX = room.startX + (room.endX - room.startX) / 2;
			const roomCenterY = room.startY + (room.endY - room.startY) / 2;
			const furnitureWorldX = roomCenterX + furniture.x;
			const furnitureWorldY = roomCenterY + furniture.y;

			// Check collision with furniture bounding box
			const furnitureLeft = furnitureWorldX - furniture.width / 2;
			const furnitureRight = furnitureWorldX + furniture.width / 2;
			const furnitureTop = furnitureWorldY - furniture.height / 2;
			const furnitureBottom = furnitureWorldY + furniture.height / 2;

			// Check if player circle intersects with furniture rectangle
			const closestX = Math.max(furnitureLeft, Math.min(x, furnitureRight));
			const closestY = Math.max(furnitureTop, Math.min(y, furnitureBottom));
			const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

			if (distance <= playerRadius) {
				return furniture;
			}
		}
		return null;
	}

	private findCollidingDoor(x: number, y: number, playerRadius: number): any | null {
		for (const door of this.doors) {
			// Transform player position to door's local coordinate system to handle rotation
			const dx = x - door.x;
			const dy = y - door.y;

			// Convert door rotation from degrees to radians
			const rotationRad = (door.rotation * Math.PI) / 180;

			// Rotate the player position by the negative door rotation to get local coordinates
			const cos = Math.cos(-rotationRad);
			const sin = Math.sin(-rotationRad);
			const localX = dx * cos - dy * sin;
			const localY = dx * sin + dy * cos;

			// Check collision with door's local bounding box
			const halfWidth = door.width / 2;
			const halfHeight = door.height / 2;

			// Find closest point on the door rectangle to the player circle center
			const closestX = Math.max(-halfWidth, Math.min(localX, halfWidth));
			const closestY = Math.max(-halfHeight, Math.min(localY, halfHeight));

			// Calculate distance from player center to closest point on door
			const distance = Math.sqrt((localX - closestX) ** 2 + (localY - closestY) ** 2);

			if (distance <= playerRadius) {
				return door;
			}
		}
		return null;
	}



	// Door interaction system
	private checkDoorInteraction(): void {
		// This method is called every frame but currently just exists for future UI indicators
		// When we add door interaction UI, this is where we'll update the visual indicators
	}

	private pushPlayerOutOfDoor(door: any): void {
		const playerRadius = PLAYER_RADIUS;
		const safeDistance = playerRadius + 3; // Reduced margin for smaller player (was 5, now 3)

		// Check if player is colliding with the door
		const collidingDoor = this.findCollidingDoor(this.player.x, this.player.y, playerRadius);
		if (collidingDoor && collidingDoor.id === door.id) {
			// Transform player position to door's local coordinate system
			const dx = this.player.x - door.x;
			const dy = this.player.y - door.y;

			// Convert door rotation from degrees to radians
			const rotationRad = (door.rotation * Math.PI) / 180;

			// Rotate to get local coordinates
			const cos = Math.cos(-rotationRad);
			const sin = Math.sin(-rotationRad);
			const localX = dx * cos - dy * sin;
			const localY = dx * sin + dy * cos;

			// Determine which side of the door to push the player to
			const halfWidth = door.width / 2;
			const halfHeight = door.height / 2;

			// Find the closest edge and push player out in that direction
			let pushLocalX = localX;
			let pushLocalY = localY;

			// Push to the nearest edge with safe distance
			if (Math.abs(localX) > Math.abs(localY)) {
				// Push horizontally
				pushLocalX = localX > 0 ? halfWidth + safeDistance : -halfWidth - safeDistance;
			} else {
				// Push vertically
				pushLocalY = localY > 0 ? halfHeight + safeDistance : -halfHeight - safeDistance;
			}

			// Transform back to world coordinates
			const worldDx = pushLocalX * cos + pushLocalY * sin;
			const worldDy = -pushLocalX * sin + pushLocalY * cos;

			this.player.x = door.x + worldDx;
			this.player.y = door.y + worldDy;

			console.log('[DOOR] Pushed player out of closed door to:', this.player.x.toFixed(1), this.player.y.toFixed(1));
		}
	}

	private handleDoorActivation(): void {
		const interactionRadius = 25; // Slightly reduced for smaller player (was 30, now 25)

		// Find the closest door within interaction range
		let closestDoor: any = null;
		let closestDistance = Infinity;

		for (const door of this.doors) {
			const distance = Math.sqrt((this.player.x - door.x) ** 2 + (this.player.y - door.y) ** 2);
			if (distance <= interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestDoor = door;
			}
		}

		if (closestDoor) {
			this.activateDoor(closestDoor.id);
		} else {
			console.log('[INTERACTION] No doors nearby to activate');
		}
	}

	public activateDoor(doorId: string): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOOR] Door not found:', doorId);
			return false;
		}

		// Check if door can be activated
		if (door.state === 'locked') {
			console.log('[DOOR] Cannot activate locked door:', doorId);
			return false;
		}

		// Check if player has required power/items (placeholder for future implementation)
		if (door.power_required > 0) {
			console.log('[DOOR] Door requires power:', door.power_required);
			// TODO: Check if player/ship has enough power
		}

		// Toggle door state
		if (door.state === 'opened') {
			door.state = 'closed';
			console.log('[DOOR] Closed door:', doorId);

			// Check if player is inside the door and push them out
			this.pushPlayerOutOfDoor(door);
		} else if (door.state === 'closed') {
			door.state = 'opened';
			console.log('[DOOR] Opened door:', doorId);
		}

		// Re-render doors to show state change
		this.renderRooms();

		return true;
	}

	public setMenuOpen(isOpen: boolean) {
		console.log('[GAME] Menu state changed. Is open:', isOpen);
		this.menuOpen = isOpen;
	}

	public destroy() {
		// Cleanup controller subscriptions
		this.controllerUnsubscribers.forEach(unsubscribe => unsubscribe());
		this.controllerUnsubscribers = [];
		console.log('[GAME] Controller subscriptions cleaned up');
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
				width: DOOR_WIDTH,
				height: DOOR_HEIGHT,
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

		// Create door graphics with color based on state
		const doorGraphics = new PIXI.Graphics();

		// Choose color based on door state
		let doorColor: number;
		switch (door.state) {
		case 'opened':
			doorColor = 0x00FF00; // Green for open doors
			break;
		case 'locked':
			doorColor = 0x800000; // Dark red for locked doors
			break;
		case 'closed':
		default:
			doorColor = 0xFF0000; // Red for closed doors
			break;
		}

		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).fill(doorColor);

		// Add a white border for visibility
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).stroke({ color: 0xFFFFFF, width: 2 });

		// Position door
		doorGraphics.x = door.x;
		doorGraphics.y = door.y;
		doorGraphics.rotation = (door.rotation * Math.PI) / 180; // Convert degrees to radians

		this.doorsLayer.addChild(doorGraphics);

		console.log(`[DEBUG] Rendered door at (${door.x}, ${door.y}) size (${door.width}x${door.height}) rotation: ${door.rotation}° state: ${door.state}`);
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

		// Center camera on rooms (accounting for world scale)
		const screenCenterX = this.app.screen.width / 2;
		const screenCenterY = this.app.screen.height / 2;

		this.world.x = screenCenterX - (centerX * this.world.scale.x);
		this.world.y = screenCenterY - (centerY * this.world.scale.y);

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
