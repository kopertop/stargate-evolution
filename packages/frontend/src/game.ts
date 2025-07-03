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
	private backgroundLayer: PIXI.Container | null = null;
	private ftlStreaksLayer: PIXI.Container | null = null;
	private currentBackgroundType: 'stars' | 'ftl' = 'stars';
	private ftlStreaks: PIXI.Graphics[] = [];
	private animationFrame: number = 0;

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
		this.initializeRoomSystem().catch((error) => {
			console.error('[GAME] Failed to initialize room system:', error);
			// Show error to user - the game cannot function without room data
			throw new Error(`Game initialization failed: ${error.message}`);
		});
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

	private createFTLStreaks(): PIXI.Container {
		const container = new PIXI.Container();
		this.ftlStreaks = [];

		// Create 100 FTL streak lines
		for (let i = 0; i < 100; i++) {
			const streak = new PIXI.Graphics();
			const x = Math.random() * this.app.screen.width;
			const y = Math.random() * this.app.screen.height;
			const length = 200 + Math.random() * 400; // Variable length streaks

			// Create blue gradient streak
			streak.moveTo(x, y)
				.lineTo(x + length, y)
				.stroke({
					color: 0x0066ff,
					width: 2 + Math.random() * 3,
					alpha: 0.6 + Math.random() * 0.4,
				});

			// Add slight glow effect
			streak.moveTo(x, y)
				.lineTo(x + length, y)
				.stroke({
					color: 0x66aaff,
					width: 1,
					alpha: 0.8,
				});

			container.addChild(streak);
			this.ftlStreaks.push(streak);
		}

		return container;
	}

	private animateFTLStreaks() {
		if (this.currentBackgroundType !== 'ftl' || !this.ftlStreaksLayer) return;

		this.animationFrame++;
		const speed = 8; // Speed of streak movement

		this.ftlStreaks.forEach((streak, index) => {
			// Move streaks horizontally
			streak.x -= speed + (index % 3); // Varying speeds for depth effect

			// Reset streak position when it goes off screen
			if (streak.x < -500) {
				streak.x = this.app.screen.width + Math.random() * 200;
				streak.y = Math.random() * this.app.screen.height;
			}
		});
	}

	public setBackgroundType(type: 'stars' | 'ftl') {
		if (this.currentBackgroundType === type) return;

		this.currentBackgroundType = type;

		if (type === 'ftl') {
			// Hide starfield and show FTL streaks
			this.starfield.visible = false;

			if (!this.ftlStreaksLayer) {
				this.ftlStreaksLayer = this.createFTLStreaks();
				this.world.addChildAt(this.ftlStreaksLayer, 0); // Add at bottom layer
			}
			this.ftlStreaksLayer.visible = true;

			console.log('[GAME] Switched to FTL streak background');
		} else {
			// Show starfield and hide FTL streaks
			this.starfield.visible = true;

			if (this.ftlStreaksLayer) {
				this.ftlStreaksLayer.visible = false;
			}

			console.log('[GAME] Switched to starfield background');
		}
	}

	public updateFTLStatus(ftlStatus: string) {
		const backgroundType = ftlStatus === 'ftl' ? 'ftl' : 'stars';
		this.setBackgroundType(backgroundType);
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

		// Right stick zoom will be handled in update loop for smooth continuous zooming
		const unsubscribeRightY = this.options.onAxisChange('RIGHT_Y', (value) => {
			// No longer handle zoom here - moved to update loop for smoothness
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

		// Animate FTL streaks if in FTL mode
		this.animateFTLStreaks();

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

		console.log('[DEBUG] Loaded room data from API successfully');
		console.log('[DEBUG] Rooms:', this.rooms.map(r => ({ id: r.id, name: r.name, type: r.type })));

		// Hide starfield since we have rooms
		this.starfield.visible = false;
		// Change background color for room view
		this.app.renderer.background.color = 0x111111;
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
