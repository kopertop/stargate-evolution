// TODO: Migrate all DB logic to LiveStore (dbPromise from src/db.ts)
import type { Game, Room } from '@stargate/db';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

import { ExplorationProgress } from '../types/model-types';

interface GameStateContextType {
	isPaused: boolean;
	timeSpeed: number;
	gameTime: number;
	game: Game | null;
	togglePause: () => void;
	setTimeSpeed: (speed: number) => void;
	resumeGame: () => void;
	pauseGame: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

interface GameStateProviderProps {
	gameId?: string;
	children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ gameId, children }) => {
	// Start at normal speed
	const [timeSpeed, setTimeSpeed] = useState(1);
	const [gameTime, setGameTime] = useState(0);
	const [game, setGame] = useState<Game | null>(null);

	useEffect(() => {
		if (!gameId) {
			return;
		}

		// TODO: Replace with LiveStore logic
		// dbPromise.get<Game>('games').find(gameId).then((g) => {
		// 	setGame(g);
		// 	setGameTime(g.totalTimeProgressed);
		// });
	}, [gameId]);


	/**
	 * Main Game Loop
	 */
	useEffect(() => {
		if (game && timeSpeed > 0) {
			const interval = setInterval(async () => {
				// GameTick: Update game time
				const newTime = await new Promise<number>((resolve) => {
					setGameTime((prev) => {
						const t = prev + timeSpeed;
						resolve(t);
						return t;
					});
				});

				// Update game time and exploration progress in a single DB transaction
				try {
					// TODO: Replace with LiveStore logic
					// await dbPromise.write(async () => {
					// 	// Update game time
					// 	await game.update((record) => {
					// 		record.totalTimeProgressed = newTime;
					// 		record.lastPlayed = new Date();
					// 	});
					// });

					// Update exploration progress for all ongoing explorations
					await updateExplorationProgressInTransaction(newTime);
				} catch (error) {
					console.error('Error in game loop:', error);
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [game, timeSpeed]);

	// Handle exploration progress updates within an existing DB transaction
	const updateExplorationProgressInTransaction = async (currentGameTime: number) => {
		if (!gameId) {
			return;
		}

		try {
			// TODO: Replace with LiveStore logic
			// let exploringRoomsCount = 0;
			// ...rest of the logic referencing 'rooms' should be migrated to LiveStore
		} catch (error) {
			console.error('Failed to update exploration progress:', error);
		}
	};

	const togglePause = useCallback(() => {
		setTimeSpeed(prev => prev === 1 ? 0 : 1);
	}, []);

	const resumeGame = useCallback(() => {
		setTimeSpeed(1);
	}, []);

	const pauseGame = useCallback(() => {
		setTimeSpeed(0);
	}, []);

	const handleSetTimeSpeed = useCallback((speed: number) => {
		setTimeSpeed(speed);
	}, []);

	const value: GameStateContextType = {
		isPaused: timeSpeed === 0,
		gameTime,
		game,
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
