import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { DestinyStatus } from '@stargate/common';
import { Character } from '@stargate/common';

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
	
	// Technology & Discoveries
	technologies: string[]; // Array of discovered technology IDs
	setTechnologies: (technologies: string[]) => void;
	addTechnology: (techId: string) => void;
	
	// Exploration Progress
	exploredRooms: string[]; // Array of explored room IDs
	setExploredRooms: (rooms: string[]) => void;
	addExploredRoom: (roomId: string) => void;
	
	// Game State Actions
	saveGame: () => Promise<void>;
	loadGame: (gameId: string) => Promise<void>;
	isLoading: boolean;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [gameId, setGameId] = useState<string | null>(null);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatus | null>(null);
	const [characters, setCharacters] = useState<Character[]>([]);
	const [technologies, setTechnologies] = useState<string[]>([]);
	const [exploredRooms, setExploredRooms] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

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
			prev.map(char => char.id === id ? { ...char, ...updates } : char)
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

	// Game persistence
	const saveGame = async () => {
		if (!gameId || !destinyStatus) return;
		
		setIsLoading(true);
		try {
			// TODO: Implement API call to save game state
			const gameData = {
				destinyStatus,
				characters,
				technologies,
				exploredRooms
			};
			localStorage.setItem(`stargate-game-${gameId}`, JSON.stringify(gameData));
			toast.success('Game saved successfully');
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
			// TODO: Implement API call to load game state
			const savedData = localStorage.getItem(`stargate-game-${newGameId}`);
			if (savedData) {
				const gameData = JSON.parse(savedData);
				setDestinyStatus(gameData.destinyStatus);
				setCharacters(gameData.characters || []);
				setTechnologies(gameData.technologies || []);
				setExploredRooms(gameData.exploredRooms || []);
			}
			setGameId(newGameId);
			toast.success('Game loaded successfully');
		} catch (error) {
			console.error('Failed to load game:', error);
			toast.error('Failed to load game');
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-save every 30 seconds when game is active
	useEffect(() => {
		if (!gameId || !destinyStatus) return;
		
		const autoSaveInterval = setInterval(() => {
			saveGame();
		}, 30000);

		return () => clearInterval(autoSaveInterval);
	}, [gameId, destinyStatus]);

	return (
		<GameStateContext.Provider value={{
			gameId,
			setGameId,
			destinyStatus,
			setDestinyStatus,
			updateDestinyStatus,
			characters,
			setCharacters,
			addCharacter,
			updateCharacter,
			removeCharacter,
			technologies,
			setTechnologies,
			addTechnology,
			exploredRooms,
			setExploredRooms,
			addExploredRoom,
			saveGame,
			loadGame,
			isLoading,
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
