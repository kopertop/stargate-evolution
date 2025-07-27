import type {
	RoomTemplate,
	DoorTemplate,
	RoomFurniture,
	NPC,
} from '@stargate/common';
import * as PIXI from 'pixi.js';

import { BackgroundLayer } from './components/background-layer';
import { DoorsLayer } from './components/doors-layer';
import { FogLayer } from './components/fog-layer';
import { FurnitureLayer, type ElevatorConfig } from './components/furniture-layer';
import { MapLayer } from './components/map-layer';
import { NPCLayer } from './components/npc-layer';
import { RoomsLayer } from './components/rooms-layer';
import { HelpPopover } from './help-popover';
import type { GamepadAxis, GamepadButton } from './services/game-controller';
import { SavedGameService } from './services/saved-game-service';
import { TemplateService } from './services/template-service';
import { debugLogger } from './utils/debug-logger';
import { isMobileDevice } from './utils/mobile-utils';
import { TouchControlManager, TouchUtils } from './utils/touch-controls';

const SHIP_SPEED = 4;
const SPEED_MULTIPLIER = 5; // 5x speed when running (Shift/Right Trigger);

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
	// Floor management
	currentFloor?: number;
	onFloorChange?: (floor: number) => void;
	// Elevator system
	onElevatorActivation?: (elevatorConfig: ElevatorConfig, currentFloor: number) => void;
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
	private mapLayer: MapLayer | null = null;
	private focusSystem: any = null;
	private focusPlanet: any = null;
	private menuOpen: boolean = false;
	private options: GameOptions;

	// Dynamic background system
	private backgroundLayer: BackgroundLayer | null = null;

	// Controller subscription cleanup functions
	private controllerUnsubscribers: (() => void)[] = [];

	// Room rendering system
	private roomsLayer: RoomsLayer | null = null;
	private doorsLayer: DoorsLayer | null = null;
	private furnitureLayer: FurnitureLayer | null = null;
	private npcLayer: NPCLayer | null = null;
	private rooms: RoomTemplate[] = [];
	private doors: DoorTemplate[] = [];
	private furniture: RoomFurniture[] = [];

	// Floor management
	private currentFloor: number = 0;

	// NPC system

	// Pending restoration data (stored until room system is ready)
	private pendingRestoration: any = null;
	private isDestroyed = false;

	// Fog of War system
	private fogLayer: FogLayer | null = null;


	// Touch control properties
	private touchControlManager: TouchControlManager | null = null;
	private touchMovement: { x: number; y: number } = { x: 0, y: 0 };
	private isTouchRunning: boolean = false;

	// Window event handlers for cleanup
	private resizeHandler?: () => void;
	private keydownHandler?: (e: KeyboardEvent) => void;
	private keyupHandler?: (e: KeyboardEvent) => void;
	private helpKeyHandler?: (e: KeyboardEvent) => void;
	private zoomKeyHandler?: (e: KeyboardEvent) => void;

	constructor(app: PIXI.Application, options: GameOptions = {}, gameData?: any) {
		this.app = app;
		this.options = options;
		this.world = new PIXI.Container();
		this.gameData = gameData;

		// Initialize floor management
		this.currentFloor = options.currentFloor ?? 0;

		// Create background layer system
		this.backgroundLayer = new BackgroundLayer({
			onBackgroundTypeChange: (newType: 'stars' | 'ftl') => {
				console.log('[GAME] Background type changed to:', newType);
			},
		});

		// Add background layer at the bottom
		this.world.addChildAt(this.backgroundLayer, 0);

		// Create deprecated starfield for backward compatibility
		this.starfield = this.createStarfield();
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

		// Store resize handler for cleanup
		this.resizeHandler = () => this.resizeToWindow();
		window.addEventListener('resize', this.resizeHandler);
		if (this.app.ticker) {
			this.app.ticker.add(() => this.update());
		}
		this.setupLegendPopover();
		this.setupMapZoomControls();

		// Initialize room rendering system
		this.initializeRoomSystem().catch((error) => {
			console.error('[GAME] Failed to initialize room system:', error);
			// Show error to user - the game cannot function without room data
			throw new Error(`Game initialization failed: ${error.message}`);
		});

		// Initialize Fog of War manager
		// Initialize fog layer with smaller tiles for better room boundaries
		this.fogLayer = new FogLayer({
			onFogDiscovery: (newTilesDiscovered: number) => {
				console.log('[GAME] New fog tiles discovered:', newTilesDiscovered);
			},
			onFogClear: () => {
				console.log('[GAME] Fog of war cleared');
			},
		});
		this.world.addChild(this.fogLayer);
		// Inject obstacle checker for fog line-of-sight
		// Allow visibility of current room + adjacent walls, but block other rooms
		this.fogLayer.setObstacleChecker((tileX, tileY) => {
			const playerPos = this.getPlayerPosition();
			const tileSize = 16; // Must match the fog tile size

			// Convert tile coordinates to world coordinates (tile center)
			const tileWorldX = tileX * tileSize + tileSize / 2;
			const tileWorldY = tileY * tileSize + tileSize / 2;

			// Find which room the target tile is in
			const targetRoom = this.rooms.find(room =>
				tileWorldX >= room.startX && tileWorldX < room.endX &&
				tileWorldY >= room.startY && tileWorldY < room.endY,
			);

			// Find which room the player is in
			const playerRoom = this.rooms.find(room =>
				playerPos.x >= room.startX && playerPos.x < room.endX &&
				playerPos.y >= room.startY && playerPos.y < room.endY,
			);

			// Allow visibility of tiles in the player's current room
			if (targetRoom && playerRoom && targetRoom.id === playerRoom.id) {
				return false; // Same room = visible
			}

			// Allow visibility of wall tiles adjacent to the player's room
			if (!targetRoom && playerRoom) {
				// This is a wall tile - check if it's adjacent to the player's room
				const wallBuffer = 32; // Allow seeing walls within 32px of room boundary
				const isAdjacentToPlayerRoom = (
					tileWorldX >= playerRoom.startX - wallBuffer && tileWorldX <= playerRoom.endX + wallBuffer &&
					tileWorldY >= playerRoom.startY - wallBuffer && tileWorldY <= playerRoom.endY + wallBuffer
				);
				return !isAdjacentToPlayerRoom; // Show adjacent walls, block distant walls
			}

			// Block all other tiles (different rooms, undefined states)
			return true;
		});

		// Initialize map layer
		this.mapLayer = new MapLayer({
			onSystemFocus: (systemId: string) => {
				console.log('[GAME] System focused via map:', systemId);
			},
			onPlanetFocus: (planetId: string) => {
				console.log('[GAME] Planet focused via map:', planetId);
			},
			onZoomChange: (newZoom: number) => {
				console.log('[GAME] Map zoom changed to:', newZoom);
				this.mapZoom = newZoom;
			},
		});

		// Setup touch controls for mobile
		this.setupTouchControls();
	}

	// Floor management getter
	public getCurrentFloor(): number {
		return this.currentFloor;
	}

	private createStarfield(): PIXI.Graphics {
		// Kept for backward compatibility - actual starfield is handled by BackgroundLayer
		return new PIXI.Graphics();
	}

	public setBackgroundType(type: 'stars' | 'ftl') {
		if (this.backgroundLayer) {
			this.backgroundLayer.setBackgroundType(type);
		}
	}

	public updateFTLStatus(ftlStatus: string) {
		if (this.backgroundLayer) {
			this.backgroundLayer.updateFTLStatus(ftlStatus);
		}
	}

	private setupInput() {
		this.keydownHandler = (e: KeyboardEvent) => {
			this.keys[e.key.toLowerCase()] = true;
			if (e.key.toLowerCase() === 'e' || e.key === 'Enter' || e.key === ' ') {
				this.handleDoorActivation();
				this.furnitureLayer?.handleFurnitureActivation(this.player.x, this.player.y, this.currentFloor);
			}
		};

		this.keyupHandler = (e: KeyboardEvent) => {
			this.keys[e.key.toLowerCase()] = false;
		};

		window.addEventListener('keydown', this.keydownHandler);
		window.addEventListener('keyup', this.keyupHandler);
	}

	private setupTouchControls() {
		if (!isMobileDevice()) {
			console.log('[GAME] Skipping touch controls setup - not a mobile device');
			return;
		}

		// Get the canvas element for touch events
		const canvas = this.app.canvas as HTMLCanvasElement;
		if (!canvas) {
			console.error('[GAME] Cannot setup touch controls - canvas not found');
			return;
		}

		console.log('[GAME] Setting up touch controls for mobile device');

		this.touchControlManager = new TouchControlManager(canvas, {
			onDragMove: (deltaX: number, deltaY: number, state) => {
				// Convert touch delta to movement with sensitivity adjustment
				const sensitivity = 0.003; // Adjust this to control movement speed
				const movement = TouchUtils.deltaToMovement(deltaX, deltaY, sensitivity);

				this.touchMovement.x = movement.x;
				this.touchMovement.y = movement.y;

				// Enable running if the drag distance is large (fast movement)
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				this.isTouchRunning = distance > 100; // Adjust threshold as needed
			},

			onDragEnd: () => {
				// Stop movement when touch ends
				this.touchMovement.x = 0;
				this.touchMovement.y = 0;
				this.isTouchRunning = false;
			},

			onTap: (x: number, y: number) => {
				// Handle tap to activate interactables
				this.handleTouchTap(x, y);
			},

			deadZone: 15, // Minimum movement to start dragging
			tapThreshold: 25, // Maximum movement for tap detection
			tapTimeThreshold: 300, // Maximum time for tap detection
		});
	}

	private handleTouchTap(screenX: number, screenY: number) {
		console.log('[GAME] Touch tap detected - activating nearby interactables (like spacebar)');

		// Just do exactly what spacebar does - check for nearby doors and furniture
		this.handleDoorActivation();
		this.furnitureLayer?.handleFurnitureActivation(screenX, screenY, this.currentFloor);
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

		// Right stick zoom will be handled in update loop for smooth continuous zooming
		const unsubscribeRightY = this.options.onAxisChange('RIGHT_Y', (value) => {
			// No longer handle zoom here - moved to update loop for smoothness
		});

		// Subscribe to A button for door activation
		const unsubscribeAButton = this.options.onButtonRelease?.('A', () => {
			if (!this.menuOpen) {
				console.log('[GAME-INPUT] A button released - checking for door/furniture activation');
				this.handleDoorActivation();
				this.furnitureLayer?.handleFurnitureActivation(this.player.x, this.player.y, this.currentFloor);
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

		// Touch input (mobile)
		if (this.touchMovement.x !== 0 || this.touchMovement.y !== 0) {
			dx += this.touchMovement.x;
			dy += this.touchMovement.y;
			isRunning = isRunning || this.isTouchRunning;

			// Debug touch input
			console.log('[GAME-INPUT] Touch movement:', this.touchMovement.x.toFixed(3), this.touchMovement.y.toFixed(3), 'running:', this.isTouchRunning);
		}

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

			// Right trigger (RT) - running modifier
			if (this.options.isPressed('RT')) {
				console.log('[GAME-INPUT] Right trigger (RT) pressed - running mode');
				isRunning = true;
			}

			// Right stick Y - smooth continuous zoom
			const rightAxisY = this.options.getAxisValue('RIGHT_Y');
			if (Math.abs(rightAxisY) > 0.12) { // Lower deadzone for responsive control
				// Use variable zoom speed based on stick deflection with smooth curve
				const stickIntensity = Math.abs(rightAxisY);
				// Apply smooth easing curve for more natural feel
				const easedIntensity = stickIntensity * stickIntensity; // Quadratic easing
				const baseZoomSpeed = 0.004; // Slower base speed for ultra-smooth continuous control
				const zoomSpeed = baseZoomSpeed * (1 + easedIntensity * 2); // Scale with eased deflection

				if (rightAxisY < -0.12) {
					// Right stick up = zoom in
					this.setMapZoom(this.mapZoom * (1 + zoomSpeed));
				} else if (rightAxisY > 0.12) {
					// Right stick down = zoom out
					this.setMapZoom(this.mapZoom * (1 - zoomSpeed));
				}
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

		// Update background layer (handles FTL animation)
		if (this.backgroundLayer) {
			this.backgroundLayer.update();
		}

		// Center camera on player (accounting for world scale)
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;
		// Player's visual position is player.x * world.scale, so we need to offset by that amount
		this.world.x = centerX - (this.player.x * this.world.scale.x);
		this.world.y = centerY - (this.player.y * this.world.scale.y);

		// Update NPCs
		if (this.npcLayer) {
			this.npcLayer.update((doorId, isNPC) => this.activateDoor(doorId, isNPC));
		}

		// Update fog discovery based on player position before rendering fog
		if (this.fogLayer) {
			const playerPos = this.getPlayerPosition();
			const currentRoom = this.findRoomContainingPoint(playerPos.x, playerPos.y);
			this.fogLayer.updatePlayerPosition({
				x: playerPos.x,
				y: playerPos.y,
				roomId: currentRoom?.id || 'unknown',
			});
			const viewportBounds = this.getViewportBounds();
			this.fogLayer.renderFogOfWar(viewportBounds);
		}
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
		// Only consider rooms on the current floor
		return this.rooms.find(room =>
			room.floor === this.currentFloor &&
			x >= room.startX && x <= room.endX &&
			y >= room.startY && y <= room.endY,
		) || null;
	}

	private findRoomContainingPointWithThreshold(x: number, y: number, threshold: number): RoomTemplate | null {
		// Only consider rooms on the current floor
		return this.rooms.find(room =>
			room.floor === this.currentFloor &&
			x >= room.startX + threshold && x <= room.endX - threshold &&
			y >= room.startY + threshold && y <= room.endY - threshold,
		) || null;
	}

	private findDoorBetweenRooms(roomId1: string, roomId2: string): any | null {
		// Only consider doors between rooms on the current floor
		return this.doors.find(door => {
			const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
			const toRoom = this.rooms.find(r => r.id === door.to_room_id);

			// Include doors where at least one room is on the current floor
			// This matches the main floor filtering logic used in setCurrentFloor
			const fromOnCurrentFloor = fromRoom?.floor === this.currentFloor;
			const toOnCurrentFloor = toRoom?.floor === this.currentFloor;
			const isCurrentFloor = fromOnCurrentFloor || toOnCurrentFloor;

			return isCurrentFloor && (
				(door.from_room_id === roomId1 && door.to_room_id === roomId2) ||
				(door.from_room_id === roomId2 && door.to_room_id === roomId1)
			);
		}) || null;
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
		// Only consider doors on the current floor
		return this.doors.find(door => {
			if (door.state !== 'opened') return false;

			// Check if door is on current floor
			const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
			const toRoom = this.rooms.find(r => r.id === door.to_room_id);

			// Include doors where at least one room is on the current floor
			// This matches the main floor filtering logic used in setCurrentFloor
			const fromOnCurrentFloor = fromRoom?.floor === this.currentFloor;
			const toOnCurrentFloor = toRoom?.floor === this.currentFloor;

			if (!fromOnCurrentFloor && !toOnCurrentFloor) {
				return false;
			}

			const distance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
			return distance <= radius;
		}) || null;
	}

	private findCollidingFurniture(x: number, y: number, playerRadius: number): RoomFurniture | null {
		return this.furnitureLayer?.findCollidingFurniture(x, y, playerRadius) || null;
	}

	private findCollidingDoor(x: number, y: number, playerRadius: number): any | null {
		// Only consider doors on the current floor
		const currentFloorDoors = this.doors.filter(door => {
			const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
			const toRoom = this.rooms.find(r => r.id === door.to_room_id);

			// Include doors where at least one room is on the current floor
			// This matches the main floor filtering logic used in setCurrentFloor
			const fromOnCurrentFloor = fromRoom?.floor === this.currentFloor;
			const toOnCurrentFloor = toRoom?.floor === this.currentFloor;

			return fromOnCurrentFloor || toOnCurrentFloor;
		});

		for (const door of currentFloorDoors) {
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
		const safeDistance = playerRadius + 15; // Increased safety margin (was 3, now 15)

		// Check if player is colliding with the door
		const collidingDoor = this.findCollidingDoor(this.player.x, this.player.y, playerRadius);
		if (collidingDoor && collidingDoor.id === door.id) {
			console.log('[DOOR] Player is colliding with door - attempting to push out');

			// Store original position in case we need to revert
			const originalX = this.player.x;
			const originalY = this.player.y;

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

			// Calculate door bounds
			const halfWidth = door.width / 2;
			const halfHeight = door.height / 2;

			// Try multiple push directions in order of preference
			const pushAttempts = [
				// Primary direction based on player's relative position
				{
					localX: Math.abs(localX) > Math.abs(localY)
						? (localX > 0 ? halfWidth + safeDistance : -halfWidth - safeDistance)
						: localX,
					localY: Math.abs(localX) > Math.abs(localY)
						? localY
						: (localY > 0 ? halfHeight + safeDistance : -halfHeight - safeDistance),
					description: 'primary direction',
				},
				// Try all four cardinal directions with larger safe distance
				{
					localX: halfWidth + safeDistance,
					localY: 0,
					description: 'right side',
				},
				{
					localX: -halfWidth - safeDistance,
					localY: 0,
					description: 'left side',
				},
				{
					localX: 0,
					localY: halfHeight + safeDistance,
					description: 'bottom side',
				},
				{
					localX: 0,
					localY: -halfHeight - safeDistance,
					description: 'top side',
				},
				// Try diagonal directions with even larger safe distance
				{
					localX: halfWidth + safeDistance * 1.5,
					localY: halfHeight + safeDistance * 1.5,
					description: 'bottom-right diagonal',
				},
				{
					localX: -halfWidth - safeDistance * 1.5,
					localY: halfHeight + safeDistance * 1.5,
					description: 'bottom-left diagonal',
				},
				{
					localX: halfWidth + safeDistance * 1.5,
					localY: -halfHeight - safeDistance * 1.5,
					description: 'top-right diagonal',
				},
				{
					localX: -halfWidth - safeDistance * 1.5,
					localY: -halfHeight - safeDistance * 1.5,
					description: 'top-left diagonal',
				},
			];

			// Try each push direction
			for (const attempt of pushAttempts) {
				// Transform back to world coordinates
				const worldDx = attempt.localX * cos + attempt.localY * sin;
				const worldDy = -attempt.localX * sin + attempt.localY * cos;

				const candidateX = door.x + worldDx;
				const candidateY = door.y + worldDy;

				// Validate the candidate position using existing collision system
				const validatedPosition = this.checkCollision(originalX, originalY, candidateX, candidateY);

				// If the validated position is the same as candidate, it's safe
				if (Math.abs(validatedPosition.x - candidateX) < 0.1 &&
					Math.abs(validatedPosition.y - candidateY) < 0.1) {

					this.player.x = candidateX;
					this.player.y = candidateY;

					console.log(`[DOOR] Successfully pushed player out of door to ${attempt.description}:`,
						this.player.x.toFixed(1), this.player.y.toFixed(1));
					return;
				} else {
					console.log(`[DOOR] Push attempt to ${attempt.description} failed - position not safe`);
				}
			}

			// If all push attempts failed, try to move player to center of current room
			const currentRoom = this.findRoomContainingPoint(originalX, originalY);
			if (currentRoom) {
				const roomCenterX = currentRoom.startX + (currentRoom.endX - currentRoom.startX) / 2;
				const roomCenterY = currentRoom.startY + (currentRoom.endY - currentRoom.startY) / 2;

				// Validate room center position
				const validatedCenter = this.checkCollision(originalX, originalY, roomCenterX, roomCenterY);

				if (Math.abs(validatedCenter.x - roomCenterX) < 0.1 &&
					Math.abs(validatedCenter.y - roomCenterY) < 0.1) {

					this.player.x = roomCenterX;
					this.player.y = roomCenterY;

					console.log('[DOOR] Moved player to safe room center:',
						this.player.x.toFixed(1), this.player.y.toFixed(1));
					return;
				}
			}

			// Last resort: find any safe position in the current room
			const safePosition = this.findSafePositionInRoom(originalX, originalY);
			if (safePosition) {
				this.player.x = safePosition.x;
				this.player.y = safePosition.y;

				console.log('[DOOR] Moved player to emergency safe position:',
					this.player.x.toFixed(1), this.player.y.toFixed(1));
				return;
			}

			// If all else fails, keep player at original position and log error
			console.error('[DOOR] Failed to find safe position - keeping player at original location');
			this.player.x = originalX;
			this.player.y = originalY;
		}
	}

	private handleDoorActivation(): void {
		const interactionRadius = 25; // Slightly reduced for smaller player (was 30, now 25)

		// Find the closest door within interaction range on current floor
		let closestDoor: any = null;
		let closestDistance = Infinity;

		// Only consider doors on the current floor
		const currentFloorDoors = this.doors.filter(door => {
			const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
			const toRoom = this.rooms.find(r => r.id === door.to_room_id);

			// Include doors where at least one room is on the current floor
			// This matches the main floor filtering logic used in setCurrentFloor
			const fromOnCurrentFloor = fromRoom?.floor === this.currentFloor;
			const toOnCurrentFloor = toRoom?.floor === this.currentFloor;

			return fromOnCurrentFloor || toOnCurrentFloor;
		});

		for (const door of currentFloorDoors) {
			const distance = Math.sqrt((this.player.x - door.x) ** 2 + (this.player.y - door.y) ** 2);
			if (distance <= interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestDoor = door;
			}
		}

		if (closestDoor) {
			this.activateDoor(closestDoor.id);
		} else {
			console.log('[INTERACTION] No doors nearby to activate on floor', this.currentFloor);
		}
	}

	public activateDoor(doorId: string, isNPC: boolean = false): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOOR] Door not found:', doorId);
			return false;
		}

		// Verify door is on current floor
		const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
		const toRoom = this.rooms.find(r => r.id === door.to_room_id);
		if (fromRoom?.floor !== this.currentFloor || toRoom?.floor !== this.currentFloor) {
			console.log('[DOOR] Door not on current floor:', doorId, 'floor:', fromRoom?.floor, toRoom?.floor, 'current:', this.currentFloor);
			return false;
		}

		// Check if door can be activated
		if (door.state === 'locked') {
			console.log('[DOOR] Cannot activate locked door:', doorId);
			return false;
		}

		// NPC access control
		if (isNPC) {
			// NPCs can only open doors that have been cleared by the user
			if (!door.cleared) {
				console.log('[DOOR] NPC cannot open uncleared door:', doorId);
				return false;
			}
			// NPCs cannot open restricted doors
			if (door.restricted) {
				console.log('[DOOR] NPC cannot open restricted door:', doorId);
				return false;
			}
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

			// Mark door as cleared when user opens it for the first time
			if (!isNPC && !door.cleared) {
				door.cleared = true;
				console.log('[DOOR] Marked door as cleared by user:', doorId);
			}
		}

		// Re-render doors to show state change
		this.renderRooms();

		return true;
	}

	public setMenuOpen(isOpen: boolean) {
		console.log('[GAME] Menu state changed. Is open:', isOpen);
		this.menuOpen = isOpen;
	}

	// NPC management methods
	public addNPC(npc: NPC): void {
		if (this.npcLayer) {
			this.npcLayer.addNPC(npc);
			console.log('[GAME] Added NPC:', npc.id);
		}
	}

	public removeNPC(npcId: string): void {
		if (this.npcLayer) {
			this.npcLayer.removeNPC(npcId);
			console.log('[GAME] Removed NPC:', npcId);
		}
	}

	public getNPCs(): NPC[] {
		return this.npcLayer ? this.npcLayer.getNPCs() : [];
	}

	public getNPC(id: string): NPC | undefined {
		return this.npcLayer ? this.npcLayer.getNPC(id) : undefined;
	}

	// Door restriction management
	public setDoorRestricted(doorId: string, restricted: boolean): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOOR] Door not found for restriction update:', doorId);
			return false;
		}

		door.restricted = restricted;
		console.log('[DOOR] Set door restriction:', doorId, 'restricted:', restricted);

		// Re-render doors to show potential visual changes
		this.renderRooms();
		return true;
	}

	public getDoorRestrictions(): { doorId: string; restricted: boolean; cleared: boolean }[] {
		return this.doors.map(door => ({
			doorId: door.id,
			restricted: door.restricted || false,
			cleared: door.cleared || false,
		}));
	}

	// Initialize test NPCs for development
	private initializeTestNPCs(): void {
		if (this.npcLayer) {
			this.npcLayer.initializeTestNPCs();
		}
	}

	public destroy() {
		if (this.isDestroyed) {
			console.warn('[GAME] Attempted to destroy already destroyed game instance');
			return;
		}

		this.isDestroyed = true;
		console.log('[GAME] Starting game destruction...');

		try {
			// Clean up window event listeners
			if (this.resizeHandler) {
				window.removeEventListener('resize', this.resizeHandler);
			}
			if (this.keydownHandler) {
				window.removeEventListener('keydown', this.keydownHandler);
			}
			if (this.keyupHandler) {
				window.removeEventListener('keyup', this.keyupHandler);
			}
			if (this.helpKeyHandler) {
				window.removeEventListener('keydown', this.helpKeyHandler);
			}
			if (this.zoomKeyHandler) {
				window.removeEventListener('keydown', this.zoomKeyHandler);
			}

			// Clean up controller subscriptions
			this.controllerUnsubscribers.forEach(unsubscribe => {
				try {
					unsubscribe();
				} catch (error) {
					console.warn('[GAME] Error unsubscribing controller:', error);
				}
			});
			this.controllerUnsubscribers = [];

			// Clean up touch controls
			if (this.touchControlManager) {
				try {
					this.touchControlManager.destroy();
					this.touchControlManager = null;
				} catch (error) {
					console.warn('[GAME] Error destroying touch controls:', error);
				}
			}

			// Clean up layer components
			try {
				this.backgroundLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying background layer:', error);
			}

			try {
				this.roomsLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying rooms layer:', error);
			}

			try {
				this.doorsLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying doors layer:', error);
			}

			try {
				this.furnitureLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying furniture layer:', error);
			}

			try {
				this.npcLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying NPC layer:', error);
			}

			try {
				this.fogLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying fog layer:', error);
			}

			try {
				this.mapLayer?.destroy();
			} catch (error) {
				console.warn('[GAME] Error destroying map layer:', error);
			}

			// Stop ticker but don't destroy the app (managed by React component)
			try {
				if (this.app.ticker) {
					this.app.ticker.stop();
				}
			} catch (error) {
				console.warn('[GAME] Error stopping ticker:', error);
			}

			console.log('[GAME] Game destruction completed successfully');
		} catch (error) {
			console.error('[GAME] Critical error during game destruction:', error);
		}
	}

	// Game state restoration methods
	public setPlayerPosition(x: number, y: number, roomId?: string) {
		this.player.x = x;
		this.player.y = y;
		console.log('[GAME] Player position restored to:', { x, y, roomId });

		// If roomId is provided, validate that the room exists
		if (roomId) {
			const room = this.rooms.find(r => r.id === roomId);
			if (room) {
				console.log('[GAME] Player is in room:', room.name || room.id);

				// Auto-switch to the correct floor if player is in a room on a different floor
				if (room.floor !== this.currentFloor) {
					console.log(`[GAME] Player is on floor ${room.floor}, but current floor is ${this.currentFloor}. Switching floors...`);
					this.setCurrentFloor(room.floor);
				}
			} else {
				console.warn('[GAME] Room not found for roomId:', roomId);
			}
		}

		// Trigger fog discovery at the new position
		if (this.fogLayer) {
			const currentRoom = this.findRoomContainingPoint(this.player.x, this.player.y);
			this.fogLayer.updatePlayerPosition({
				x: this.player.x,
				y: this.player.y,
				roomId: currentRoom?.id || 'unknown',
			});
			console.log('[GAME] Fog discovery triggered at new player position');
		}
	}

	public restoreDoorStates(doorStates: any[]) {
		console.log('[GAME] Restoring door states:', doorStates.length, 'doors');

		// Update door states in our internal doors array
		doorStates.forEach(savedDoor => {
			const doorIndex = this.doors.findIndex(d => d.id === savedDoor.id);
			if (doorIndex !== -1) {
				// Update the door state
				this.doors[doorIndex] = { ...this.doors[doorIndex], ...savedDoor };
				console.log('[GAME] Restored door state:', savedDoor.id, 'state:', savedDoor.state);
			} else {
				console.warn('[GAME] Door not found for restoration:', savedDoor.id);
			}
		});

		// Re-render rooms to reflect door state changes
		this.renderRooms();
	}

	public getPlayerPosition(): { x: number; y: number } {
		return { x: this.player.x, y: this.player.y };
	}

	public getTimeSpeed(): number {
		// This method should be implemented to return the current game time speed
		// For now, return 1 as default. This should be connected to the actual time speed system.
		return 1;
	}

	// Floor management methods
	public getCurrentFloor(): number {
		return this.currentFloor;
	}

	public setCurrentFloor(floor: number): void {
		if (this.currentFloor !== floor) {
			debugLogger.floor(`Changing floor from ${this.currentFloor} to ${floor}`);
			console.log('[GAME] Changing floor from', this.currentFloor, 'to', floor);

			// Update fog layer to the new floor before changing current floor
			if (this.fogLayer) {
				this.fogLayer.setCurrentFloor(floor);
			}

			this.currentFloor = floor;

			// Re-render rooms to show only the current floor
			this.renderRooms();

			// Trigger fog discovery at current player position after floor change
			if (this.fogLayer) {
				const playerPos = this.getPlayerPosition();
				const currentRoom = this.findRoomContainingPoint(playerPos.x, playerPos.y);
				this.fogLayer.updatePlayerPosition({
					x: playerPos.x,
					y: playerPos.y,
					roomId: currentRoom?.id || 'unknown',
				});
				console.log('[GAME] Fog discovery triggered after floor change');
			}

			// Notify listeners of floor change
			if (this.options.onFloorChange) {
				this.options.onFloorChange(floor);
			}
		}
	}

	public getAvailableFloors(): number[] {
		// Get unique floor numbers from all rooms, sorted
		const floors = Array.from(new Set(this.rooms.map(room => room.floor))).sort((a, b) => a - b);
		console.log('[GAME] Available floors:', floors);
		return floors;
	}

	public findElevatorPosition(targetFloor: number): { x: number; y: number } | null {
		// Delegate to furniture layer
		return this.furnitureLayer?.findElevatorPosition(targetFloor) || null;
	}

	public getStargatePosition(): { x: number; y: number } | null {
		// Find the stargate furniture by its specific ID
		const stargateFurniture = this.furniture.find(f => f.id === 'stargate');

		if (!stargateFurniture) {
			console.warn('[DEBUG] No stargate furniture found');
			return null;
		}

		// Find the room this furniture belongs to
		const room = this.rooms.find(r => r.id === stargateFurniture.room_id);
		if (!room) {
			console.warn(`[DEBUG] Stargate furniture has invalid room_id: ${stargateFurniture.room_id}`);
			return null;
		}

		// Calculate room center
		const roomCenterX = room.startX + (room.endX - room.startX) / 2;
		const roomCenterY = room.startY + (room.endY - room.startY) / 2;

		// Calculate stargate world position (center of the furniture)
		const stargateX = roomCenterX + stargateFurniture.x;
		const stargateY = roomCenterY + stargateFurniture.y;

		console.log(`[DEBUG] Found stargate at world position (${stargateX}, ${stargateY})`);
		return { x: stargateX, y: stargateY };
	}

	public getCurrentRoomId(): string | null {
		const currentRoom = this.findRoomContainingPoint(this.player.x, this.player.y);
		return currentRoom ? currentRoom.id : null;
	}

	public getDoorStates(): any[] {
		return this.doors.map(door => ({
			id: door.id,
			state: door.state,
			from_room_id: door.from_room_id,
			to_room_id: door.to_room_id,
			x: door.x,
			y: door.y,
			width: door.width,
			height: door.height,
			rotation: door.rotation,
			is_automatic: door.is_automatic,
			open_direction: door.open_direction,
			style: door.style,
			color: door.color,
			requirements: door.requirements,
			power_required: door.power_required,
		}));
	}

	// Game state serialization - gets all current game engine state
	public toJSON(): any {
		const playerPosition = this.getPlayerPosition();
		const doorStates = this.getDoorStates();
		const currentRoomId = this.getCurrentRoomId();
		const npcs = this.getNPCs();

		return {
			playerPosition: {
				x: playerPosition.x,
				y: playerPosition.y,
				roomId: currentRoomId,
			},
			doorStates,
			fogOfWar: this.fogLayer?.getAllFogData() || {}, // Save all floor fog data
			npcs, // Include NPC data in save state
			// Add other game state as needed
			mapZoom: this.mapZoom,
			currentBackgroundType: this.backgroundLayer?.getCurrentBackgroundType() || 'stars',
			currentFloor: this.currentFloor,
		};
	}

	// Save game state directly to backend
	public async save(gameId: string, gameName: string, contextData: any): Promise<void> {
		const gameEngineData = this.toJSON();

		// Combine game engine data with context data
		const fullGameData = {
			...contextData,
			...gameEngineData,
		};

		console.log('[GAME] Saving game state:', {
			gameId,
			gameName,
			playerPosition: gameEngineData.playerPosition,
			doorStatesCount: gameEngineData.doorStates.length,
			fullDataSize: JSON.stringify(fullGameData).length,
		});

		try {
			// Save to backend using SavedGameService
			await SavedGameService.updateGameState(gameId, fullGameData);
			console.log('[GAME] Game state saved successfully to backend');
		} catch (error) {
			console.error('[GAME] Failed to save game state:', error);
			throw new Error(`Failed to save game: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Load game state from saved data
	public loadFromJSON(gameData: any): void {
		if (this.isDestroyed) {
			console.log('[GAME] Game destroyed - skipping restoration');
			return;
		}

		console.log('[GAME] Loading game state from saved data');

		// If room system isn't initialized yet, store data for later restoration
		if (this.rooms.length === 0) {
			console.log('[GAME] Room system not ready - storing data for later restoration');
			this.pendingRestoration = gameData;
			return;
		}

		this.performRestoration(gameData);
	}

	private performRestoration(gameData: any): void {
		if (this.isDestroyed) {
			console.log('[GAME] Game destroyed during restoration - aborting');
			return;
		}

		console.log('[GAME] Performing game state restoration');

		// Restore player position
		if (gameData.playerPosition) {
			const savedPosition = gameData.playerPosition;

			// Check if the saved room still exists
			const savedRoom = this.rooms.find(r => r.id === savedPosition.roomId);
			if (savedPosition.roomId && !savedRoom) {
				console.warn('[GAME] Saved room not found:', savedPosition.roomId, '- placing player at origin');
				// Place player at origin if saved room doesn't exist
				this.setPlayerPosition(0, 0, undefined);
			} else {
				this.setPlayerPosition(
					savedPosition.x,
					savedPosition.y,
					savedPosition.roomId,
				);
			}
		}

		// Restore door states (only for doors that still exist)
		if (gameData.doorStates && gameData.doorStates.length > 0) {
			this.restoreDoorStatesGracefully(gameData.doorStates);
		}

		// Restore fog of war data (now floor-aware via FogLayer)
		if (gameData.fogOfWar && this.fogLayer) {
			// Check if this is the new floor-aware format or old single-floor format
			if (typeof gameData.fogOfWar === 'object' && !Array.isArray(gameData.fogOfWar)) {
				// New format: floor-aware fog data
				this.fogLayer.setAllFogData(gameData.fogOfWar);
				console.log('[GAME] Floor-aware fog of war data restored');
			} else {
				// Old format: single floor fog data - migrate to new format
				const playerPos = this.getPlayerPosition();
				const currentRoom = this.findRoomContainingPoint(playerPos.x, playerPos.y);
				this.fogLayer.initializeFogData(gameData.fogOfWar, {
					x: playerPos.x,
					y: playerPos.y,
					roomId: currentRoom?.id || 'unknown',
				});
				console.log('[GAME] Migrated old fog data to new floor-aware format');
			}

			// Trigger initial fog discovery at current player position after restoration
			const playerPos = this.getPlayerPosition();
			const currentRoom = this.findRoomContainingPoint(playerPos.x, playerPos.y);
			this.fogLayer.updatePlayerPosition({
				x: playerPos.x,
				y: playerPos.y,
				roomId: currentRoom?.id || 'unknown',
			});
			console.log('[GAME] Initial fog discovery triggered after restoration');

			// Force fog render after restoration
			const viewportBounds = this.getViewportBounds();
			this.fogLayer.renderFogOfWar(viewportBounds);
		}

		// Restore other game engine state
		if (gameData.mapZoom !== undefined) {
			this.setMapZoom(gameData.mapZoom);
		}

		if (gameData.currentBackgroundType) {
			this.setBackgroundType(gameData.currentBackgroundType);
		}

		// Restore current floor
		if (gameData.currentFloor !== undefined) {
			this.setCurrentFloor(gameData.currentFloor);
		}

		// Restore NPCs
		if (gameData.npcs && Array.isArray(gameData.npcs) && this.npcLayer) {
			console.log('[GAME] Restoring NPCs:', gameData.npcs.length, 'NPCs');

			// Clear existing NPCs first
			const existingNPCs = this.getNPCs();
			existingNPCs.forEach(npc => this.removeNPC(npc.id));

			// Add saved NPCs
			gameData.npcs.forEach((npc: any) => {
				// Ensure NPCs have the floor property (migration for old saves)
				if (npc.floor === undefined) {
					npc.floor = 0; // Default to floor 0 for old NPCs
					console.log('[GAME] Migrated NPC', npc.name, 'to floor 0 (missing floor property)');
				}
				this.addNPC(npc);
			});

			console.log('[GAME] NPCs restored successfully');
		}

		console.log('[GAME] Game state restoration completed');
	}

	// Graceful door state restoration that skips missing doors
	private restoreDoorStatesGracefully(savedDoorStates: any[]): void {
		console.log('[GAME] Restoring door states gracefully:', savedDoorStates.length, 'saved doors');
		this.doorsLayer?.restoreDoorStates(savedDoorStates);

		// Update internal doors array to stay in sync
		this.doors = this.doorsLayer?.getDoors() || [];
	}

	private setupLegendPopover() {
		this.helpKeyHandler = (e: KeyboardEvent) => {
			if (e.key === '?' || e.key === '/') {
				HelpPopover.toggle();
			}
		};
		window.addEventListener('keydown', this.helpKeyHandler);
	}

	private setupMapZoomControls() {
		this.zoomKeyHandler = (e: KeyboardEvent) => {
			if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') return;
			if ((e.key === '+' || e.key === '=') && !document.getElementById('map-popover')) {
				this.zoomIn();
			} else if (e.key === '-' && !document.getElementById('map-popover')) {
				this.zoomOut();
			}
		};
		window.addEventListener('keydown', this.zoomKeyHandler);
	}

	private renderGalaxyForDestiny() {
		if (this.mapLayer) {
			this.mapLayer.renderGalaxyForDestiny(this.gameData);
			// Add map layer to world if not already added
			if (!this.world.children.includes(this.mapLayer)) {
				this.world.addChild(this.mapLayer);
			}
		}
	}

	private renderGalaxyMap(galaxy: any, focusSystem?: any, shipData?: any) {
		if (this.mapLayer) {
			this.mapLayer.renderGalaxyMap(galaxy, focusSystem, shipData);
			// Add map layer to world if not already added
			if (!this.world.children.includes(this.mapLayer)) {
				this.world.addChild(this.mapLayer);
			}
			// Apply current zoom level to map layer
			this.mapLayer.setMapZoom(this.mapZoom);
		}
	}

	public setMapZoom(zoom: number) {
		this.mapZoom = Math.max(0.2, Math.min(zoom, 8));

		// Update MapLayer zoom if it exists
		if (this.mapLayer) {
			this.mapLayer.setMapZoom(this.mapZoom);
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

			// Create rendering layers
			this.roomsLayer = new RoomsLayer({
				onRoomStateChange: (roomId: string, newState: string) => {
					// Handle room state changes if needed
					console.log('[GAME] Room state changed:', roomId, 'to', newState);
				},
			});
			this.doorsLayer = new DoorsLayer({
				onDoorStateChange: (doorId: string, newState: string) => {
					// Handle door state changes if needed
					console.log('[GAME] Door state changed:', doorId, 'to', newState);
				},
			});
			this.furnitureLayer = new FurnitureLayer({
				onFurnitureStateChange: (furnitureId: string, newState: string) => {
					console.log('[GAME] Furniture state changed:', furnitureId, 'to', newState);
				},
				onElevatorActivation: (elevatorConfig: ElevatorConfig, currentFloor: number) => {
					console.log('[GAME] Elevator activation requested:', elevatorConfig);
					if (this.options.onElevatorActivation) {
						this.options.onElevatorActivation(elevatorConfig, currentFloor);
					}
				},
			});
			this.npcLayer = new NPCLayer({
				onNPCStateChange: (npcId: string, newState: string) => {
					console.log('[GAME] NPC state changed:', npcId, 'to', newState);
				},
				gameInstance: this,
			});

			console.log('[DEBUG] Created rendering layers');

			// Add layers to world in correct order (rooms first, then doors, then furniture, then NPCs, then player)
			this.world.addChild(this.roomsLayer);
			this.world.addChild(this.doorsLayer);
			this.world.addChild(this.furnitureLayer);
			this.world.addChild(this.npcLayer);
			this.world.addChild(this.player); // Add player on top of everything


			console.log('[DEBUG] Added layers to world');

			// Load room data from API - fail if not available
			await this.loadRoomData();

			// Render all rooms
			this.renderRooms();

			// Position player in starting room (Gate Room)
			this.positionPlayerInStartingRoom();

			// Center camera on rooms
			this.centerCameraOnRooms();

			// Apply default zoom after room system is fully initialized
			this.setMapZoom(DEFAULT_ZOOM);

			console.log('[DEBUG] Room system initialized successfully with default zoom:', DEFAULT_ZOOM);

			// Initialize test NPCs for development
			this.initializeTestNPCs();

			// Expose NPC test utilities to console for development
			if (import.meta.env.DEV && this.npcLayer) {
				this.npcLayer.exposeTestUtilities();
			}

			// Expose elevator debug tools
			if (import.meta.env.DEV) {
				debugLogger.exposeTestTools();
				(window as any).elevatorDebug = {
					...((window as any).elevatorDebug || {}),
					logRooms: () => {
						debugLogger.floor('All rooms:', this.rooms.map(r => ({
							id: r.id,
							name: r.name,
							floor: r.floor,
							type: r.type,
						})));
					},
					logDoors: () => {
						debugLogger.door('All doors:', this.doors.map(d => ({
							id: d.id,
							from: d.from_room_id,
							to: d.to_room_id,
							state: d.state,
							position: { x: d.x, y: d.y },
						})));
					},
					logFurniture: () => {
						debugLogger.furniture('All furniture:', this.furniture.map(f => ({
							id: f.id,
							type: f.furniture_type,
							room: f.room_id,
							position: { x: f.x, y: f.y },
						})));
					},
					logNPCs: () => {
						debugLogger.npc('All NPCs:', this.getNPCs().map(n => ({
							id: n.id,
							name: n.name,
							position: { x: n.movement.x, y: n.movement.y },
							room: n.current_room_id,
							floor: n.floor || 0,
						})));
					},
					getCurrentFloor: () => this.currentFloor,
					testElevatorSpawn: (floor: number) => {
						const position = this.findElevatorPosition(floor);
						debugLogger.elevator(`Test spawn on floor ${floor}:`, position);
						return position;
					},
				};
			}

			// Check for pending restoration data now that room system is ready
			if (this.pendingRestoration && !this.isDestroyed) {
				console.log('[GAME] Room system ready - performing pending restoration');
				this.performRestoration(this.pendingRestoration);
				this.pendingRestoration = null;
			}
		} catch (error) {
			console.error('[GAME] Critical error initializing room system:', error);
			// Re-throw with more context
			throw new Error(`Room system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async loadRoomData() {
		console.log('[DEBUG] Loading room data from API...');

		const templateService = new TemplateService();
		const realRooms = await templateService.getRooms();

		console.log('[DEBUG] About to load doors...');
		const realDoors = await templateService.getDoors();
		console.log('[DEBUG] Door loading completed, got:', realDoors.length, 'doors');
		console.log('[DEBUG] First few doors:', realDoors.slice(0, 3).map(d => ({ id: d.id, from: d.from_room_id, to: d.to_room_id })));

		const realFurniture = await templateService.getFurniture();

		console.log(`[DEBUG] Loaded ${realRooms.length} rooms, ${realDoors.length} doors, ${realFurniture.length} furniture from API`);

		// Require real data - fail if API doesn't provide rooms
		if (realRooms.length === 0) {
			throw new Error('No room data available from API - cannot initialize game');
		}

		this.rooms = realRooms;
		this.doors = realDoors;
		this.furniture = realFurniture;

		// Initialize layers with data
		if (this.roomsLayer) {
			this.roomsLayer.setRooms(this.rooms);
		}
		if (this.doorsLayer) {
			this.doorsLayer.setDoors(this.doors);
			this.doorsLayer.setRooms(this.rooms);
		}
		if (this.furnitureLayer) {
			this.furnitureLayer.setRooms(this.rooms);
			// Note: Don't set all furniture here - it will be set per-floor in setCurrentFloor()
		}
		if (this.npcLayer) {
			this.npcLayer.setRooms(this.rooms);
			this.npcLayer.setDoors(this.doors);
		}

		console.log('[DEBUG] Loaded room data from API successfully');
		console.log('[DEBUG] Rooms:', this.rooms.map(r => ({ id: r.id, name: r.name, type: r.type })));

		// Hide starfield since we have rooms
		this.starfield.visible = false;
		if (this.backgroundLayer) {
			this.backgroundLayer.setStarfieldVisible(false);
		}
		// Change background color for room view
		this.app.renderer.background.color = 0x111111;
	}


	private renderRooms() {
		if (!this.roomsLayer) return;

		debugLogger.floor(`Rendering rooms for floor ${this.currentFloor}...`);
		console.log('[DEBUG] Rendering rooms for floor', this.currentFloor, '...');

		// Debug: Log all doors in the system for Floor 1 analysis
		if (this.currentFloor === 1) {
			debugLogger.door(`Total doors in system: ${this.doors.length}`);
			debugLogger.door('All doors:', this.doors.map(d => ({
				id: d.id,
				from: d.from_room_id,
				to: d.to_room_id,
				state: d.state,
				position: { x: d.x, y: d.y },
			})));
		}

		// Filter rooms, doors, furniture, and NPCs by current floor
		const floorRooms = this.rooms.filter(room => room.floor === this.currentFloor);
		const floorDoors = this.doors.filter(door => {
			const fromRoom = this.rooms.find(r => r.id === door.from_room_id);
			const toRoom = this.rooms.find(r => r.id === door.to_room_id);

			// Include doors where at least one room is on the current floor
			// This includes both same-floor doors and inter-floor doors (like elevators/stairs)
			const fromOnCurrentFloor = fromRoom?.floor === this.currentFloor;
			const toOnCurrentFloor = toRoom?.floor === this.currentFloor;

			// Enhanced debugging for door filtering
			if (this.currentFloor === 1) {
				debugLogger.door(`Evaluating door ${door.id}:`, {
					fromRoom: fromRoom ? { id: fromRoom.id, name: fromRoom.name, floor: fromRoom.floor } : 'NOT FOUND',
					toRoom: toRoom ? { id: toRoom.id, name: toRoom.name, floor: toRoom.floor } : 'NOT FOUND',
					fromOnCurrentFloor,
					toOnCurrentFloor,
					included: fromOnCurrentFloor || toOnCurrentFloor,
				});
			}

			return fromOnCurrentFloor || toOnCurrentFloor;
		});
		const floorFurniture = this.furniture.filter(f => {
			const room = this.rooms.find(r => r.id === f.room_id);
			const isOnCurrentFloor = room?.floor === this.currentFloor;

			// Debug furniture filtering for Floor 1
			if (this.currentFloor === 1) {
				console.log(`[DEBUG] Furniture ${f.id} (${f.furniture_type}) in room ${f.room_id}:`, {
					roomFound: !!room,
					roomFloor: room?.floor,
					currentFloor: this.currentFloor,
					included: isOnCurrentFloor
				});
			}

			return isOnCurrentFloor;
		});

		// Debug logging
		debugLogger.floor(`Floor ${this.currentFloor} has:`, {
			rooms: floorRooms.length,
			doors: floorDoors.length,
			furniture: floorFurniture.length,
		});

		debugLogger.door(`Doors on floor ${this.currentFloor}:`,
			floorDoors.map(d => ({
				id: d.id,
				from: d.from_room_id,
				to: d.to_room_id,
				state: d.state,
				position: { x: d.x, y: d.y },
			})),
		);

		debugLogger.furniture(`Furniture on floor ${this.currentFloor}:`,
			floorFurniture.map(f => ({
				id: f.id,
				type: f.furniture_type,
				room: f.room_id,
				position: { x: f.x, y: f.y },
			})),
		);

		console.log('[DEBUG] Floor', this.currentFloor, 'has', floorRooms.length, 'rooms,', floorDoors.length, 'doors,', floorFurniture.length, 'furniture');
		console.log('[DEBUG] Floor doors:', floorDoors.map(d => ({ id: d.id, from: d.from_room_id, to: d.to_room_id, state: d.state })));

		// Clear existing rooms
		this.furnitureLayer?.removeChildren();

		// Update rooms in RoomsLayer with filtered data
		if (this.roomsLayer) {
			this.roomsLayer.setRooms(floorRooms);
		}

		// Update doors in DoorsLayer with filtered data
		if (this.doorsLayer) {
			this.doorsLayer.setRooms(floorRooms);
			this.doorsLayer.setDoors(floorDoors);
		}

		// Update furniture in FurnitureLayer with filtered data
		if (this.furnitureLayer) {
			// FurnitureLayer needs ALL rooms to determine available floors for elevators
			this.furnitureLayer.setRooms(this.rooms);

			// Debug furniture filtering
			console.log(`[DEBUG] Setting ${floorFurniture.length} furniture items for floor ${this.currentFloor}:`);
			console.log('[DEBUG] Floor furniture:', floorFurniture.map(f => ({
				id: f.id,
				type: f.furniture_type,
				room: f.room_id,
				position: `(${f.x}, ${f.y})`
			})));

			this.furnitureLayer.setFurniture(floorFurniture);
		}

		// Update NPCs in NPCLayer with filtered data (NPCs should stay on their original floors)
		if (this.npcLayer) {
			const allNPCs = this.npcLayer.getNPCs();
			debugLogger.npc(`Updating NPC layer for floor ${this.currentFloor}. Total NPCs: ${allNPCs.length}`);
			debugLogger.npc('All NPCs:', allNPCs.map(n => ({
				id: n.id,
				name: n.name,
				position: { x: n.movement.x, y: n.movement.y },
				room: n.current_room_id,
				floor: n.floor || 0, // Now using the floor property
			})));

			// Filter NPCs to only show those on the current floor
			const floorNPCs = allNPCs.filter(npc => (npc.floor || 0) === this.currentFloor);
			debugLogger.npc(`NPCs on floor ${this.currentFloor}: ${floorNPCs.length}`,
				floorNPCs.map(n => ({ id: n.id, name: n.name, floor: n.floor || 0 })),
			);

			this.npcLayer.setRooms(floorRooms);
			this.npcLayer.setDoors(floorDoors);
			this.npcLayer.setVisibleFloor(this.currentFloor);
		}

		console.log('[DEBUG] Room rendering complete for floor', this.currentFloor);
	}




	private positionPlayerInStartingRoom() {
		// Position player at world origin (0, 0)
		this.player.x = 0;
		this.player.y = 0;

		console.log('[DEBUG] Player positioned at origin (0, 0)');

		// Trigger initial fog discovery at starting position
		if (this.fogLayer) {
			const currentRoom = this.findRoomContainingPoint(this.player.x, this.player.y);
			this.fogLayer.updatePlayerPosition({
				x: this.player.x,
				y: this.player.y,
				roomId: currentRoom?.id || 'unknown',
			});
			console.log('[DEBUG] Initial fog discovery triggered at starting position');
		}
	}

	private centerCameraOnRooms() {
		// Get rooms on current floor
		const currentFloorRooms = this.rooms.filter(room => room.floor === this.currentFloor);
		if (currentFloorRooms.length === 0) return;

		// Calculate center point of rooms on current floor
		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		currentFloorRooms.forEach(room => {
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

		console.log(`[DEBUG] Camera centered on floor ${this.currentFloor} rooms at (${centerX}, ${centerY})`);
	}

	public focusOnSystem(systemId: string) {
		if (this.mapLayer) {
			const success = this.mapLayer.focusOnSystem(systemId, this.gameData.galaxies || []);
			if (success) {
				this.focusSystem = this.mapLayer.getFocusSystem();
				this.focusPlanet = null;
				// Add map layer to world if not already added
				if (!this.world.children.includes(this.mapLayer)) {
					this.world.addChild(this.mapLayer);
				}
			}
		}
	}

	public focusOnPlanet(planetId: string) {
		if (this.mapLayer) {
			const success = this.mapLayer.focusOnPlanet(planetId, this.gameData.galaxies || []);
			if (success) {
				this.focusSystem = this.mapLayer.getFocusSystem();
				this.focusPlanet = this.mapLayer.getFocusPlanet();
				// Add map layer to world if not already added
				if (!this.world.children.includes(this.mapLayer)) {
					this.world.addChild(this.mapLayer);
				}
			}
		}
	}

	/**
	 * Find a safe position within the current room for the player
	 * @param originalX Current player X position
	 * @param originalY Current player Y position
	 * @returns Safe position coordinates or null if none found
	 */
	private findSafePositionInRoom(originalX: number, originalY: number): { x: number; y: number } | null {
		const playerRadius = PLAYER_RADIUS;
		const wallThreshold = 15; // Larger threshold for safety

		// Get candidate safe positions from RoomsLayer
		const candidatePositions = this.roomsLayer?.findSafePositionInRoom(originalX, originalY, playerRadius, wallThreshold) || [];
		if (candidatePositions.length === 0) return null;

		// Test each candidate position with collision detection
		for (const candidatePosition of candidatePositions) {
			const validatedPosition = this.checkCollision(originalX, originalY, candidatePosition.x, candidatePosition.y);

			// If the validated position matches the candidate, it's safe
			if (Math.abs(validatedPosition.x - candidatePosition.x) < 0.1 &&
				Math.abs(validatedPosition.y - candidatePosition.y) < 0.1) {

				console.log('[DOOR] Found safe position:', candidatePosition.x.toFixed(1), candidatePosition.y.toFixed(1));
				return { x: candidatePosition.x, y: candidatePosition.y };
			}
		}

		console.log('[DOOR] No safe position found in room');
		return null;
	}

	private getViewportBounds(): { left: number; right: number; top: number; bottom: number } {
		const screenWidth = this.app.screen.width;
		const screenHeight = this.app.screen.height;
		const worldScale = this.world.scale.x;

		// Convert screen coordinates to world coordinates
		const left = (-this.world.x) / worldScale;
		const right = (screenWidth - this.world.x) / worldScale;
		const top = (-this.world.y) / worldScale;
		const bottom = (screenHeight - this.world.y) / worldScale;

		return { left, right, top, bottom };
	}

	/**
	 * Get all fog of war data for all floors
	 */
	public getAllFogData(): any {
		return this.fogLayer?.getAllFogData() || {};
	}
}
