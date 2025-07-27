import { DestinyStatus, Character, Galaxy, StarSystem, ExplorationProgress } from '@stargate/common';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

import { DestinyService } from '../services/destiny-service';
import { SavedGameService } from '../services/saved-game-service';

// Debounce utility for auto-save
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
	let timeout: NodeJS.Timeout;
	return ((...args: any[]) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as T;
}

// Type for game data that comes from the backend
interface BackendGameData {
	destinyStatus: DestinyStatus;
	characters: Character[];
	technologies: string[];
	exploredRooms: string[];
	explorationProgress: ExplorationProgress[];
	currentGalaxy: Galaxy | null;
	currentSystem: StarSystem | null;
	knownGalaxies: Galaxy[];
	knownSystems: StarSystem[];
	currentFloor?: number; // Optional since it might not be in older saves
	playerPosition?: { x: number; y: number; roomId?: string };
	doorStates?: Array<{ id: string; state: string; restricted?: boolean; cleared?: boolean }>;
	npcs?: Array<{ id: string; name: string; x: number; y: number; roomId: string; floor: number }>;
	/**
	 * fogOfWar maps from floor number (number) to a map of room IDs (string) to a boolean indicating
	 * whether that room has been revealed (true) or is still hidden (false/undefined) for that floor.
	 * Example: { 1: { "roomA": true, "roomB": false }, 2: { "roomC": true } }
	 */
	fogOfWar?: Record<number, Record<string, boolean>>;
	mapZoom?: number;
	currentBackgroundType?: 'stars' | 'ftl';
}

// Game engine state that needs to be synced
interface GameEngineState {
	// Player position and room
	playerPosition: { x: number; y: number; roomId?: string; floor: number };

	// Floor management
	currentFloor: number;

	// Fog of war data (floor-aware)
	fogOfWar: Record<number, Record<string, boolean>>;

	// Door states
	doorStates: Array<{ id: string; state: string; restricted?: boolean; cleared?: boolean }>;

	// NPCs
	npcs: Array<{ id: string; name: string; x: number; y: number; roomId: string; floor: number }>;

	// Camera and viewport
	mapZoom: number;
	currentBackgroundType: 'stars' | 'ftl';
}

// Game metadata and progression
interface GameMetadata {
	// Game identification
	gameId: string | null;
	gameName: string | null;
	isInitialized: boolean;

	// Ship Status & Resources
	destinyStatus: DestinyStatus | null;

	// Characters & Crew Management
	characters: Character[];

	// Technology & Discoveries
	technologies: string[]; // Array of discovered technology IDs

	// Exploration Progress
	exploredRooms: string[]; // Array of explored room IDs
	explorationProgress: ExplorationProgress[];

	// Galaxy & Location Data
	currentGalaxy: Galaxy | null;
	currentSystem: StarSystem | null;
	knownGalaxies: Galaxy[];
	knownSystems: StarSystem[];

	// FTL State
	ftlStatus: string;
	ftlJumpHours: number | null;

	// Time Control
	timeSpeed: number;
}

// UI state
interface UIState {
	isLoading: boolean;
	showPause: boolean;
	showSettings: boolean;
	showDebug: boolean;
	showInventory: boolean;
	showElevatorConsole: boolean;
}

// Complete game state
interface GameState extends GameEngineState, GameMetadata, UIState {
	// Actions for game engine state
	setPlayerPosition: (position: { x: number; y: number; roomId?: string; floor: number }) => void;
	setCurrentFloor: (floor: number) => void;
	setFogOfWar: (floor: number, fogData: Record<string, boolean>) => void;
	setAllFogData: (fogData: Record<number, Record<string, boolean>>) => void;
	getFogDataForFloor: (floor: number) => Record<string, boolean>;
	setDoorStates: (doorStates: Array<{ id: string; state: string; restricted?: boolean; cleared?: boolean }>) => void;
	setNPCs: (npcs: Array<{ id: string; name: string; x: number; y: number; roomId: string; floor: number }>) => void;
	setMapZoom: (zoom: number) => void;
	setBackgroundType: (type: 'stars' | 'ftl') => void;

	// Actions for game metadata
	setGameId: (id: string | null) => void;
	setGameName: (name: string | null) => void;
	setIsInitialized: (initialized: boolean) => void;
	setDestinyStatus: (status: DestinyStatus | null) => void;
	updateDestinyStatus: (updates: Partial<DestinyStatus>) => void;
	setCharacters: (characters: Character[]) => void;
	addCharacter: (character: Character) => void;
	updateCharacter: (id: string, updates: Partial<Character>) => void;
	removeCharacter: (id: string) => void;
	setTechnologies: (technologies: string[]) => void;
	addTechnology: (techId: string) => void;
	setExploredRooms: (rooms: string[]) => void;
	addExploredRoom: (roomId: string) => void;
	setExplorationProgress: (progress: ExplorationProgress[]) => void;
	setCurrentGalaxy: (galaxy: Galaxy | null) => void;
	setCurrentSystem: (system: StarSystem | null) => void;
	setKnownGalaxies: (galaxies: Galaxy[]) => void;
	setKnownSystems: (systems: StarSystem[]) => void;
	setFTLStatus: (status: string) => void;
	setFTLJumpHours: (hours: number | null) => void;
	setTimeSpeed: (speed: number) => void;

	// Actions for UI state
	setIsLoading: (loading: boolean) => void;
	setShowPause: (show: boolean) => void;
	setShowSettings: (show: boolean) => void;
	setShowDebug: (show: boolean) => void;
	setShowInventory: (show: boolean) => void;
	setShowElevatorConsole: (show: boolean) => void;

	// Game actions
	initializeNewGame: (gameName: string) => Promise<string>;
	saveGame: (gameName?: string, gameEngineRef?: any) => Promise<void>;
	loadGame: (gameId: string) => Promise<void>;
	startFTLJump: (hours: number) => void;
	exitFTL: () => void;

	// Sync actions
	syncToBackend: () => Promise<void>;
	syncFromBackend: () => Promise<void>;

	// Auto-save actions
	enableAutoSave: () => void;
	disableAutoSave: () => void;
	triggerAutoSave: () => void;
	getAutoSaveData: (gameId: string) => any | null;
	hasAutoSave: (gameId: string) => boolean;
}

// Initial state
const initialState: GameEngineState & GameMetadata & UIState = {
	// Game engine state
	playerPosition: { x: 0, y: 0, floor: 0 },
	currentFloor: 0,
	fogOfWar: {},
	doorStates: [],
	npcs: [],
	mapZoom: 2,
	currentBackgroundType: 'stars',

	// Game metadata
	gameId: null,
	gameName: null,
	isInitialized: false,
	destinyStatus: null,
	characters: [],
	technologies: [],
	exploredRooms: [],
	explorationProgress: [],
	currentGalaxy: null,
	currentSystem: null,
	knownGalaxies: [],
	knownSystems: [],
	ftlStatus: 'normal',
	ftlJumpHours: null,
	timeSpeed: 1,

	// UI state
	isLoading: false,
	showPause: false,
	showSettings: false,
	showDebug: false,
	showInventory: false,
	showElevatorConsole: false,
};

// Create the Zustand store with persistence and subscriptions
export const useGameStore = create<GameState>()(
	persist(
		subscribeWithSelector((set, get) => ({
			...initialState,

			// Game engine state actions
			setPlayerPosition: (position) => {
				set({ playerPosition: position });
				// If the position's floor is different from current floor, update current floor
				const currentFloor = get().currentFloor;
				if (position.floor !== currentFloor) {
					console.log('[STORE] Player position floor', position.floor, 'differs from current floor', currentFloor, '- updating current floor');
					set({ currentFloor: position.floor });
				}
				// Trigger fog discovery at new position
				const { fogOfWar } = get();
				const fogData = fogOfWar[position.floor] || {};
				// This will be handled by the game engine when it syncs with the store
			},

			setCurrentFloor: (floor) => {
				const currentFloor = get().currentFloor;
				if (currentFloor !== floor) {
					console.log('[STORE] Changing floor from', currentFloor, 'to', floor);
					set({ currentFloor: floor });
					// Trigger fog discovery at current player position on new floor
					const { playerPosition } = get();
					// This will be handled by the game engine when it syncs with the store
				}
			},

			setFogOfWar: (floor, fogData) => {
				set((state) => ({
					fogOfWar: {
						...state.fogOfWar,
						[floor]: fogData,
					},
				}));
			},

			setAllFogData: (fogData) => {
				set({ fogOfWar: fogData });
			},

			getFogDataForFloor: (floor) => {
				return get().fogOfWar[floor] || {};
			},

			setDoorStates: (doorStates) => {
				set({ doorStates });
			},

			setNPCs: (npcs) => {
				set({ npcs });
			},

			setMapZoom: (zoom) => {
				set({ mapZoom: zoom });
			},

			setBackgroundType: (type) => {
				set({ currentBackgroundType: type });
			},

			// Game metadata actions
			setGameId: (gameId) => set({ gameId }),
			setGameName: (gameName) => set({ gameName }),
			setIsInitialized: (isInitialized) => set({ isInitialized }),
			setDestinyStatus: (destinyStatus) => set({ destinyStatus }),

			updateDestinyStatus: (updates) => {
				set((state) => ({
					destinyStatus: state.destinyStatus ? { ...state.destinyStatus, ...updates } : null,
				}));
			},

			setCharacters: (characters) => set({ characters }),
			addCharacter: (character) => {
				set((state) => ({
					characters: [...state.characters, character],
				}));
			},

			updateCharacter: (id, updates) => {
				set((state) => ({
					characters: state.characters.map((char) =>
						char.id === id ? { ...char, ...updates } : char,
					),
				}));
			},

			removeCharacter: (id) => {
				set((state) => ({
					characters: state.characters.filter((char) => char.id !== id),
				}));
			},

			setTechnologies: (technologies) => set({ technologies }),
			addTechnology: (techId) => {
				set((state) => ({
					technologies: state.technologies.includes(techId)
						? state.technologies
						: [...state.technologies, techId],
				}));
			},

			setExploredRooms: (exploredRooms) => set({ exploredRooms }),
			addExploredRoom: (roomId) => {
				set((state) => ({
					exploredRooms: state.exploredRooms.includes(roomId)
						? state.exploredRooms
						: [...state.exploredRooms, roomId],
				}));
			},

			setExplorationProgress: (explorationProgress) => set({ explorationProgress }),
			setCurrentGalaxy: (currentGalaxy) => set({ currentGalaxy }),
			setCurrentSystem: (currentSystem) => set({ currentSystem }),
			setKnownGalaxies: (knownGalaxies) => set({ knownGalaxies }),
			setKnownSystems: (knownSystems) => set({ knownSystems }),
			setFTLStatus: (ftlStatus) => set({ ftlStatus }),
			setFTLJumpHours: (ftlJumpHours) => set({ ftlJumpHours }),
			setTimeSpeed: (timeSpeed) => {
				set((state) => ({
					timeSpeed,
					destinyStatus: state.destinyStatus ? { ...state.destinyStatus, time_speed: timeSpeed } : null,
				}));
			},

			// UI state actions
			setIsLoading: (isLoading) => set({ isLoading }),
			setShowPause: (showPause) => set({ showPause }),
			setShowSettings: (showSettings) => set({ showSettings }),
			setShowDebug: (showDebug) => set({ showDebug }),
			setShowInventory: (showInventory) => set({ showInventory }),
			setShowElevatorConsole: (showElevatorConsole) => set({ showElevatorConsole }),

			// Game actions
			initializeNewGame: async (gameName) => {
				set({ isLoading: true });
				try {
					// Get initial Destiny status
					const initialDestinyStatus = await DestinyService.getDestinyStatus();

					// Create game data structure
					const gameData = {
						destinyStatus: initialDestinyStatus,
						characters: [],
						technologies: [],
						exploredRooms: [],
						explorationProgress: [],
						currentGalaxy: null,
						currentSystem: null,
						knownGalaxies: [],
						knownSystems: [],
						currentFloor: 0,
					};

					let savedGameId: string;
					let backendSaveSuccessful = false;

					// Try to save to backend first
					try {
						const savedGame = await SavedGameService.createSavedGame({
							name: gameName,
							description: `New game started on ${new Date().toLocaleDateString()}`,
							game_data: gameData,
						});
						savedGameId = savedGame.id;
						backendSaveSuccessful = true;
						console.log('[STORE] Game saved to backend successfully:', savedGameId);
					} catch (backendError) {
						console.warn('[STORE] Backend save failed, falling back to local storage:', backendError);
						// Generate a local game ID if backend fails
						savedGameId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
						toast.warning('Could not save to server. Game will be saved locally only.');
					}

					// Set store state
					set({
						gameId: savedGameId,
						gameName,
						isInitialized: true,
						destinyStatus: initialDestinyStatus,
						characters: [],
						technologies: [],
						exploredRooms: [],
						explorationProgress: [],
						currentGalaxy: null,
						currentSystem: null,
						knownGalaxies: [],
						knownSystems: [],
						currentFloor: 0,
						isLoading: false,
					});

					// Always save to local storage as backup (or primary if backend failed)
					localStorage.setItem('stargate-current-game-id', savedGameId);
					localStorage.setItem('stargate-current-game-name', gameName);
					localStorage.setItem(`stargate-game-${savedGameId}`, JSON.stringify(gameData));

					console.log('[STORE] Initialized new game:', savedGameId, 'with name:', gameName);

					if (backendSaveSuccessful) {
						toast.success(`New game "${gameName}" created and saved to server!`);
					} else {
						toast.success(`New game "${gameName}" created and saved locally!`);
					}

					return savedGameId;
				} catch (error) {
					console.error('[STORE] Failed to create new game:', error);
					toast.error('Failed to create new game');
					set({ isLoading: false });
					throw error;
				}
			},

			saveGame: async (gameName?: string, gameEngineRef?: any) => {
				const state = get();
				if (!state.gameId || !state.destinyStatus) {
					console.warn('[STORE] Cannot save game - missing gameId or destinyStatus');
					return;
				}

				set({ isLoading: true });
				try {
					// Get context data (non-game-engine state)
					const contextData = {
						destinyStatus: state.destinyStatus,
						characters: state.characters,
						technologies: state.technologies,
						exploredRooms: state.exploredRooms,
						explorationProgress: state.explorationProgress,
						currentGalaxy: state.currentGalaxy,
						currentSystem: state.currentSystem,
						knownGalaxies: state.knownGalaxies,
						knownSystems: state.knownSystems,
						currentFloor: state.currentFloor,
					};

					console.log('[STORE] Preparing to save game data:', {
						gameId: state.gameId,
						hasDestinyStatus: !!state.destinyStatus,
						hasGameEngine: !!gameEngineRef,
						charactersCount: state.characters.length,
						technologiesCount: state.technologies.length,
						exploredRoomsCount: state.exploredRooms.length,
						contextDataSize: JSON.stringify(contextData).length,
					});

					// If we have a game engine reference, use its save method
					if (gameEngineRef && typeof gameEngineRef.save === 'function') {
						await gameEngineRef.save(state.gameId, gameName || state.gameName || 'Unnamed Game', contextData);
						console.log('[STORE] Game saved using game engine');
					} else {
						// Fallback: save context data only (for cases where game engine isn't available)
						if (gameEngineRef) {
							console.warn('[STORE] Invalid game engine reference provided - missing save method');
						} else {
							console.warn('[STORE] No game engine reference - saving context data only');
						}
						await SavedGameService.updateGameState(state.gameId, contextData);
					}

					// Update local state if name changed
					if (gameName && gameName !== state.gameName) {
						set({ gameName });
						localStorage.setItem('stargate-current-game-name', gameName);
					}

					// Always save to local storage as backup
					const fullGameData = gameEngineRef ?
						{ ...contextData, ...gameEngineRef.toJSON() } :
						contextData;
					localStorage.setItem(`stargate-game-${state.gameId}`, JSON.stringify(fullGameData));

					const displayName = gameName || state.gameName || 'Game';
					toast.success(`"${displayName}" saved successfully`);
					console.log('[STORE] Game saved successfully:', state.gameId);
				} catch (error) {
					console.error('[STORE] Failed to save game:', error);
					toast.error('Failed to save game');
					throw error;
				} finally {
					set({ isLoading: false });
				}
			},

			loadGame: async (gameId) => {
				set({ isLoading: true });
				try {
					console.log('[STORE] Loading game:', gameId);

					const savedGame = await SavedGameService.getSavedGame(gameId);
					console.log('[STORE] Loaded saved game from backend:', {
						gameId,
						gameName: savedGame.name,
						gameDataType: typeof savedGame.game_data,
						gameDataKeys: savedGame.game_data ? Object.keys(savedGame.game_data) : [],
					});

					const gameData = savedGame.game_data as BackendGameData;

					// Set store state
					set({
						gameId,
						gameName: savedGame.name,
						isInitialized: true,
						destinyStatus: gameData.destinyStatus,
						characters: gameData.characters || [],
						technologies: gameData.technologies || [],
						exploredRooms: gameData.exploredRooms || [],
						explorationProgress: gameData.explorationProgress || [],
						currentGalaxy: gameData.currentGalaxy || null,
						currentSystem: gameData.currentSystem || null,
						knownGalaxies: gameData.knownGalaxies || [],
						knownSystems: gameData.knownSystems || [],
						currentFloor: (gameData as any).currentFloor || 0,
						isLoading: false,
					});

					// Save to local storage as backup
					localStorage.setItem('stargate-current-game-id', gameId);
					localStorage.setItem('stargate-current-game-name', savedGame.name);
					localStorage.setItem(`stargate-game-${gameId}`, JSON.stringify(savedGame.game_data));

					console.log('[STORE] Loaded game from backend:', gameId, 'name:', savedGame.name);
					toast.success(`"${savedGame.name}" loaded successfully`);
				} catch (error) {
					console.error('[STORE] Failed to load game:', error);
					set({ isLoading: false });
					throw error;
				}
			},

			startFTLJump: (hours) => {
				set({ ftlStatus: 'ftl', ftlJumpHours: hours });
			},

			exitFTL: () => {
				set({ ftlStatus: 'normal', ftlJumpHours: null });
			},

			// Sync actions
			syncToBackend: async () => {
				const state = get();
				if (!state.gameId || !state.destinyStatus) {
					console.log('[STORE] Skipping backend sync - no game loaded');
					return;
				}

				try {
					console.log('[STORE] Syncing to backend:', state.gameId);

					// Get context data (non-game-engine state)
					const contextData = {
						destinyStatus: state.destinyStatus,
						characters: state.characters,
						technologies: state.technologies,
						exploredRooms: state.exploredRooms,
						explorationProgress: state.explorationProgress,
						currentGalaxy: state.currentGalaxy,
						currentSystem: state.currentSystem,
						knownGalaxies: state.knownGalaxies,
						knownSystems: state.knownSystems,
						currentFloor: state.currentFloor,
					};

					// Only sync if this is a backend game (not local)
					if (!state.gameId.startsWith('local-')) {
						await SavedGameService.updateGameState(state.gameId, contextData);
						console.log('[STORE] Successfully synced to backend');
					} else {
						console.log('[STORE] Skipping backend sync for local game');
					}
				} catch (error) {
					console.error('[STORE] Failed to sync to backend:', error);
					// Don't throw error for sync failures - just log them
				}
			},

			syncFromBackend: async () => {
				const state = get();
				if (!state.gameId || state.gameId.startsWith('local-')) {
					console.log('[STORE] Skipping backend sync - no backend game loaded');
					return;
				}

				try {
					console.log('[STORE] Syncing from backend:', state.gameId);

					const savedGame = await SavedGameService.getSavedGame(state.gameId);
					const gameData = savedGame.game_data as BackendGameData;

					// Update store with backend data
					set({
						destinyStatus: gameData.destinyStatus,
						characters: gameData.characters || [],
						technologies: gameData.technologies || [],
						exploredRooms: gameData.exploredRooms || [],
						explorationProgress: gameData.explorationProgress || [],
						currentGalaxy: gameData.currentGalaxy || null,
						currentSystem: gameData.currentSystem || null,
						knownGalaxies: gameData.knownGalaxies || [],
						knownSystems: gameData.knownSystems || [],
						currentFloor: (gameData as any).currentFloor || 0,
					});

					console.log('[STORE] Successfully synced from backend');
				} catch (error) {
					console.error('[STORE] Failed to sync from backend:', error);
					// Don't throw error for sync failures - just log them
				}
			},

			// Auto-save actions
			enableAutoSave: () => {
				// Auto-save is enabled by default through subscriptions below
				console.log('[STORE] Auto-save enabled');
			},

			disableAutoSave: () => {
				// This would require more complex state tracking to implement properly
				console.log('[STORE] Auto-save disable not implemented');
			},

			triggerAutoSave: () => {
				const state = get();
				if (state.gameId && state.isInitialized) {
					console.log('[STORE] Triggering manual auto-save');
					// The auto-save happens automatically through Zustand persist
					// but we can also save to our custom format
					const gameStateKey = `stargate-auto-save-${state.gameId}`;
					const autoSaveData = {
						timestamp: Date.now(),
						gameId: state.gameId,
						gameName: state.gameName,
						playerPosition: state.playerPosition,
						currentFloor: state.currentFloor,
						fogOfWar: state.fogOfWar,
						doorStates: state.doorStates,
						npcs: state.npcs,
						mapZoom: state.mapZoom,
						currentBackgroundType: state.currentBackgroundType,
						destinyStatus: state.destinyStatus,
						characters: state.characters,
						technologies: state.technologies,
						exploredRooms: state.exploredRooms,
					};

					try {
						localStorage.setItem(gameStateKey, JSON.stringify(autoSaveData));
						console.log('[STORE] Auto-save completed:', gameStateKey);
					} catch (error) {
						console.error('[STORE] Auto-save failed:', error);
					}
				}
			},

			getAutoSaveData: (gameId: string) => {
				try {
					const gameStateKey = `stargate-auto-save-${gameId}`;
					const autoSaveData = localStorage.getItem(gameStateKey);
					if (autoSaveData) {
						const parsed = JSON.parse(autoSaveData);
						console.log('[STORE] Found auto-save data for game:', gameId, 'timestamp:', new Date(parsed.timestamp).toLocaleString());
						return parsed;
					}
				} catch (error) {
					console.error('[STORE] Failed to retrieve auto-save data:', error);
				}
				return null;
			},

			hasAutoSave: (gameId: string) => {
				try {
					const gameStateKey = `stargate-auto-save-${gameId}`;
					return localStorage.getItem(gameStateKey) !== null;
				} catch (error) {
					console.error('[STORE] Failed to check auto-save data:', error);
					return false;
				}
			},
		})),
		{
			name: 'stargate-game-state',
			partialize: (state) => ({
				// Persist game metadata
				gameId: state.gameId,
				gameName: state.gameName,
				isInitialized: state.isInitialized,
				destinyStatus: state.destinyStatus,
				characters: state.characters,
				technologies: state.technologies,
				exploredRooms: state.exploredRooms,
				explorationProgress: state.explorationProgress,
				currentGalaxy: state.currentGalaxy,
				currentSystem: state.currentSystem,
				knownGalaxies: state.knownGalaxies,
				knownSystems: state.knownSystems,
				ftlStatus: state.ftlStatus,
				ftlJumpHours: state.ftlJumpHours,
				timeSpeed: state.timeSpeed,

				// Now also persist game engine state for auto-save/resume
				playerPosition: state.playerPosition,
				currentFloor: state.currentFloor,
				fogOfWar: state.fogOfWar,
				doorStates: state.doorStates,
				npcs: state.npcs,
				mapZoom: state.mapZoom,
				currentBackgroundType: state.currentBackgroundType,
			}),
		},
	),
);

// Set up automatic backend sync every minute
let syncInterval: NodeJS.Timeout | null = null;

// Create debounced auto-save function (save max once every 5 seconds)
const debouncedAutoSave = debounce(() => {
	useGameStore.getState().triggerAutoSave();
}, 5000);

useGameStore.subscribe(
	(state) => state.currentFloor,
	(currentFloor) => {
		// Sync to backend whenever floor changes
		console.log('[STORE] Floor changed, syncing to backend');
		useGameStore.getState().syncToBackend();
		// Also trigger auto-save
		debouncedAutoSave();
	},
);

// Auto-save on player position changes
useGameStore.subscribe(
	(state) => state.playerPosition,
	(playerPosition) => {
		if (useGameStore.getState().isInitialized) {
			debouncedAutoSave();
		}
	},
);

// Auto-save on fog-of-war changes
useGameStore.subscribe(
	(state) => state.fogOfWar,
	(fogOfWar) => {
		if (useGameStore.getState().isInitialized) {
			debouncedAutoSave();
		}
	},
);

// Auto-save on door state changes
useGameStore.subscribe(
	(state) => state.doorStates,
	(doorStates) => {
		if (useGameStore.getState().isInitialized) {
			debouncedAutoSave();
		}
	},
);

// Auto-save on NPC changes
useGameStore.subscribe(
	(state) => state.npcs,
	(npcs) => {
		if (useGameStore.getState().isInitialized) {
			debouncedAutoSave();
		}
	},
);

// Start sync interval when store is initialized
useGameStore.subscribe(
	(state) => state.isInitialized,
	(isInitialized) => {
		if (isInitialized && !syncInterval) {
			syncInterval = setInterval(() => {
				useGameStore.getState().syncToBackend();
			}, 60000); // Sync every minute
		} else if (!isInitialized && syncInterval) {
			clearInterval(syncInterval);
			syncInterval = null;
		}
	},
);

// Cleanup on page unload
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		if (syncInterval) {
			clearInterval(syncInterval);
		}
		// Final sync before leaving
		useGameStore.getState().syncToBackend();
	});
}
