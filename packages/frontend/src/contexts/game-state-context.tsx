import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Simple game state context without LiveStore - Admin-focused
// This context is kept minimal since we're focusing on Admin functionality

interface GameStateContextType {
	// Placeholder context - most game functionality removed since we're focusing on Admin
	// If game functionality is needed later, it should use direct API calls instead of LiveStore
	gameId: string | null;
	setGameId: (id: string | null) => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [gameId, setGameId] = useState<string | null>(null);

	return (
		<GameStateContext.Provider value={{
			gameId,
			setGameId,
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
