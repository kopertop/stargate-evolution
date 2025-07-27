import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { DestinyStatus, Character, Galaxy, StarSystem, ExplorationProgress } from '@stargate/common';

// Game engine state that needs to be synced
interface GameEngineState {
	// Player position and room
	playerPosition: { x: number; y: number; roomId?: string };
	
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
	setPlayerPosition: (position: { x: number; y: number; roomId?: string }) => void;
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
	saveGame: (gameName?: string) => Promise<void>;
	loadGame: (gameId: string) => Promise<void>;
	startFTLJump: (hours: number) => void;
	exitFTL: () => void;
	
	// Sync actions
	syncToBackend: () => Promise<void>;
	syncFromBackend: () => Promise<void>;
}

// Initial state
const initialState: Omit<GameState, keyof GameState> = {
	// Game engine state
	playerPosition: { x: 0, y: 0 },
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
				// Trigger fog discovery at new position
				const { currentFloor, fogOfWar } = get();
				const fogData = fogOfWar[currentFloor] || {};
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
						char.id === id ? { ...char, ...updates } : char
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
			setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
			
			// UI state actions
			setIsLoading: (isLoading) => set({ isLoading }),
			setShowPause: (showPause) => set({ showPause }),
			setShowSettings: (showSettings) => set({ showSettings }),
			setShowDebug: (showDebug) => set({ showDebug }),
			setShowInventory: (showInventory) => set({ showInventory }),
			setShowElevatorConsole: (showElevatorConsole) => set({ showElevatorConsole }),
			
			// Game actions
			initializeNewGame: async (gameName) => {
				// This will be implemented to call the backend
				const gameId = `new-game-${Date.now()}`;
				set({
					gameId,
					gameName,
					isInitialized: true,
					...initialState,
					gameId,
					gameName,
					isInitialized: true,
				});
				return gameId;
			},
			
			saveGame: async (gameName?: string, gameEngineRef?: any) => {
				// This will be implemented to call the backend
				const state = get();
				console.log('[STORE] Saving game state:', state);
				
				// If game engine is provided, sync from engine to store first
				if (gameEngineRef) {
					// TODO: Implement sync from game engine
					console.log('[STORE] Syncing from game engine before save');
				}
				
				// TODO: Implement backend save
			},
			
			loadGame: async (gameId) => {
				// This will be implemented to call the backend
				set({ isLoading: true });
				try {
					// TODO: Implement backend load
					set({ gameId, isLoading: false });
				} catch (error) {
					console.error('[STORE] Failed to load game:', error);
					set({ isLoading: false });
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
				// This will be implemented to sync to backend
				const state = get();
				console.log('[STORE] Syncing to backend:', state);
				// TODO: Implement backend sync
			},
			
			syncFromBackend: async () => {
				// This will be implemented to sync from backend
				console.log('[STORE] Syncing from backend');
				// TODO: Implement backend sync
			},
		})),
		{
			name: 'stargate-game-state',
			partialize: (state) => ({
				// Only persist certain parts of the state
				gameId: state.gameId,
				gameName: state.gameName,
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
				// Don't persist engine state as it should be synced from backend
			}),
		}
	)
);

// Set up automatic backend sync every minute
let syncInterval: NodeJS.Timeout | null = null;

useGameStore.subscribe(
	(state) => state.currentFloor,
	(currentFloor) => {
		// Sync to backend whenever floor changes
		console.log('[STORE] Floor changed, syncing to backend');
		useGameStore.getState().syncToBackend();
	}
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
	}
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