import type { RoomFurniture, DoorTemplate } from '@stargate/common';

import type { Position } from './game-types';

// Input callback types
export interface InputCallbacks {
	onDoorActivation?: (doorId: string) => void;
	onFurnitureActivation?: (furnitureId: string) => void;
	onMenuToggle?: () => void;
	onInventoryToggle?: () => void;
	onMapToggle?: () => void;
	onHelpToggle?: () => void;
	onSave?: () => void;
	onLoad?: () => void;
}

// Gamepad types (imported from existing game-controller types)
export type GamepadButton =
	| 'A' | 'B' | 'X' | 'Y'
	| 'LB' | 'RB' | 'LT' | 'RT'
	| 'BACK' | 'START'
	| 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT'
	| 'LEFT_STICK' | 'RIGHT_STICK';

export type GamepadAxis =
	| 'LEFT_X' | 'LEFT_Y'
	| 'RIGHT_X' | 'RIGHT_Y'
	| 'LT' | 'RT';

// Input options interface
export interface InputOptions {
	speed?: number;
	keybindings?: KeyBindings;
	gamepadBindings?: GamepadBindings;
	// Controller subscription methods
	onButtonPress?: (button: GamepadButton, callback: () => void) => () => void;
	onButtonRelease?: (button: GamepadButton, callback: () => void) => () => void;
	onAxisChange?: (axis: GamepadAxis, callback: (value: number) => void) => () => void;
	getAxisValue?: (axis: GamepadAxis) => number;
	isPressed?: (button: GamepadButton) => boolean;
}

// Key bindings types
export interface KeyBindings {
	moveUp: string[];
	moveDown: string[];
	moveLeft: string[];
	moveRight: string[];
	run: string[];
	interact: string[];
	menu: string[];
	inventory: string[];
	map: string[];
	help: string[];
	zoomIn: string[];
	zoomOut: string[];
	resetZoom: string[];
	save: string[];
	load: string[];
}

export interface GamepadBindings {
	moveUpDown: GamepadAxis;
	moveLeftRight: GamepadAxis;
	run: GamepadButton;
	interact: GamepadButton;
	menu: GamepadButton;
	inventory: GamepadButton;
	zoomUpDown: GamepadAxis;
}

// Movement input types
export interface MovementInput {
	dx: number;
	dy: number;
	isRunning: boolean;
}

export interface InputState {
	keys: Record<string, boolean>;
	gamepadAxes: Record<GamepadAxis, number>;
	gamepadButtons: Record<GamepadButton, boolean>;
	movement: MovementInput;
	lastInteractionTime: number;
}

// Interaction types
export interface Interactable {
	id: string;
	type: 'door' | 'furniture' | 'npc' | 'item';
	position: Position;
	interactionRadius: number;
	canInteract: boolean;
	requiresProximity: boolean;
}

export interface DoorInteractable extends Interactable {
	type: 'door';
	door: DoorTemplate;
	state: 'opened' | 'closed' | 'locked';
}

export interface FurnitureInteractable extends Interactable {
	type: 'furniture';
	furniture: RoomFurniture;
	interactive: boolean;
	active?: boolean;
}

// Input handler interface
export interface InputHandler {
	initialize(): void;
	destroy(): void;
	getMovementInput(): MovementInput;
	handleKeyDown(event: KeyboardEvent): void;
	handleKeyUp(event: KeyboardEvent): void;
	handleGamepadInput(): void;
	isKeyPressed(key: string): boolean;
	isButtonPressed(button: GamepadButton): boolean;
	getAxisValue(axis: GamepadAxis): number;
	setCallbacks(callbacks: InputCallbacks): void;
}

// Interaction manager interface
export interface InteractionManager {
	initialize(): void;
	destroy(): void;
	handleInteraction(position: Position): boolean;
	findNearestInteractable(position: Position, radius: number): Interactable | null;
	activateDoor(doorId: string): boolean;
	activateFurniture(furnitureId: string): boolean;
	setDoors(doors: DoorTemplate[]): void;
	setFurniture(furniture: RoomFurniture[]): void;
}

// Controller cleanup types
export type ControllerUnsubscriber = () => void;

export interface ControllerSubscriptions {
	movement: ControllerUnsubscriber[];
	buttons: ControllerUnsubscriber[];
	axes: ControllerUnsubscriber[];
}

// Input constants
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
	moveUp: ['w', 'arrowup'],
	moveDown: ['s', 'arrowdown'],
	moveLeft: ['a', 'arrowleft'],
	moveRight: ['d', 'arrowright'],
	run: ['shift'],
	interact: ['e', 'enter', ' '],
	menu: ['escape'],
	inventory: ['i', 'tab'],
	map: ['m'],
	help: ['?', '/'],
	zoomIn: ['+', '='],
	zoomOut: ['-'],
	resetZoom: ['0'],
	save: ['ctrl+s'],
	load: ['ctrl+o'],
};

export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
	moveUpDown: 'LEFT_Y',
	moveLeftRight: 'LEFT_X',
	run: 'RT',
	interact: 'A',
	menu: 'BACK',
	inventory: 'START',
	zoomUpDown: 'RIGHT_Y',
};

export const INPUT_CONFIG = {
	INTERACTION_RADIUS: 25,
	MOVEMENT_DEADZONE: 0.15,
	ZOOM_DEADZONE: 0.12,
	DOUBLE_TAP_THRESHOLD: 300,
	HOLD_THRESHOLD: 500,
} as const;
