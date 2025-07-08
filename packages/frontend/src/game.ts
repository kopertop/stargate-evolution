import type {
	RoomTemplate,
	DoorTemplate,
	RoomFurniture,
	NPC,
} from '@stargate/common';
import * as PIXI from 'pixi.js';

import { BackgroundLayer } from './components/background-layer';
import { DoorsLayer } from './components/doors-layer';
import { FurnitureLayer } from './components/furniture-layer';
import { NPCLayer } from './components/npc-layer';
import { RoomsLayer } from './components/rooms-layer';
import { HelpPopover } from './help-popover';
import { FogOfWarManager } from './services/fog-of-war-manager';
import type { GamepadAxis, GamepadButton } from './services/game-controller';
import { SavedGameService } from './services/saved-game-service';
import { TemplateService } from './services/template-service';
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

	// NPC system

	// Pending restoration data (stored until room system is ready)
	private pendingRestoration: any = null;
	private isDestroyed = false;

	// Fog of War manager
	private fogOfWarManager: FogOfWarManager | null = null;
	private fogLayer: PIXI.Container | null = null;
	// Fog tile object pool for performance
	private fogTilePool: PIXI.Graphics[] = [];
	private activeFogTiles: PIXI.Graphics[] = [];
	private lastViewportBounds: { left: number; right: number; top: number; bottom: number } | null = null;


	// Touch control properties
	private touchControlManager: TouchControlManager | null = null;
	private touchMovement: { x: number; y: number } = { x: 0, y: 0 };
	private isTouchRunning: boolean = false;

	constructor(app: PIXI.Application, options: GameOptions = {}, gameData?: any) {
		this.app = app;
		this.options = options;
		this.world = new PIXI.Container();
		this.gameData = gameData;
		
		// Create background layer system
		this.backgroundLayer = new BackgroundLayer({
			onBackgroundTypeChange: (newType: 'stars' | 'ftl') => {
				console.log('[GAME] Background type changed to:', newType);
			}
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
		window.addEventListener('resize', () => this.resizeToWindow());
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
		this.fogOfWarManager = new FogOfWarManager();

		// Initialize fog layer
		this.fogLayer = new PIXI.Container();
		this.world.addChild(this.fogLayer);

		// Setup touch controls for mobile
		this.setupTouchControls();
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
		window.addEventListener('keydown', (e) => {
			this.keys[e.key.toLowerCase()] = true;
			if (e.key.toLowerCase() === 'e' || e.key === 'Enter' || e.key === ' ') {
				this.handleDoorActivation();
				this.handleFurnitureActivation();
			}
		});
		window.addEventListener('keyup', (e) => {
			this.keys[e.key.toLowerCase()] = false;
		});
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
		this.handleFurnitureActivation();
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
				this.handleFurnitureActivation();
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

		// Update Fog of War manager
		if (this.fogOfWarManager) {
			const currentRoom = this.findRoomContainingPoint(this.player.x, this.player.y);
			const hasNewDiscoveries = this.fogOfWarManager.updatePlayerPosition({
				x: this.player.x,
				y: this.player.y,
				roomId: currentRoom?.id || 'unknown',
			});
			// Only re-render fog layer when player discovers new tiles
			if (hasNewDiscoveries) {
				this.renderFogOfWar();
			}
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
		return this.furnitureLayer?.findCollidingFurniture(x, y, playerRadius) || null;
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

	public activateDoor(doorId: string, isNPC: boolean = false): boolean {
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
		this.isDestroyed = true;

		// Clean up controller subscriptions
		this.controllerUnsubscribers.forEach(unsubscribe => unsubscribe());
		this.controllerUnsubscribers = [];

		// Clean up touch controls
		if (this.touchControlManager) {
			this.touchControlManager.destroy();
			this.touchControlManager = null;
		}

		// Clean up fog resources
		this.destroyFogResources();

		if (this.app.ticker) {
			this.app.ticker.stop();
		}
		this.app.destroy();
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
			} else {
				console.warn('[GAME] Room not found for roomId:', roomId);
			}
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

		return {
			playerPosition: {
				x: playerPosition.x,
				y: playerPosition.y,
				roomId: currentRoomId,
			},
			doorStates,
			fogOfWar: this.fogOfWarManager?.getFogData() || {},
			// Add other game state as needed
			mapZoom: this.mapZoom,
			currentBackgroundType: this.backgroundLayer?.getCurrentBackgroundType() || 'stars',
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

		// Restore fog of war data
		if (gameData.fogOfWar && this.fogOfWarManager) {
			const playerPos = this.getPlayerPosition();
			const currentRoom = this.findRoomContainingPoint(playerPos.x, playerPos.y);
			this.fogOfWarManager.initialize(gameData.fogOfWar, {
				x: playerPos.x,
				y: playerPos.y,
				roomId: currentRoom?.id || 'unknown',
			});
			console.log('[GAME] Fog of war data restored');
		}

		// Restore other game engine state
		if (gameData.mapZoom !== undefined) {
			this.setMapZoom(gameData.mapZoom);
		}

		if (gameData.currentBackgroundType) {
			this.setBackgroundType(gameData.currentBackgroundType);
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
			});
			this.npcLayer = new NPCLayer({
				onNPCStateChange: (npcId: string, newState: string) => {
					console.log('[GAME] NPC state changed:', npcId, 'to', newState);
				},
				gameInstance: this
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
		const realDoors = await templateService.getDoors();
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
			this.furnitureLayer.setFurniture(this.furniture);
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

		console.log('[DEBUG] Rendering rooms...');

		// Clear existing rooms
		this.furnitureLayer?.removeChildren();

		// Update rooms in RoomsLayer
		if (this.roomsLayer) {
			this.roomsLayer.setRooms(this.rooms);
		}

		// Update doors in DoorsLayer
		if (this.doorsLayer) {
			this.doorsLayer.setDoors(this.doors);
		}

		// Update furniture in FurnitureLayer
		if (this.furnitureLayer) {
			this.furnitureLayer.setRooms(this.rooms);
			this.furnitureLayer.setFurniture(this.furniture);
		}

		console.log('[DEBUG] Room rendering complete');
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

	// Fog of War methods
	public getFogOfWarManager(): FogOfWarManager | null {
		return this.fogOfWarManager;
	}

	public isTileDiscovered(worldX: number, worldY: number): boolean {
		return this.fogOfWarManager?.isTileDiscovered(worldX, worldY) || false;
	}

	public forceDiscoverArea(centerX: number, centerY: number, radius: number): void {
		this.fogOfWarManager?.forceDiscoverArea(centerX, centerY, radius);
	}

	public clearFogOfWar(): void {
		this.fogOfWarManager?.clearFog();
	}

	private renderFogOfWar(): void {
		if (!this.fogLayer || !this.fogOfWarManager) return;

		// Get the current viewport bounds to determine what tiles to render
		const viewportBounds = this.getViewportBounds();
		const config = this.fogOfWarManager.getConfig();

		// Check if viewport has changed significantly to avoid unnecessary work
		if (this.lastViewportBounds &&
			Math.abs(viewportBounds.left - this.lastViewportBounds.left) < config.tileSize &&
			Math.abs(viewportBounds.right - this.lastViewportBounds.right) < config.tileSize &&
			Math.abs(viewportBounds.top - this.lastViewportBounds.top) < config.tileSize &&
			Math.abs(viewportBounds.bottom - this.lastViewportBounds.bottom) < config.tileSize) {
			return; // Viewport hasn't changed enough to warrant re-rendering
		}

		this.lastViewportBounds = { ...viewportBounds };

		// Return all active fog tiles to the pool
		this.returnFogTilesToPool();

		// Calculate tile bounds to render
		const startTileX = Math.floor(viewportBounds.left / config.tileSize);
		const endTileX = Math.ceil(viewportBounds.right / config.tileSize);
		const startTileY = Math.floor(viewportBounds.top / config.tileSize);
		const endTileY = Math.ceil(viewportBounds.bottom / config.tileSize);

		// Render fog tiles
		for (let tileX = startTileX; tileX <= endTileX; tileX++) {
			for (let tileY = startTileY; tileY <= endTileY; tileY++) {
				const worldX = tileX * config.tileSize;
				const worldY = tileY * config.tileSize;

				// Check if this tile is discovered
				const isDiscovered = this.fogOfWarManager.isTileDiscovered(worldX, worldY);

				if (!isDiscovered) {
					// Get or create fog tile from pool
					const fogTile = this.getFogTileFromPool();
					fogTile.x = worldX;
					fogTile.y = worldY;
					fogTile.visible = true;

					this.fogLayer.addChild(fogTile);
					this.activeFogTiles.push(fogTile);
				}
			}
		}
	}

	/**
	 * Get a fog tile from the pool or create a new one
	 */
	private getFogTileFromPool(): PIXI.Graphics {
		if (this.fogTilePool.length > 0) {
			return this.fogTilePool.pop()!;
		}

		// Create new fog tile
		const fogTile = new PIXI.Graphics();
		const config = this.fogOfWarManager?.getConfig();
		if (config) {
			fogTile.rect(0, 0, config.tileSize, config.tileSize)
				.fill({ color: 0x000000, alpha: 0.7 }); // Semi-transparent black
		}
		return fogTile;
	}

	/**
	 * Return all active fog tiles to the pool
	 */
	private returnFogTilesToPool(): void {
		// Remove from display and return to pool
		for (const fogTile of this.activeFogTiles) {
			if (fogTile.parent) {
				fogTile.parent.removeChild(fogTile);
			}
			fogTile.visible = false;
			this.fogTilePool.push(fogTile);
		}
		this.activeFogTiles = [];
	}

	/**
	 * Clean up fog resources
	 */
	private destroyFogResources(): void {
		this.returnFogTilesToPool();

		// Destroy all pooled fog tiles
		for (const fogTile of this.fogTilePool) {
			fogTile.destroy();
		}
		this.fogTilePool = [];

		// Clear viewport tracking
		this.lastViewportBounds = null;
	}

	private getViewportBounds(): { left: number; right: number; top: number; bottom: number } {
		// Calculate world coordinates of the viewport
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

	private handleFurnitureActivation(): void {
		return this.furnitureLayer?.handleFurnitureActivation(this.player.x, this.player.y);
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
}
