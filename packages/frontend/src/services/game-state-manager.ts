import type { GameState, PlayerPosition, DoorState } from '../types/game-types';

/**
 * GameStateManager handles game state persistence, save/load operations,
 * and coordination with other systems for state management.
 */
export class GameStateManager {
	private currentState: GameState | null = null;

	// Storage configuration
	private config = {
		storagePrefix: 'stargate_evolution_',
		defaultSaveSlot: 'autosave',
		maxSaveSlots: 10,
		saveVersion: '1.0.0',

		// Auto-save settings
		autoSaveEnabled: true,
		autoSaveInterval: 30000, // 30 seconds
		autoSaveOnStateChange: true,

		// Validation settings
		validateStateOnLoad: true,
		migrateOldStates: true,
	};

	// Auto-save timer
	private autoSaveTimer: number | null = null;
	private lastSaveTime: number = 0;

	// Callbacks for external systems
	private callbacks: {
		onStateChanged?: (state: GameState) => void;
		onStateSaved?: (slot: string, success: boolean) => void;
		onStateLoaded?: (slot: string, success: boolean, state?: GameState) => void;
		onAutoSave?: () => void;
		getPlayerPosition?: () => PlayerPosition;
		getDoorStates?: () => DoorState[];
		getFogOfWar?: () => any;
		getMapZoom?: () => number;
		getCurrentBackgroundType?: () => 'stars' | 'ftl';
		getTimeSpeed?: () => number;
		getGameTime?: () => { elapsed: number; paused: boolean };
	} = {};

	constructor() {
		console.log('[GAME-STATE-MANAGER] Initialized game state manager');
		this.initializeAutoSave();
	}

	/**
	 * Set callbacks for external system integration
	 */
	setCallbacks(callbacks: Partial<typeof GameStateManager.prototype.callbacks>): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
		console.log('[GAME-STATE-MANAGER] Updated system callbacks');
	}

	/**
	 * Update game state configuration
	 */
	updateConfig(newConfig: Partial<typeof GameStateManager.prototype.config>): void {
		const prevAutoSave = this.config.autoSaveEnabled;
		this.config = { ...this.config, ...newConfig };

		// Restart auto-save if settings changed
		if (prevAutoSave !== this.config.autoSaveEnabled) {
			this.initializeAutoSave();
		}

		console.log('[GAME-STATE-MANAGER] Updated configuration');
	}

	/**
	 * Initialize auto-save functionality
	 */
	private initializeAutoSave(): void {
		// Clear existing timer
		if (this.autoSaveTimer) {
			clearInterval(this.autoSaveTimer);
			this.autoSaveTimer = null;
		}

		// Start new timer if auto-save is enabled
		if (this.config.autoSaveEnabled && this.config.autoSaveInterval > 0) {
			this.autoSaveTimer = window.setInterval(() => {
				this.performAutoSave();
			}, this.config.autoSaveInterval);

			console.log(`[GAME-STATE-MANAGER] Auto-save enabled with ${this.config.autoSaveInterval}ms interval`);
		}
	}

	/**
	 * Perform auto-save
	 */
	private performAutoSave(): void {
		const success = this.saveGame(this.config.defaultSaveSlot);

		if (success) {
			this.callbacks.onAutoSave?.();
			console.log('[GAME-STATE-MANAGER] Auto-save completed');
		} else {
			console.warn('[GAME-STATE-MANAGER] Auto-save failed');
		}
	}

	/**
	 * Collect current game state from all systems
	 */
	private collectCurrentState(): GameState {
		const playerPosition = this.callbacks.getPlayerPosition?.() || { x: 0, y: 0, roomId: '' };
		const doorStates = this.callbacks.getDoorStates?.() || [];
		const fogOfWar = this.callbacks.getFogOfWar?.() || null;
		const mapZoom = this.callbacks.getMapZoom?.() || 2.0;
		const currentBackgroundType = this.callbacks.getCurrentBackgroundType?.() || 'stars';
		const timeSpeed = this.callbacks.getTimeSpeed?.() || 1.0;
		const gameTime = this.callbacks.getGameTime?.() || { elapsed: 0, paused: false };

		return {
			playerPosition,
			doorStates,
			fogOfWar,
			mapZoom,
			currentBackgroundType,
			timeSpeed,
			gameTime,
		};
	}

	/**
	 * Save game state to specified slot
	 */
	saveGame(slot: string = this.config.defaultSaveSlot): boolean {
		try {
			const gameState = this.collectCurrentState();

			// Create save data with metadata
			const saveData = {
				version: this.config.saveVersion,
				timestamp: Date.now(),
				slot,
				state: gameState,
			};

			// Save to localStorage
			const key = `${this.config.storagePrefix}${slot}`;
			localStorage.setItem(key, JSON.stringify(saveData));

			// Update current state
			this.currentState = gameState;
			this.lastSaveTime = Date.now();

			console.log(`[GAME-STATE-MANAGER] Game saved to slot: ${slot}`);

			// Notify external systems
			this.callbacks.onStateSaved?.(slot, true);

			return true;
		} catch (error) {
			console.error('[GAME-STATE-MANAGER] Failed to save game:', error);
			this.callbacks.onStateSaved?.(slot, false);
			return false;
		}
	}

	/**
	 * Load game state from specified slot
	 */
	loadGame(slot: string = this.config.defaultSaveSlot): GameState | null {
		try {
			const key = `${this.config.storagePrefix}${slot}`;
			const savedData = localStorage.getItem(key);

			if (!savedData) {
				console.warn(`[GAME-STATE-MANAGER] No save data found for slot: ${slot}`);
				this.callbacks.onStateLoaded?.(slot, false);
				return null;
			}

			const saveData = JSON.parse(savedData);

			// Validate save data structure
			if (!this.validateSaveData(saveData)) {
				console.error(`[GAME-STATE-MANAGER] Invalid save data in slot: ${slot}`);
				this.callbacks.onStateLoaded?.(slot, false);
				return null;
			}

			// Extract game state
			let gameState = saveData.state as GameState;

			// Migrate state if necessary
			if (this.config.migrateOldStates && saveData.version !== this.config.saveVersion) {
				gameState = this.migrateGameState(gameState, saveData.version);
				console.log(`[GAME-STATE-MANAGER] Migrated save from version ${saveData.version} to ${this.config.saveVersion}`);
			}

			// Validate game state
			if (this.config.validateStateOnLoad && !this.validateGameState(gameState)) {
				console.error(`[GAME-STATE-MANAGER] Invalid game state in slot: ${slot}`);
				this.callbacks.onStateLoaded?.(slot, false);
				return null;
			}

			// Update current state
			this.currentState = gameState;

			console.log(`[GAME-STATE-MANAGER] Game loaded from slot: ${slot}`);

			// Notify external systems
			this.callbacks.onStateLoaded?.(slot, true, gameState);
			this.callbacks.onStateChanged?.(gameState);

			return gameState;
		} catch (error) {
			console.error(`[GAME-STATE-MANAGER] Failed to load game from slot ${slot}:`, error);
			this.callbacks.onStateLoaded?.(slot, false);
			return null;
		}
	}

	/**
	 * Validate save data structure
	 */
	private validateSaveData(saveData: any): boolean {
		return (
			saveData &&
			typeof saveData === 'object' &&
			saveData.version &&
			saveData.timestamp &&
			saveData.state &&
			typeof saveData.state === 'object'
		);
	}

	/**
	 * Validate game state structure
	 */
	private validateGameState(state: GameState): boolean {
		return (
			state &&
			typeof state === 'object' &&
			state.playerPosition &&
			typeof state.playerPosition === 'object' &&
			typeof state.playerPosition.x === 'number' &&
			typeof state.playerPosition.y === 'number' &&
			typeof state.playerPosition.roomId === 'string' &&
			Array.isArray(state.doorStates) &&
			typeof state.mapZoom === 'number' &&
			(state.currentBackgroundType === 'stars' || state.currentBackgroundType === 'ftl') &&
			typeof state.timeSpeed === 'number' &&
			state.gameTime &&
			typeof state.gameTime.elapsed === 'number' &&
			typeof state.gameTime.paused === 'boolean'
		);
	}

	/**
	 * Migrate game state from older versions
	 */
	private migrateGameState(state: GameState, fromVersion: string): GameState {
		// In a real implementation, this would handle version-specific migrations
		console.log(`[GAME-STATE-MANAGER] Migrating state from version ${fromVersion}`);

		// For now, just return the state as-is with any missing defaults
		return {
			playerPosition: state.playerPosition || { x: 0, y: 0, roomId: '' },
			doorStates: state.doorStates || [],
			fogOfWar: state.fogOfWar || null,
			mapZoom: state.mapZoom || 2.0,
			currentBackgroundType: state.currentBackgroundType || 'stars',
			timeSpeed: state.timeSpeed || 1.0,
			gameTime: state.gameTime || { elapsed: 0, paused: false },
		};
	}

	/**
	 * Delete save data from specified slot
	 */
	deleteSave(slot: string): boolean {
		try {
			const key = `${this.config.storagePrefix}${slot}`;
			localStorage.removeItem(key);

			console.log(`[GAME-STATE-MANAGER] Deleted save slot: ${slot}`);
			return true;
		} catch (error) {
			console.error(`[GAME-STATE-MANAGER] Failed to delete save slot ${slot}:`, error);
			return false;
		}
	}

	/**
	 * Get list of available save slots
	 */
	getSaveSlots(): Array<{
		slot: string;
		timestamp: number;
		version: string;
		hasData: boolean;
	}> {
		const slots: Array<{
			slot: string;
			timestamp: number;
			version: string;
			hasData: boolean;
		}> = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key || !key.startsWith(this.config.storagePrefix)) continue;

			const slot = key.replace(this.config.storagePrefix, '');

			try {
				const savedData = localStorage.getItem(key);
				if (savedData) {
					const saveData = JSON.parse(savedData);
					slots.push({
						slot,
						timestamp: saveData.timestamp || 0,
						version: saveData.version || 'unknown',
						hasData: true,
					});
				}
			} catch (error) {
				// Corrupted save data
				slots.push({
					slot,
					timestamp: 0,
					version: 'corrupted',
					hasData: false,
				});
			}
		}

		// Sort by timestamp (newest first)
		slots.sort((a, b) => b.timestamp - a.timestamp);

		return slots;
	}

	/**
	 * Check if save slot exists
	 */
	hasSave(slot: string): boolean {
		const key = `${this.config.storagePrefix}${slot}`;
		return localStorage.getItem(key) !== null;
	}

	/**
	 * Get current game state
	 */
	getCurrentState(): GameState | null {
		return this.currentState ? { ...this.currentState } : null;
	}

	/**
	 * Set current game state (useful for initialization)
	 */
	setCurrentState(state: GameState): void {
		this.currentState = state;
		this.callbacks.onStateChanged?.(state);

		// Auto-save if enabled
		if (this.config.autoSaveOnStateChange && this.config.autoSaveEnabled) {
			this.performAutoSave();
		}

		console.log('[GAME-STATE-MANAGER] Current state updated');
	}

	/**
	 * Update specific parts of the game state
	 */
	updateState(partialState: Partial<GameState>): void {
		if (!this.currentState) {
			console.warn('[GAME-STATE-MANAGER] Cannot update state - no current state set');
			return;
		}

		this.currentState = { ...this.currentState, ...partialState };
		this.callbacks.onStateChanged?.(this.currentState);

		console.log('[GAME-STATE-MANAGER] State partially updated');
	}

	/**
	 * Get save/load statistics
	 */
	getStats(): {
		currentStateExists: boolean;
		lastSaveTime: number;
		availableSlots: number;
		autoSaveEnabled: boolean;
		config: typeof GameStateManager.prototype.config;
		} {
		return {
			currentStateExists: this.currentState !== null,
			lastSaveTime: this.lastSaveTime,
			availableSlots: this.getSaveSlots().length,
			autoSaveEnabled: this.config.autoSaveEnabled,
			config: { ...this.config },
		};
	}

	/**
	 * Clear all save data (for debugging/reset)
	 */
	clearAllSaves(): number {
		let cleared = 0;
		const keysToRemove: string[] = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(this.config.storagePrefix)) {
				keysToRemove.push(key);
			}
		}

		for (const key of keysToRemove) {
			localStorage.removeItem(key);
			cleared++;
		}

		console.log(`[GAME-STATE-MANAGER] Cleared ${cleared} save slots`);
		return cleared;
	}

	/**
	 * Export save data as JSON (for backup)
	 */
	exportSave(slot: string): string | null {
		const key = `${this.config.storagePrefix}${slot}`;
		const saveData = localStorage.getItem(key);

		if (!saveData) {
			console.warn(`[GAME-STATE-MANAGER] No save data to export for slot: ${slot}`);
			return null;
		}

		return saveData;
	}

	/**
	 * Import save data from JSON (for restore)
	 */
	importSave(slot: string, saveDataJson: string): boolean {
		try {
			// Validate JSON
			const saveData = JSON.parse(saveDataJson);

			if (!this.validateSaveData(saveData)) {
				console.error('[GAME-STATE-MANAGER] Invalid save data format for import');
				return false;
			}

			const key = `${this.config.storagePrefix}${slot}`;
			localStorage.setItem(key, saveDataJson);

			console.log(`[GAME-STATE-MANAGER] Successfully imported save to slot: ${slot}`);
			return true;
		} catch (error) {
			console.error('[GAME-STATE-MANAGER] Failed to import save data:', error);
			return false;
		}
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		// Clear auto-save timer
		if (this.autoSaveTimer) {
			clearInterval(this.autoSaveTimer);
			this.autoSaveTimer = null;
		}

		// Perform final auto-save if enabled
		if (this.config.autoSaveEnabled && this.currentState) {
			this.saveGame(this.config.defaultSaveSlot);
		}

		this.currentState = null;
		this.callbacks = {};

		console.log('[GAME-STATE-MANAGER] Game state manager destroyed');
	}
}
