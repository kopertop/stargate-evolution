import {
	DestinyStatus,
	Character,
	DoorTemplate,
	Galaxy,
	StarSystem,
	ExplorationProgress,
} from '@stargate/common';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import { SavedGameService } from '../services/saved-game-service';

import { useAuth } from './auth-context';

// Enhanced game state context for resource management and gameplay
interface GameStateContextType {
	gameId: string | null;
	setGameId: (id: string | null) => void;

	// Ship Status & Resources
	destinyStatus: DestinyStatus | null;
	setDestinyStatus: (status: DestinyStatus | null) => void;
	updateDestinyStatus: (updates: Partial<DestinyStatus>) => void;

	// Characters & Crew Management
	characters: Character[];
	setCharacters: (characters: Character[]) => void;
	addCharacter: (character: Character) => void;
	updateCharacter: (id: string, updates: Partial<Character>) => void;
	removeCharacter: (id: string) => void;

	// Player State
	playerPosition: { x: number; y: number; roomId?: string } | null;
	setPlayerPosition: (position: { x: number; y: number; roomId?: string }) => void;

	// Door States (for save/restore)
	doorStates: DoorTemplate[];
	setDoorStates: (doors: DoorTemplate[]) => void;
	updateDoorState: (doorId: string, updates: Partial<DoorTemplate>) => void;

	// Technology & Discoveries
	technologies: string[]; // Array of discovered technology IDs
	setTechnologies: (technologies: string[]) => void;
	addTechnology: (techId: string) => void;

	// Exploration Progress
	exploredRooms: string[]; // Array of explored room IDs
	setExploredRooms: (rooms: string[]) => void;
	addExploredRoom: (roomId: string) => void;
	explorationProgress: ExplorationProgress[];
	setExplorationProgress: (progress: ExplorationProgress[]) => void;

	// Galaxy & Location Data
	currentGalaxy: Galaxy | null;
	setCurrentGalaxy: (galaxy: Galaxy | null) => void;
	currentSystem: StarSystem | null;
	setCurrentSystem: (system: StarSystem | null) => void;
	knownGalaxies: Galaxy[];
	setKnownGalaxies: (galaxies: Galaxy[]) => void;
	knownSystems: StarSystem[];
	setKnownSystems: (systems: StarSystem[]) => void;

	// FTL State Management
	startFTLJump: (hours: number) => void;
	exitFTL: () => void;

	// Time Control
	setTimeSpeed: (speed: number) => void;

	// Game State Actions
	initializeNewGame: (gameName: string) => void;
	saveGame: (gameName?: string) => Promise<void>;
	loadGame: (gameId: string) => Promise<void>;
	isLoading: boolean;
	isInitialized: boolean;
	gameName: string | null;
	setGameName: (name: string | null) => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const auth = useAuth();
	const [gameId, setGameId] = useState<string | null>(null);
	const [gameName, setGameName] = useState<string | null>(null);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatus | null>(null);
	const [characters, setCharacters] = useState<Character[]>([]);
	const [technologies, setTechnologies] = useState<string[]>([]);
	const [exploredRooms, setExploredRooms] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);

	// Player State
	const [playerPosition, setPlayerPosition] = useState<{ x: number; y: number; roomId?: string } | null>(null);

	// Door States
	const [doorStates, setDoorStates] = useState<DoorTemplate[]>([]);

	// Exploration Progress
	const [explorationProgress, setExplorationProgress] = useState<ExplorationProgress[]>([]);

	// Galaxy & Location Data
	const [currentGalaxy, setCurrentGalaxy] = useState<Galaxy | null>(null);
	const [currentSystem, setCurrentSystem] = useState<StarSystem | null>(null);
	const [knownGalaxies, setKnownGalaxies] = useState<Galaxy[]>([]);
	const [knownSystems, setKnownSystems] = useState<StarSystem[]>([]);

	// Game initialization function
	const initializeNewGame = async (newGameName: string) => {
		setIsLoading(true);
		try {
			const randomJumpHours = 4 + Math.random() * 44; // 4-48 hours
			const randomJumpSeconds = randomJumpHours * 3600; // Convert to seconds

			const initialDestinyStatus: DestinyStatus = {
				id: 'destiny-1',
				name: 'Destiny',
				power: 85,
				max_power: 100,
				shields: 67,
				max_shields: 100,
				hull: 92,
				max_hull: 100,
				water: 78,
				max_water: 100,
				food: 45,
				max_food: 100,
				spare_parts: 34,
				max_spare_parts: 100,
				medical_supplies: 89,
				max_medical_supplies: 100,
				race_id: 'ancient',
				location: '{"system":"Pegasus Prime","galaxy":"Pegasus","sector":"Alpha"}',
				co2: 0.04,
				o2: 20.9,
				co2Scrubbers: 5,
				weapons: '{}',
				shuttles: '{}',
				game_days: 0,
				game_hours: 0,
				current_time: 0, // Start at mission beginning
				next_jump_time: randomJumpSeconds, // Random 4-48 hours in seconds
				time_speed: 1, // 1 second per second by default
				ftl_status: 'normal_space', // Start in normal space
				next_ftl_transition: randomJumpHours, // Legacy field in hours
			};

			const gameData = {
				destinyStatus: initialDestinyStatus,
				characters: [],
				technologies: [],
				exploredRooms: [],
				playerPosition: { x: 0, y: 0, roomId: 'destiny-bridge' }, // Default starting position
				doorStates: [], // Will be populated from templates
				explorationProgress: [],
				currentGalaxy: null,
				currentSystem: null,
				knownGalaxies: [],
				knownSystems: [],
			};

			let savedGameId: string;
			let backendSaveSuccessful = false;

			// Try to save to backend first
			try {
				const savedGame = await SavedGameService.createSavedGame({
					name: newGameName,
					description: `New game started on ${new Date().toLocaleDateString()}`,
					game_data: JSON.stringify(gameData),
				});
				savedGameId = savedGame.id;
				backendSaveSuccessful = true;
				console.log('[GAME-STATE] Game saved to backend successfully:', savedGameId);
			} catch (backendError) {
				console.warn('[GAME-STATE] Backend save failed, falling back to local storage:', backendError);
				// Generate a local game ID if backend fails
				savedGameId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				toast.warning('Could not save to server. Game will be saved locally only.');
			}

			setGameId(savedGameId);
			setGameName(newGameName);
			setDestinyStatus(initialDestinyStatus);
			setCharacters([]);
			setTechnologies([]);
			setExploredRooms([]);
			setPlayerPosition({ x: 0, y: 0, roomId: 'destiny-bridge' });
			setDoorStates([]);
			setExplorationProgress([]);
			setCurrentGalaxy(null);
			setCurrentSystem(null);
			setKnownGalaxies([]);
			setKnownSystems([]);
			setIsInitialized(true);

			// Always save to local storage as backup (or primary if backend failed)
			localStorage.setItem('stargate-current-game-id', savedGameId);
			localStorage.setItem('stargate-current-game-name', newGameName);
			localStorage.setItem(`stargate-game-${savedGameId}`, JSON.stringify(gameData));

			console.log('[GAME-STATE] Initialized new game:', savedGameId, 'with name:', newGameName);

			if (backendSaveSuccessful) {
				toast.success(`New game "${newGameName}" created and saved to server!`);
			} else {
				toast.success(`New game "${newGameName}" created and saved locally!`);
			}
		} catch (error) {
			console.error('[GAME-STATE] Failed to create new game:', error);
			toast.error('Failed to create new game');
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	// Game time advancement - runs every second, advances based on time_speed
	useEffect(() => {
		const gameTimer = setInterval(() => {
			if (destinyStatus) {
				setDestinyStatus(prev => {
					if (!prev) return null;

					// Advance current_time by time_speed seconds per second
					const newCurrentTime = prev.current_time + prev.time_speed;

					// Update legacy game_days and game_hours for backward compatibility
					const totalHours = newCurrentTime / 3600; // Convert seconds to hours
					const newDays = Math.floor(totalHours / 24);
					const newHours = totalHours % 24;

					// Check for FTL transition
					let newFtlStatus = prev.ftl_status;
					let newNextJumpTime = prev.next_jump_time;

					// Auto-transition when current_time reaches next_jump_time
					if (newCurrentTime >= prev.next_jump_time && prev.next_jump_time > 0) {
						if (prev.ftl_status === 'ftl') {
							newFtlStatus = 'normal_space';
							newNextJumpTime = 0; // Reset jump time
							toast.success('Automatically dropped out of hyperspace.');
						} else {
							// Could auto-jump if scheduled, but for now just reset
							newNextJumpTime = 0;
						}
					}

					// Update legacy next_ftl_transition for backward compatibility
					const newFtlTransition = newNextJumpTime > 0 ?
						Math.max(0, (newNextJumpTime - newCurrentTime) / 3600) : 0; // Convert to hours

					return {
						...prev,
						current_time: newCurrentTime,
						next_jump_time: newNextJumpTime,
						game_hours: newHours,
						game_days: newDays,
						next_ftl_transition: newFtlTransition,
						ftl_status: newFtlStatus,
					};
				});
			}
		}, 1000); // Run every second

		return () => clearInterval(gameTimer);
	}, [destinyStatus?.id]); // Only depend on destinyStatus.id to avoid recreating timer

	// Update destiny status with partial updates
	const updateDestinyStatus = (updates: Partial<DestinyStatus>) => {
		setDestinyStatus(prev => prev ? { ...prev, ...updates } : null);
	};

	// Character management functions
	const addCharacter = (character: Character) => {
		setCharacters(prev => [...prev, character]);
	};

	const updateCharacter = (id: string, updates: Partial<Character>) => {
		setCharacters(prev =>
			prev.map(char => char.id === id ? { ...char, ...updates } : char),
		);
	};

	const removeCharacter = (id: string) => {
		setCharacters(prev => prev.filter(char => char.id !== id));
	};

	// Technology management
	const addTechnology = (techId: string) => {
		setTechnologies(prev => prev.includes(techId) ? prev : [...prev, techId]);
	};

	// Exploration management
	const addExploredRoom = (roomId: string) => {
		setExploredRooms(prev => prev.includes(roomId) ? prev : [...prev, roomId]);
	};

	// Door state management
	const updateDoorState = (doorId: string, updates: Partial<DoorTemplate>) => {
		setDoorStates(prev =>
			prev.map(door => door.id === doorId ? { ...door, ...updates } : door),
		);
	};

	// FTL State Management
	const startFTLJump = (hours: number) => {
		if (!destinyStatus) return;

		const jumpTimeInSeconds = hours * 3600; // Convert hours to seconds
		const nextJumpTime = destinyStatus.current_time + jumpTimeInSeconds;

		updateDestinyStatus({
			ftl_status: 'ftl',
			next_jump_time: nextJumpTime,
			next_ftl_transition: hours, // Update legacy field
		});
		toast.info(`Jumping to hyperspace! Exit in ${hours} hours.`);
	};

	const exitFTL = () => {
		updateDestinyStatus({
			ftl_status: 'normal_space',
			next_jump_time: 0,
			next_ftl_transition: 0,
		});
		toast.success('Dropped out of hyperspace. Now in normal space.');
	};

	// Time Control
	const setTimeSpeed = (speed: number) => {
		updateDestinyStatus({
			time_speed: Math.max(0, speed), // Ensure non-negative speed
		});
		toast.info(`Time speed set to ${speed}x (${speed} seconds per second)`);
	};

	// Game persistence
	const saveGame = async (newGameName?: string) => {
		if (!gameId || !destinyStatus) return;

		setIsLoading(true);
		try {
			const gameData = {
				destinyStatus,
				characters,
				technologies,
				exploredRooms,
				playerPosition,
				doorStates,
				explorationProgress,
				currentGalaxy,
				currentSystem,
				knownGalaxies,
				knownSystems,
			};

			console.log('[GAME-STATE] Preparing to save game data:', {
				gameId,
				hasDestinyStatus: !!destinyStatus,
				playerPosition,
				doorStatesCount: doorStates.length,
				charactersCount: characters.length,
				technologiesCount: technologies.length,
				exploredRoomsCount: exploredRooms.length,
				gameDataSize: JSON.stringify(gameData).length,
			});

			let backendSaveSuccessful = false;

			// Try to save to backend first (only for server-saved games, not local-only games)
			// Also check if user is authenticated and token is not expired
			if (!gameId.startsWith('local-') && auth.isAuthenticated && !auth.isTokenExpired) {
				try {
					await SavedGameService.updateSavedGame(gameId, {
						name: newGameName || gameName || 'Unnamed Game',
						game_data: JSON.stringify(gameData),
					});
					backendSaveSuccessful = true;
					console.log('[GAME-STATE] Game saved to backend successfully:', gameId);
				} catch (backendError) {
					console.warn('[GAME-STATE] Backend save failed, saving locally only:', backendError);
				}
			} else if (!gameId.startsWith('local-') && (!auth.isAuthenticated || auth.isTokenExpired)) {
				console.warn('[GAME-STATE] Cannot save to backend - user not authenticated or token expired');
			}

			// Update local state if name changed
			if (newGameName && newGameName !== gameName) {
				setGameName(newGameName);
				localStorage.setItem('stargate-current-game-name', newGameName);
			}

			// Always save to local storage as backup (or primary for local games)
			localStorage.setItem(`stargate-game-${gameId}`, JSON.stringify(gameData));

			const displayName = newGameName || gameName || 'Game';

			if (gameId.startsWith('local-')) {
				toast.success(`"${displayName}" saved locally`);
				console.log('[GAME-STATE] Local game saved:', gameId, 'name:', displayName);
			} else if (backendSaveSuccessful) {
				toast.success(`"${displayName}" saved to server`);
				console.log('[GAME-STATE] Game saved to server:', gameId, 'name:', displayName);
			} else if (!auth.isAuthenticated || auth.isTokenExpired) {
				toast.warning(`"${displayName}" saved locally only (please sign in to save to server)`);
				console.log('[GAME-STATE] Game saved locally only - authentication required:', gameId, 'name:', displayName);
			} else {
				toast.warning(`"${displayName}" saved locally only (server unavailable)`);
				console.log('[GAME-STATE] Game saved locally only:', gameId, 'name:', displayName);
			}
		} catch (error) {
			console.error('Failed to save game:', error);
			toast.error('Failed to save game');
		} finally {
			setIsLoading(false);
		}
	};

	const loadGame = async (newGameId: string) => {
		setIsLoading(true);
		try {
			// Check authentication status
			if (!auth.isAuthenticated || auth.isTokenExpired) {
				console.warn('[GAME-STATE] User not authenticated or token expired');
				toast.error('Please sign in to load saved games');
				throw new Error('Authentication required to load saved games');
			}

			const savedGame = await SavedGameService.getSavedGame(newGameId);
			console.log('[GAME-STATE] Loaded saved game from backend:', {
				gameId: newGameId,
				gameName: savedGame.name,
				gameDataLength: savedGame.game_data?.length || 0,
				gameDataPreview: savedGame.game_data?.substring(0, 200) + '...',
			});
			const gameData = JSON.parse(savedGame.game_data);

			setDestinyStatus(gameData.destinyStatus);
			setCharacters(gameData.characters || []);
			setTechnologies(gameData.technologies || []);
			setExploredRooms(gameData.exploredRooms || []);
			setPlayerPosition(gameData.playerPosition || { x: 0, y: 0, roomId: 'destiny-bridge' });
			setDoorStates(gameData.doorStates || []);
			setExplorationProgress(gameData.explorationProgress || []);
			setCurrentGalaxy(gameData.currentGalaxy || null);
			setCurrentSystem(gameData.currentSystem || null);
			setKnownGalaxies(gameData.knownGalaxies || []);
			setKnownSystems(gameData.knownSystems || []);
			setGameId(newGameId);
			setGameName(savedGame.name);
			setIsInitialized(true);

			// Save to local storage as backup
			localStorage.setItem('stargate-current-game-id', newGameId);
			localStorage.setItem('stargate-current-game-name', savedGame.name);
			localStorage.setItem(`stargate-game-${newGameId}`, savedGame.game_data);

			console.log('[GAME-STATE] Loaded game from backend:', newGameId, 'name:', savedGame.name);
			toast.success(`"${savedGame.name}" loaded successfully`);
		} catch (error) {
			console.error('Failed to load game from backend:', error);
			// Don't fallback to local storage - require authentication
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	// Initialize game state on first load
	useEffect(() => {
		// Only try to auto-load if user is authenticated
		if (auth.isAuthenticated && !auth.isTokenExpired) {
			const currentGameId = localStorage.getItem('stargate-current-game-id');
			if (currentGameId) {
				// Load existing game
				loadGame(currentGameId).catch(() => {
					// If loading fails, don't auto-create a new game
					console.log('[GAME-STATE] Failed to load existing game, waiting for user action');
				});
			}
		} else {
			console.log('[GAME-STATE] User not authenticated, clearing stored game session');
			// Clear stored game session when not authenticated
			localStorage.removeItem('stargate-current-game-id');
			localStorage.removeItem('stargate-current-game-name');
			// Reset game state to uninitialized
			setGameId(null);
			setGameName(null);
			setIsInitialized(false);
			setDestinyStatus(null);
			setCharacters([]);
			setTechnologies([]);
			setExploredRooms([]);
			setPlayerPosition(null);
			setDoorStates([]);
			setExplorationProgress([]);
			setCurrentGalaxy(null);
			setCurrentSystem(null);
			setKnownGalaxies([]);
			setKnownSystems([]);
		}
		// Don't auto-initialize new game - wait for user to click "Start New Game"
	}, [auth.isAuthenticated, auth.isTokenExpired]); // Depend on auth state

	// Auto-save every 15 minutes when game is active
	useEffect(() => {
		if (!gameId || !destinyStatus) return;

		const autoSaveInterval = setInterval(() => {
			console.log('[GAME-STATE] Auto-saving game...');
			saveGame().catch(error => {
				console.error('[GAME-STATE] Auto-save failed:', error);
				// Don't show toast for auto-save failures to avoid spam
			});
		}, 15 * 60 * 1000); // 15 minutes in milliseconds

		return () => clearInterval(autoSaveInterval);
	}, [gameId, destinyStatus]);

	return (
		<GameStateContext.Provider value={{
			gameId,
			setGameId,
			gameName,
			setGameName,
			destinyStatus,
			setDestinyStatus,
			updateDestinyStatus,
			characters,
			setCharacters,
			addCharacter,
			updateCharacter,
			removeCharacter,
			playerPosition,
			setPlayerPosition,
			doorStates,
			setDoorStates,
			updateDoorState,
			technologies,
			setTechnologies,
			addTechnology,
			exploredRooms,
			setExploredRooms,
			addExploredRoom,
			explorationProgress,
			setExplorationProgress,
			currentGalaxy,
			setCurrentGalaxy,
			currentSystem,
			setCurrentSystem,
			knownGalaxies,
			setKnownGalaxies,
			knownSystems,
			setKnownSystems,
			startFTLJump,
			exitFTL,
			setTimeSpeed,
			initializeNewGame,
			saveGame,
			loadGame,
			isLoading,
			isInitialized,
		}}>
			{children}
		</GameStateContext.Provider>
	);
};

export const useGameState = () => {
	const context = useContext(GameStateContext);
	if (context === undefined) {
		throw new Error('useGameState must be used within a GameStateProvider');
	}
	return context;
};
