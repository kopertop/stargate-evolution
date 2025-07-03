import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

import { GAMEPAD_BUTTONS, GAMEPAD_BUTTON_NAMES } from '../constants/gamepad';

// Types
export type GamepadButton = keyof typeof GAMEPAD_BUTTONS;
export type GamepadAxis = 'LEFT_X' | 'LEFT_Y' | 'RIGHT_X' | 'RIGHT_Y';

export interface GamepadButtonState {
	pressed: boolean;
	justPressed: boolean;
	justReleased: boolean;
	holdTime: number;
}

export interface GamepadAxesState {
	LEFT_X: number;
	LEFT_Y: number;
	RIGHT_X: number;
	RIGHT_Y: number;
}

export interface GamepadState {
	connected: boolean;
	id: string;
	index: number;
	buttons: Record<GamepadButton, GamepadButtonState>;
	axes: GamepadAxesState;
}

// Event callback types
type ButtonCallback = (button: GamepadButton) => void;
type AxisCallback = (axis: GamepadAxis, value: number) => void;

// Internal state management
class GameControllerManager {
	private gamepadState: GamepadState;
	private lastButtonStates: Record<number, boolean> = {};
	private lastAxesStates: Record<number, number> = {};
	private animationFrameId: number | null = null;
	private subscribers: {
		buttonPress: Set<ButtonCallback>;
		buttonRelease: Set<ButtonCallback>;
		buttonHold: Set<ButtonCallback>;
		axisChange: Set<AxisCallback>;
	} = {
			buttonPress: new Set(),
			buttonRelease: new Set(),
			buttonHold: new Set(),
			axisChange: new Set(),
		};

	constructor() {
		this.gamepadState = this.createInitialState();
		this.startPolling();
		this.setupEventListeners();
	}

	private createInitialState(): GamepadState {
		const buttons: Record<GamepadButton, GamepadButtonState> = {} as Record<GamepadButton, GamepadButtonState>;

		// Initialize all button states
		Object.keys(GAMEPAD_BUTTONS).forEach(buttonName => {
			buttons[buttonName as GamepadButton] = {
				pressed: false,
				justPressed: false,
				justReleased: false,
				holdTime: 0,
			};
		});

		return {
			connected: false,
			id: '',
			index: -1,
			buttons,
			axes: {
				LEFT_X: 0,
				LEFT_Y: 0,
				RIGHT_X: 0,
				RIGHT_Y: 0,
			},
		};
	}

	private setupEventListeners() {
		window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
			console.log('[GAME-CONTROLLER] Gamepad connected:', e.gamepad.id, 'at index', e.gamepad.index);
			if (!this.gamepadState.connected) {
				this.gamepadState.connected = true;
				this.gamepadState.id = e.gamepad.id;
				this.gamepadState.index = e.gamepad.index;
			}
		});

		window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
			console.log('[GAME-CONTROLLER] Gamepad disconnected:', e.gamepad.id);
			if (this.gamepadState.index === e.gamepad.index) {
				this.gamepadState.connected = false;
				this.gamepadState.id = '';
				this.gamepadState.index = -1;
			}
		});
	}

	private startPolling() {
		const poll = () => {
			this.updateGamepadState();
			this.animationFrameId = requestAnimationFrame(poll);
		};
		poll();
	}

	private updateGamepadState() {
		const gamepads = navigator.getGamepads();
		const gamepad = this.gamepadState.connected ? gamepads[this.gamepadState.index] : null;

		if (!gamepad) {
			// Reset state if no gamepad
			if (this.gamepadState.connected) {
				this.gamepadState.connected = false;
				this.resetAllStates();
			}
			return;
		}

		// Update button states
		this.updateButtonStates(gamepad);

		// Update axis states
		this.updateAxisStates(gamepad);
	}

	private updateButtonStates(gamepad: Gamepad) {
		Object.entries(GAMEPAD_BUTTONS).forEach(([buttonName, buttonIndex]) => {
			const button = gamepad.buttons[buttonIndex];
			const buttonKey = buttonName as GamepadButton;
			const currentState = this.gamepadState.buttons[buttonKey];
			const wasPressed = this.lastButtonStates[buttonIndex] || false;
			const isPressed = button?.pressed || false;

			// Update state
			currentState.justPressed = isPressed && !wasPressed;
			currentState.justReleased = !isPressed && wasPressed;
			currentState.pressed = isPressed;

			// Update hold time
			if (isPressed) {
				currentState.holdTime += 16; // Approximate 60fps = 16ms per frame
			} else {
				currentState.holdTime = 0;
			}

			// Emit events
			if (currentState.justPressed) {
				console.log('[GAME-CONTROLLER] Button pressed:', buttonName);
				this.subscribers.buttonPress.forEach(callback => callback(buttonKey));
			}

			if (currentState.justReleased) {
				console.log('[GAME-CONTROLLER] Button released:', buttonName);
				this.subscribers.buttonRelease.forEach(callback => callback(buttonKey));
			}

			if (currentState.pressed && currentState.holdTime > 500) { // 500ms hold threshold
				this.subscribers.buttonHold.forEach(callback => callback(buttonKey));
			}

			// Store last state
			this.lastButtonStates[buttonIndex] = isPressed;
		});
	}

	private updateAxisStates(gamepad: Gamepad) {
		const axisMapping = {
			LEFT_X: 0,
			LEFT_Y: 1,
			RIGHT_X: 2,
			RIGHT_Y: 3,
		};

		Object.entries(axisMapping).forEach(([axisName, axisIndex]) => {
			const axisKey = axisName as GamepadAxis;
			const currentValue = gamepad.axes[axisIndex] || 0;
			const lastValue = this.lastAxesStates[axisIndex] || 0;

			// Apply deadzone
			const deadzone = 0.15;
			const processedValue = Math.abs(currentValue) > deadzone ? currentValue : 0;

			this.gamepadState.axes[axisKey] = processedValue;

			// Emit change events if significant change
			if (Math.abs(processedValue - lastValue) > 0.1) {
				this.subscribers.axisChange.forEach(callback => callback(axisKey, processedValue));
			}

			this.lastAxesStates[axisIndex] = processedValue;
		});
	}

	private resetAllStates() {
		Object.keys(this.gamepadState.buttons).forEach(buttonName => {
			const buttonKey = buttonName as GamepadButton;
			this.gamepadState.buttons[buttonKey] = {
				pressed: false,
				justPressed: false,
				justReleased: false,
				holdTime: 0,
			};
		});

		this.gamepadState.axes = {
			LEFT_X: 0,
			LEFT_Y: 0,
			RIGHT_X: 0,
			RIGHT_Y: 0,
		};

		this.lastButtonStates = {};
		this.lastAxesStates = {};
	}

	// Public API
	public getState(): GamepadState {
		return { ...this.gamepadState };
	}

	public isPressed(button: GamepadButton): boolean {
		return this.gamepadState.buttons[button]?.pressed || false;
	}

	public wasJustPressed(button: GamepadButton): boolean {
		return this.gamepadState.buttons[button]?.justPressed || false;
	}

	public wasJustReleased(button: GamepadButton): boolean {
		return this.gamepadState.buttons[button]?.justReleased || false;
	}

	public getAxisValue(axis: GamepadAxis): number {
		return this.gamepadState.axes[axis] || 0;
	}

	public onButtonPress(callback: ButtonCallback): () => void {
		this.subscribers.buttonPress.add(callback);
		return () => this.subscribers.buttonPress.delete(callback);
	}

	public onButtonRelease(callback: ButtonCallback): () => void {
		this.subscribers.buttonRelease.add(callback);
		return () => this.subscribers.buttonRelease.delete(callback);
	}

	public onButtonHold(callback: ButtonCallback): () => void {
		this.subscribers.buttonHold.add(callback);
		return () => this.subscribers.buttonHold.delete(callback);
	}

	public onAxisChange(callback: AxisCallback): () => void {
		this.subscribers.axisChange.add(callback);
		return () => this.subscribers.axisChange.delete(callback);
	}

	public destroy() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		this.subscribers.buttonPress.clear();
		this.subscribers.buttonRelease.clear();
		this.subscribers.buttonHold.clear();
		this.subscribers.axisChange.clear();
	}
}

// Singleton instance
let gameControllerManager: GameControllerManager | null = null;

// React hook
export const useGameController = () => {
	const [gamepadState, setGamepadState] = useState<GamepadState | null>(null);
	const managedRef = useRef<GameControllerManager | null>(null);

	useEffect(() => {
		// Create singleton instance if it doesn't exist
		if (!gameControllerManager) {
			gameControllerManager = new GameControllerManager();
		}
		managedRef.current = gameControllerManager;

		// Subscribe to state updates
		const updateState = () => {
			setGamepadState(gameControllerManager!.getState());
		};

		// Update state on each frame
		const intervalId = setInterval(updateState, 16); // ~60fps

		// Initial state update
		updateState();

		return () => {
			clearInterval(intervalId);
		};
	}, []);

	// Event subscription helpers
	const onButtonPress = useCallback((button: GamepadButton, callback: () => void) => {
		if (!managedRef.current) return () => {};
		return managedRef.current.onButtonPress((pressedButton) => {
			if (pressedButton === button) callback();
		});
	}, []);

	const onButtonRelease = useCallback((button: GamepadButton, callback: () => void) => {
		if (!managedRef.current) return () => {};
		return managedRef.current.onButtonRelease((releasedButton) => {
			if (releasedButton === button) callback();
		});
	}, []);

	const onButtonHold = useCallback((button: GamepadButton, callback: () => void) => {
		if (!managedRef.current) return () => {};
		return managedRef.current.onButtonHold((heldButton) => {
			if (heldButton === button) callback();
		});
	}, []);

	const onAxisChange = useCallback((axis: GamepadAxis, callback: (value: number) => void) => {
		if (!managedRef.current) return () => {};
		return managedRef.current.onAxisChange((changedAxis, value) => {
			if (changedAxis === axis) callback(value);
		});
	}, []);

	// State query helpers
	const isPressed = useCallback((button: GamepadButton): boolean => {
		return managedRef.current?.isPressed(button) || false;
	}, []);

	const getAxisValue = useCallback((axis: GamepadAxis): number => {
		return managedRef.current?.getAxisValue(axis) || 0;
	}, []);

	// Memoize the returned object to prevent constant re-renders
	// Only update when connection status changes, not on every gamepad state update
	const isConnected = gamepadState?.connected || false;
	
	return useMemo(() => ({
		// Current state
		gamepadState,
		isConnected,

		// Event hooks
		onButtonPress,
		onButtonRelease,
		onButtonHold,
		onAxisChange,

		// State queries
		isPressed,
		getAxisValue,
	}), [
		isConnected, // Only re-create when connection status changes
		onButtonPress,
		onButtonRelease,
		onButtonHold,
		onAxisChange,
		isPressed,
		getAxisValue,
		// Note: gamepadState is NOT in dependencies to prevent constant re-renders
	]);
};

// Cleanup function for app unmount
export const destroyGameController = () => {
	if (gameControllerManager) {
		gameControllerManager.destroy();
		gameControllerManager = null;
	}
};
