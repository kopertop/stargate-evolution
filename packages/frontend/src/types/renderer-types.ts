import type { RoomTemplate, DoorTemplate, RoomFurniture } from '@stargate/common';
import * as PIXI from 'pixi.js';


import type { Position, ViewportBounds } from './game-types';

// Layer management types
export interface LayerDefinition {
	name: string;
	zIndex: number;
	container: PIXI.Container;
	visible: boolean;
}

export interface LayerManager {
	createLayer(name: string, zIndex?: number): PIXI.Container;
	getLayer(name: string): PIXI.Container | null;
	removeLayer(name: string): void;
	setLayerOrder(layers: string[]): void;
	setLayerVisibility(name: string, visible: boolean): void;
	getAllLayers(): LayerDefinition[];
}

// Rendering interfaces
export interface Renderer {
	render(): void;
	clear(): void;
	destroy(): void;
}

export interface RoomRenderer extends Renderer {
	setRooms(rooms: RoomTemplate[]): void;
	renderRoom(room: RoomTemplate): void;
	getRooms(): RoomTemplate[];
}

export interface DoorRenderer extends Renderer {
	setDoors(doors: DoorTemplate[]): void;
	renderDoor(door: DoorTemplate): void;
	getDoors(): DoorTemplate[];
}

export interface FurnitureRenderer extends Renderer {
	setFurniture(furniture: RoomFurniture[]): void;
	renderFurniture(furniture: RoomFurniture): Promise<void>;
	getFurniture(): RoomFurniture[];
	activateFurniture(furnitureId: string): boolean;
}

export interface BackgroundRenderer extends Renderer {
	setBackgroundType(type: 'stars' | 'ftl'): void;
	getBackgroundType(): 'stars' | 'ftl';
	animateBackground(): void;
}

// Texture and graphics types
export interface TextureCache {
	get(key: string): PIXI.Texture | undefined;
	set(key: string, texture: PIXI.Texture): void;
	clear(): void;
	has(key: string): boolean;
}

export interface GraphicsPool<T extends PIXI.Graphics> {
	get(): T;
	return(item: T): void;
	clear(): void;
	size: number;
}

// Room rendering configuration
export interface RoomRenderConfig {
	floorColor: number;
	wallColor: number;
	wallThickness: number;
	labelColor: number;
	labelFontSize: number;
	labelOffset: number;
}

// Door rendering configuration
export interface DoorRenderConfig {
	colors: {
		opened: number;
		closed: number;
		locked: number;
	};
	borderColor: number;
	borderWidth: number;
}

// Furniture rendering configuration
export interface FurnitureRenderConfig {
	fallbackColor: number;
	borderColor: number;
	borderWidth: number;
	enableTextureCache: boolean;
}

// Background rendering configuration
export interface StarfieldConfig {
	starCount: number;
	starColor: number;
	starRadius: number;
	bounds: {
		width: number;
		height: number;
	};
}

export interface FTLStreakConfig {
	streakCount: number;
	baseSpeed: number;
	speedVariation: number;
	lengthMin: number;
	lengthMax: number;
	colors: {
		primary: number;
		secondary: number;
	};
	opacity: {
		min: number;
		max: number;
	};
}

// Rendering context
export interface RenderContext {
	app: PIXI.Application;
	world: PIXI.Container;
	viewport: ViewportBounds;
	deltaTime: number;
	frameCount: number;
}

// Galaxy rendering types
export interface GalaxyRenderConfig {
	starColors: Record<string, number>;
	systemRadius: number;
	labelOffset: number;
	labelStyle: Partial<PIXI.TextStyle>;
	scale: number;
}

export interface SystemPosition extends Position {
	id: string;
	name: string;
	type: string;
}

// Layer names constants
export const LAYER_NAMES = {
	BACKGROUND: 'background',
	ROOMS: 'rooms',
	DOORS: 'doors',
	FURNITURE: 'furniture',
	NPCS: 'npcs',
	PLAYER: 'player',
	FOG_OF_WAR: 'fog-of-war',
	GALAXY: 'galaxy',
	UI: 'ui',
} as const;

export type LayerName = typeof LAYER_NAMES[keyof typeof LAYER_NAMES];

// Default rendering configurations
export const DEFAULT_ROOM_RENDER_CONFIG: RoomRenderConfig = {
	floorColor: 0x333355,
	wallColor: 0x88AAFF,
	wallThickness: 8,
	labelColor: 0xFFFF00,
	labelFontSize: 18,
	labelOffset: 30,
};

export const DEFAULT_DOOR_RENDER_CONFIG: DoorRenderConfig = {
	colors: {
		opened: 0x00FF00,
		closed: 0xFF0000,
		locked: 0x800000,
	},
	borderColor: 0xFFFFFF,
	borderWidth: 2,
};

export const DEFAULT_FURNITURE_RENDER_CONFIG: FurnitureRenderConfig = {
	fallbackColor: 0x00FF88,
	borderColor: 0xFFFFFF,
	borderWidth: 2,
	enableTextureCache: true,
};

export const DEFAULT_STARFIELD_CONFIG: StarfieldConfig = {
	starCount: 200,
	starColor: 0xFFFFFF,
	starRadius: 1.5,
	bounds: {
		width: 4000,
		height: 4000,
	},
};

export const DEFAULT_FTL_STREAK_CONFIG: FTLStreakConfig = {
	streakCount: 100,
	baseSpeed: 8,
	speedVariation: 3,
	lengthMin: 200,
	lengthMax: 600,
	colors: {
		primary: 0x0066FF,
		secondary: 0x66AAFF,
	},
	opacity: {
		min: 0.6,
		max: 1.0,
	},
};

export const DEFAULT_GALAXY_RENDER_CONFIG: GalaxyRenderConfig = {
	starColors: {
		'yellow dwarf': 0xFFE066,
		'red giant': 0xFF6666,
		'white dwarf': 0xE0E0FF,
		'neutron star': 0xCCCCFF,
		'black hole': 0x222233,
		'multi': 0x66FFCC,
		'unknown': 0x888888,
	},
	systemRadius: 18,
	labelOffset: 22,
	labelStyle: {
		fill: '#fff',
		fontSize: 14,
		fontWeight: 'bold',
		align: 'center',
	},
	scale: 2,
};
