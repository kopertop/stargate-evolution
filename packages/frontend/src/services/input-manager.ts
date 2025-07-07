import type {
	InputCallbacks,
	GamepadButton,
	GamepadAxis,
	InputState,
	MovementInput,
} from '../types/input-types';

/**
 * InputManager handles all input from keyboard, mouse, and gamepad,
 * providing a unified interface for game input.
 */
export class InputManager {
	private canvas: HTMLCanvasElement;
	private callbacks: InputCallbacks = {};

	// Input state
	private keys: Set<string> = new Set();
	private mouseButtons: Set<number> = new Set();
	private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
	private gamepadState: Record<string, boolean> = {};
	private gamepadAxes: Record<string, number> = {};

	// Movement tracking
	private movementInput: MovementInput = {
		up: false,
		down: false,
		left: false,
		right: false,
		running: false,
		magnitude: 0,
		angle: 0,
	};

	// Input configuration
	private config = {
		// Keyboard mappings
		keyMappings: {
			// Movement
			moveUp: ['KeyW', 'ArrowUp'],
			moveDown: ['KeyS', 'ArrowDown'],
			moveLeft: ['KeyA', 'ArrowLeft'],
			moveRight: ['KeyD', 'ArrowRight'],
			run: ['ShiftLeft', 'ShiftRight'],

			// Actions
			activate: ['KeyE', 'Space'],
			inventory: ['KeyI'],
			map: ['KeyM'],
			menu: ['Escape'],
			help: ['KeyH'],

			// System
			save: ['KeyF5'],
			load: ['KeyF9'],

			// Camera
			zoomIn: ['Equal', 'NumpadAdd'],
			zoomOut: ['Minus', 'NumpadSubtract'],
			recenter: ['KeyC'],
		},

		// Gamepad mappings
		gamepadMappings: {
			// Movement (analog stick)
			moveLeftStick: 'LEFT_STICK',

			// Actions
			activate: 'A',
			inventory: 'Y',
			map: 'BACK',
			menu: 'START',
			run: 'RB',

			// Camera
			zoomIn: 'RT',
			zoomOut: 'LT',
			recenter: 'RIGHT_STICK',
		},

		// Input sensitivity
		gamepadDeadzone: 0.2,
		gamepadAxisThreshold: 0.1,

		// Mouse settings
		mouseWheelZoomSpeed: 0.1,
		mouseDragThreshold: 5,
	};

	// Event listeners storage for cleanup
	private eventListeners: Array<{
		element: EventTarget;
		event: string;
		listener: EventListener;
	}> = [];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.setupEventListeners();
		console.log('[INPUT-MANAGER] Initialized input manager');
	}

	/**
	 * Set callbacks for input events
	 */
	setCallbacks(callbacks: InputCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
		console.log('[INPUT-MANAGER] Updated input callbacks');
	}

	/**
	 * Update input configuration
	 */
	updateConfig(newConfig: Partial<typeof InputManager.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[INPUT-MANAGER] Updated input configuration');
	}

	/**
	 * Setup event listeners for all input types
	 */
	private setupEventListeners(): void {
		// Keyboard events
		this.addEventListeners(document, 'keydown', this.handleKeyDown.bind(this));
		this.addEventListeners(document, 'keyup', this.handleKeyUp.bind(this));

		// Mouse events
		this.addEventListeners(this.canvas, 'mousedown', this.handleMouseDown.bind(this));
		this.addEventListeners(this.canvas, 'mouseup', this.handleMouseUp.bind(this));
		this.addEventListeners(this.canvas, 'mousemove', this.handleMouseMove.bind(this));
		this.addEventListeners(this.canvas, 'wheel', this.handleMouseWheel.bind(this));

		// Gamepad events (handled via polling in update loop)
		// Note: Gamepad events are not reliable, so we poll in the update method

		console.log('[INPUT-MANAGER] Setup event listeners');
	}

	/**
	 * Add event listener and store for cleanup
	 */
	private addEventListeners(element: EventTarget, event: string, listener: EventListener): void {
		element.addEventListener(event, listener);
		this.eventListeners.push({ element, event, listener });
	}

	/**
	 * Handle keyboard key down
	 */
	private handleKeyDown(event: KeyboardEvent): void {
		const key = event.code;
		this.keys.add(key);

		// Handle specific key actions
		if (this.config.keyMappings.activate.includes(key)) {
			this.callbacks.onActivate?.();
		} else if (this.config.keyMappings.inventory.includes(key)) {
			this.callbacks.onInventoryToggle?.();
		} else if (this.config.keyMappings.map.includes(key)) {
			this.callbacks.onMapToggle?.();
		} else if (this.config.keyMappings.menu.includes(key)) {
			this.callbacks.onMenuToggle?.();
		} else if (this.config.keyMappings.help.includes(key)) {
			this.callbacks.onHelpToggle?.();
		} else if (this.config.keyMappings.save.includes(key)) {
			this.callbacks.onSave?.();
		} else if (this.config.keyMappings.load.includes(key)) {
			this.callbacks.onLoad?.();
		} else if (this.config.keyMappings.zoomIn.includes(key)) {
			this.callbacks.onZoomIn?.();
		} else if (this.config.keyMappings.zoomOut.includes(key)) {
			this.callbacks.onZoomOut?.();
		} else if (this.config.keyMappings.recenter.includes(key)) {
			this.callbacks.onRecenter?.();
		}

		// Update movement state
		this.updateMovementState();

		// Prevent default for game keys
		if (this.isGameKey(key)) {
			event.preventDefault();
		}
	}

	/**
	 * Handle keyboard key up
	 */
	private handleKeyUp(event: KeyboardEvent): void {
		const key = event.code;
		this.keys.delete(key);

		// Update movement state
		this.updateMovementState();

		// Prevent default for game keys
		if (this.isGameKey(key)) {
			event.preventDefault();
		}
	}

	/**
	 * Handle mouse button down
	 */
	private handleMouseDown(event: MouseEvent): void {
		this.mouseButtons.add(event.button);
		this.updateMousePosition(event);

		// Handle mouse actions
		if (event.button === 0) { // Left click
			this.callbacks.onActivate?.();
		} else if (event.button === 1) { // Middle click
			this.callbacks.onRecenter?.();
		} else if (event.button === 2) { // Right click
			this.callbacks.onMenuToggle?.();
		}

		event.preventDefault();
	}

	/**
	 * Handle mouse button up
	 */
	private handleMouseUp(event: MouseEvent): void {
		this.mouseButtons.delete(event.button);
		this.updateMousePosition(event);

		event.preventDefault();
	}

	/**
	 * Handle mouse movement
	 */
	private handleMouseMove(event: MouseEvent): void {
		this.updateMousePosition(event);

		// Handle mouse drag for camera movement
		if (this.mouseButtons.has(1)) { // Middle mouse drag
			this.callbacks.onCameraDrag?.(event.movementX, event.movementY);
		}
	}

	/**
	 * Handle mouse wheel
	 */
	private handleMouseWheel(event: WheelEvent): void {
		const delta = event.deltaY * this.config.mouseWheelZoomSpeed;

		if (delta > 0) {
			this.callbacks.onZoomOut?.();
		} else if (delta < 0) {
			this.callbacks.onZoomIn?.();
		}

		event.preventDefault();
	}

	/**
	 * Update mouse position
	 */
	private updateMousePosition(event: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		this.mousePosition = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
	}

	/**
	 * Check if a key is a game key
	 */
	private isGameKey(key: string): boolean {
		const allKeys = Object.values(this.config.keyMappings).flat();
		return allKeys.includes(key);
	}

	/**
	 * Update movement state based on current input
	 */
	private updateMovementState(): void {
		const prevMovement = { ...this.movementInput };

		// Keyboard movement
		this.movementInput.up = this.config.keyMappings.moveUp.some(key => this.keys.has(key));
		this.movementInput.down = this.config.keyMappings.moveDown.some(key => this.keys.has(key));
		this.movementInput.left = this.config.keyMappings.moveLeft.some(key => this.keys.has(key));
		this.movementInput.right = this.config.keyMappings.moveRight.some(key => this.keys.has(key));
		this.movementInput.running = this.config.keyMappings.run.some(key => this.keys.has(key));

		// Gamepad movement (override keyboard if gamepad is active)
		const leftStickX = this.gamepadAxes['LEFT_X'] || 0;
		const leftStickY = this.gamepadAxes['LEFT_Y'] || 0;

		if (Math.abs(leftStickX) > this.config.gamepadDeadzone || Math.abs(leftStickY) > this.config.gamepadDeadzone) {
			this.movementInput.up = leftStickY < -this.config.gamepadAxisThreshold;
			this.movementInput.down = leftStickY > this.config.gamepadAxisThreshold;
			this.movementInput.left = leftStickX < -this.config.gamepadAxisThreshold;
			this.movementInput.right = leftStickX > this.config.gamepadAxisThreshold;

			// Calculate magnitude and angle for analog input
			this.movementInput.magnitude = Math.min(Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY), 1.0);
			this.movementInput.angle = Math.atan2(leftStickY, leftStickX);
		} else {
			// Digital input magnitude
			const hasMovement = this.movementInput.up || this.movementInput.down || this.movementInput.left || this.movementInput.right;
			this.movementInput.magnitude = hasMovement ? 1.0 : 0.0;

			// Calculate angle for digital input
			if (hasMovement) {
				let x = 0, y = 0;
				if (this.movementInput.right) x += 1;
				if (this.movementInput.left) x -= 1;
				if (this.movementInput.down) y += 1;
				if (this.movementInput.up) y -= 1;
				this.movementInput.angle = Math.atan2(y, x);
			}
		}

		// Gamepad running
		if (this.gamepadState[this.config.gamepadMappings.run]) {
			this.movementInput.running = true;
		}

		// Notify movement change
		const hasMovementChanged = (
			prevMovement.up !== this.movementInput.up ||
			prevMovement.down !== this.movementInput.down ||
			prevMovement.left !== this.movementInput.left ||
			prevMovement.right !== this.movementInput.right ||
			prevMovement.running !== this.movementInput.running ||
			Math.abs(prevMovement.magnitude - this.movementInput.magnitude) > 0.1
		);

		if (hasMovementChanged) {
			this.callbacks.onMovementChange?.(this.movementInput);
		}
	}

	/**
	 * Update method to be called from game loop
	 */
	update(): void {
		this.updateGamepadState();
	}

	/**
	 * Update gamepad state (polling)
	 */
	private updateGamepadState(): void {
		const gamepads = navigator.getGamepads();

		for (let i = 0; i < gamepads.length; i++) {
			const gamepad = gamepads[i];
			if (!gamepad) continue;

			// Update button states
			const buttonMappings = this.config.gamepadMappings;
			const prevGamepadState = { ...this.gamepadState };

			// Map gamepad buttons to our button names
			const buttonMap: Record<number, GamepadButton> = {
				0: 'A', 1: 'B', 2: 'X', 3: 'Y',
				4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
				8: 'BACK', 9: 'START',
				10: 'LEFT_STICK', 11: 'RIGHT_STICK',
				12: 'DPAD_UP', 13: 'DPAD_DOWN', 14: 'DPAD_LEFT', 15: 'DPAD_RIGHT',
			};

			// Update button states
			for (let j = 0; j < gamepad.buttons.length; j++) {
				const button = gamepad.buttons[j];
				const buttonName = buttonMap[j];
				if (buttonName) {
					this.gamepadState[buttonName] = button.pressed;
				}
			}

			// Update axis states
			if (gamepad.axes.length >= 2) {
				this.gamepadAxes['LEFT_X'] = gamepad.axes[0];
				this.gamepadAxes['LEFT_Y'] = gamepad.axes[1];
			}
			if (gamepad.axes.length >= 4) {
				this.gamepadAxes['RIGHT_X'] = gamepad.axes[2];
				this.gamepadAxes['RIGHT_Y'] = gamepad.axes[3];
			}

			// Check for button press events
			for (const [buttonName, action] of Object.entries(buttonMappings)) {
				if (this.gamepadState[action] && !prevGamepadState[action]) {
					// Button just pressed
					this.handleGamepadAction(buttonName);
				}
			}

			// Update movement state
			this.updateMovementState();

			// We only handle the first connected gamepad
			break;
		}
	}

	/**
	 * Handle gamepad action
	 */
	private handleGamepadAction(action: string): void {
		switch (action) {
		case 'activate':
			this.callbacks.onActivate?.();
			break;
		case 'inventory':
			this.callbacks.onInventoryToggle?.();
			break;
		case 'map':
			this.callbacks.onMapToggle?.();
			break;
		case 'menu':
			this.callbacks.onMenuToggle?.();
			break;
		case 'recenter':
			this.callbacks.onRecenter?.();
			break;
		}
	}

	/**
	 * Get current input state
	 */
	getInputState(): InputState {
		return {
			keys: Array.from(this.keys),
			mouseButtons: Array.from(this.mouseButtons),
			mousePosition: { ...this.mousePosition },
			gamepadConnected: navigator.getGamepads().some(pad => pad !== null),
			movement: { ...this.movementInput },
		};
	}

	/**
	 * Get current movement input
	 */
	getMovementInput(): MovementInput {
		return { ...this.movementInput };
	}

	/**
	 * Check if a key is currently pressed
	 */
	isKeyPressed(key: string): boolean {
		return this.keys.has(key);
	}

	/**
	 * Check if a mouse button is currently pressed
	 */
	isMouseButtonPressed(button: number): boolean {
		return this.mouseButtons.has(button);
	}

	/**
	 * Check if a gamepad button is currently pressed
	 */
	isGamepadButtonPressed(button: GamepadButton): boolean {
		return this.gamepadState[button] || false;
	}

	/**
	 * Get gamepad axis value
	 */
	getGamepadAxis(axis: GamepadAxis): number {
		return this.gamepadAxes[axis] || 0;
	}

	/**
	 * Get mouse position
	 */
	getMousePosition(): { x: number; y: number } {
		return { ...this.mousePosition };
	}

	/**
	 * Clear all input state
	 */
	clearInputState(): void {
		this.keys.clear();
		this.mouseButtons.clear();
		this.gamepadState = {};
		this.gamepadAxes = {};
		this.movementInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			running: false,
			magnitude: 0,
			angle: 0,
		};

		console.log('[INPUT-MANAGER] Cleared input state');
	}

	/**
	 * Enable/disable input processing
	 */
	setEnabled(enabled: boolean): void {
		if (!enabled) {
			this.clearInputState();
		}
		console.log(`[INPUT-MANAGER] Input processing ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Get input statistics
	 */
	getStats(): {
		activeKeys: number;
		activeMouseButtons: number;
		gamepadConnected: boolean;
		movementMagnitude: number;
		config: typeof InputManager.prototype.config;
		} {
		return {
			activeKeys: this.keys.size,
			activeMouseButtons: this.mouseButtons.size,
			gamepadConnected: navigator.getGamepads().some(pad => pad !== null),
			movementMagnitude: this.movementInput.magnitude,
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		// Remove all event listeners
		for (const { element, event, listener } of this.eventListeners) {
			element.removeEventListener(event, listener);
		}
		this.eventListeners = [];

		// Clear state
		this.clearInputState();

		console.log('[INPUT-MANAGER] Input manager destroyed');
	}
}
