import DB, { gameService } from '@stargate/db/index';
import Game from '@stargate/db/models/game';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

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

		DB.get<Game>('games').find(gameId).then((g) => {
			setGame(g);
			setGameTime(g.totalTimeProgressed);
		});
	}, [gameId]);

	useEffect(() => {
		if (game && timeSpeed > 0) {
			const interval = setInterval(async () => {
				setGameTime((prev) => {
					const t = prev + timeSpeed;

					// Update game time in database
					DB.write(async () => {
						await game.update((record) => {
							record.totalTimeProgressed = t;
							record.lastPlayed = new Date();
						});
					});

					// Update exploration progress for all ongoing explorations
					updateExplorationProgress(game.id, t);

					return t;
				});
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [game, timeSpeed]);

	// Handle exploration progress updates in the game loop
	const updateExplorationProgress = async (gameId: string, currentGameTime: number) => {
		try {
			// Get all rooms with ongoing exploration
			const rooms = await gameService.getRoomsByGame(gameId);

			for (const room of rooms) {
				if (room.explorationData) {
					try {
						const exploration = JSON.parse(room.explorationData);
						const timeElapsed = (currentGameTime - exploration.startTime) / 1000 / 3600; // Convert to hours
						const newProgress = Math.min(100, (timeElapsed / exploration.timeRemaining) * 100);

						if (newProgress >= 100) {
							// Exploration complete - mark room as explored and free crew
							await gameService.updateRoom(room.id, { explored: true });

							// Free up assigned crew
							for (const crewId of exploration.crewAssigned) {
								await gameService.assignCrewToRoom(crewId, null);
							}

							// Clear exploration progress
							await gameService.clearExplorationProgress(room.id);

							console.log(`🎉 Exploration of room ${room.id} completed!`);
						} else if (Math.abs(newProgress - exploration.progress) > 0.1) {
							// Update progress in database (only if significant change)
							const updatedExploration = { ...exploration, progress: newProgress };
							await gameService.updateRoom(room.id, { explorationData: JSON.stringify(updatedExploration) });
						}
					} catch (error) {
						console.error(`Failed to parse exploration data for room ${room.id}:`, error);
					}
				}
			}
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
