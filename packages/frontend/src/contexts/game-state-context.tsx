import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GameStateContextType {
	isPaused: boolean;
	timeSpeed: 'normal' | '60x' | '120x' | '3600x';
	togglePause: () => void;
	setTimeSpeed: (speed: 'normal' | '60x' | '120x' | '3600x') => void;
	resumeGame: () => void;
	pauseGame: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

interface GameStateProviderProps {
	children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ children }) => {
	const [isPaused, setIsPaused] = useState(true); // Start paused
	const [timeSpeed, setTimeSpeed] = useState<'normal' | '60x' | '120x' | '3600x'>('normal');

	const togglePause = useCallback(() => {
		setIsPaused(prev => !prev);
	}, []);

	const resumeGame = useCallback(() => {
		setIsPaused(false);
	}, []);

	const pauseGame = useCallback(() => {
		setIsPaused(true);
	}, []);

	const handleSetTimeSpeed = useCallback((speed: 'normal' | '60x' | '120x' | '3600x') => {
		setTimeSpeed(speed);
	}, []);

	const value: GameStateContextType = {
		isPaused,
		timeSpeed,
		togglePause,
		setTimeSpeed: handleSetTimeSpeed,
		resumeGame,
		pauseGame,
	};

	return (
		<GameStateContext.Provider value={value}>
			{children}
		</GameStateContext.Provider>
	);
};

export const useGameState = (): GameStateContextType => {
	const context = useContext(GameStateContext);
	if (context === undefined) {
		throw new Error('useGameState must be used within a GameStateProvider');
	}
	return context;
};
