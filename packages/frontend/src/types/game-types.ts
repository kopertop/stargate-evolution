import type { RoomTemplate, DoorTemplate, RoomFurniture, NPC } from '@stargate/common';

// Core position and coordinate types
export interface Position {
	x: number;
	y: number;
}

export interface ViewportBounds {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

// Player-related types
export interface PlayerPosition extends Position {
	roomId: string;
}

export interface PlayerState {
	position: PlayerPosition;
	isRunning: boolean;
	speed: number;
}

// Door state for persistence
export interface DoorState {
	id: string;
	state: 'opened' | 'closed' | 'locked';
	from_room_id: string;
	to_room_id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	is_automatic: boolean;
	open_direction: 'inward' | 'outward' | 'sliding';
	style: string;
	color: string | null | undefined;
	requirements: any;
	power_required: number;
	cleared?: boolean;
	restricted?: boolean;
}

// Game state for persistence
export interface GameState {
	playerPosition: PlayerPosition;
	doorStates: DoorState[];
	fogOfWar: any;
	mapZoom: number;
	currentBackgroundType: 'stars' | 'ftl';
	timeSpeed: number;
	gameTime: {
		elapsed: number;
		paused: boolean;
	};
}

// Room system types
export interface RoomData {
	rooms: RoomTemplate[];
	doors: DoorTemplate[];
	furniture: RoomFurniture[];
}

// Collision detection types
export interface CollisionResult {
	x: number;
	y: number;
	blocked: boolean;
	reason?: string;
	entity?: any; // The entity that caused the collision (door, furniture, etc.)
}

export interface CollisionContext {
	playerRadius: number;
	wallThreshold: number;
	currentRoom: RoomTemplate | null;
	targetRoom: RoomTemplate | null;
}

// Game configuration types
export interface GameConfig {
	playerRadius: number;
	defaultZoom: number;
	shipSpeed: number;
	speedMultiplier: number;
	interactionRadius: number;
	wallThreshold: number;
}

// Layer management types
export interface LayerConfig {
	name: string;
	zIndex: number;
	visible: boolean;
}

// Camera types
export interface CameraTarget {
	x: number;
	y: number;
	follow: boolean;
}

// Background types
export type BackgroundType = 'stars' | 'ftl';

export interface BackgroundConfig {
	starCount: number;
	starColor: number;
	starRadius: number;
	ftlStreakCount: number;
	ftlSpeed: number;
}

// Game initialization data
export interface GameInitData {
	rooms: RoomTemplate[];
	doors: DoorTemplate[];
	furniture: RoomFurniture[];
	npcs: NPC[];
	savedState?: GameState;
}

// Constants
export const DEFAULT_GAME_CONFIG: GameConfig = {
	playerRadius: 5,
	defaultZoom: 2.0,
	shipSpeed: 4,
	speedMultiplier: 5,
	interactionRadius: 25,
	wallThreshold: 8,
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
	starCount: 200,
	starColor: 0xffffff,
	starRadius: 1.5,
	ftlStreakCount: 100,
	ftlSpeed: 8,
};
