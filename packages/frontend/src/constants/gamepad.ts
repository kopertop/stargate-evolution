// Gamepad button mapping (standard gamepad layout)
export const GAMEPAD_BUTTONS = {
	A: 1,          // Right face button
	B: 0,          // Bottom face button
	Y: 2,          // Left face button
	X: 3,          // Top face button
	LB: 4,         // Left bumper
	RB: 5,         // Right bumper (R trigger)
	LT: 6,         // Left trigger
	RT: 7,         // Right trigger (ZR)
	BACK: 8,       // Back/Select button
	START: 9,      // Start/Menu button
	L_STICK: 10,   // Left stick button
	R_STICK: 11,   // Right stick button
	DPAD_UP: 12,   // D-pad up
	DPAD_DOWN: 13, // D-pad down
	DPAD_LEFT: 14, // D-pad left
	DPAD_RIGHT: 15, // D-pad right
} as const;

// Human-readable button names for UI display
export const GAMEPAD_BUTTON_NAMES = {
	[GAMEPAD_BUTTONS.A]: 'A',
	[GAMEPAD_BUTTONS.B]: 'B',
	[GAMEPAD_BUTTONS.X]: 'X',
	[GAMEPAD_BUTTONS.Y]: 'Y',
	[GAMEPAD_BUTTONS.LB]: 'LB',
	[GAMEPAD_BUTTONS.RB]: 'RB (R)',
	[GAMEPAD_BUTTONS.LT]: 'LT',
	[GAMEPAD_BUTTONS.RT]: 'RT (ZR)',
	[GAMEPAD_BUTTONS.BACK]: 'Back/Select',
	[GAMEPAD_BUTTONS.START]: 'Start/Menu',
	[GAMEPAD_BUTTONS.L_STICK]: 'Left Stick',
	[GAMEPAD_BUTTONS.R_STICK]: 'Right Stick',
	[GAMEPAD_BUTTONS.DPAD_UP]: 'D-pad Up',
	[GAMEPAD_BUTTONS.DPAD_DOWN]: 'D-pad Down',
	[GAMEPAD_BUTTONS.DPAD_LEFT]: 'D-pad Left',
	[GAMEPAD_BUTTONS.DPAD_RIGHT]: 'D-pad Right',
} as const;

// Control scheme documentation for settings menu
export const CONTROL_SCHEME = {
	movement: {
		keyboard: ['WASD', 'Arrow Keys'],
		gamepad: ['Left Stick', 'D-pad'],
	},
	running: {
		keyboard: ['Shift'],
		gamepad: ['RB (R)'],
	},
	zoom: {
		keyboard: ['+/-'],
		gamepad: ['Right Stick Y-axis'],
	},
	pause: {
		keyboard: ['ESC'],
		gamepad: ['Back/Select'],
	},
	inventory: {
		keyboard: ['I', 'Tab'],
		gamepad: ['Start button'],
	},
	menuNavigation: {
		keyboard: ['WASD', 'Arrow Keys'],
		gamepad: ['D-pad'],
	},
	menuActivate: {
		keyboard: ['Enter'],
		gamepad: ['A'],
	},
	menuBack: {
		keyboard: ['ESC'],
		gamepad: ['B'],
	},
} as const;