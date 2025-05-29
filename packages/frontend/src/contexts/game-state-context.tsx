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
import { toast } from 'react-toastify';

import { ExplorationProgress } from '../types/model-types';
import { ApiService } from '../utils/api-service';

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

	/**
	 * Handle technology discovery when a room is fully explored
	 */
	const handleTechnologyDiscovery = async (roomId: string, gameId: string) => {
		try {
			console.log(`🔬 Checking for technology in room ${roomId}...`);

			// Fetch room technology from backend templates
			const roomTechnology = await ApiService.getRoomTechnology(roomId);

			if (roomTechnology.length === 0) {
				console.log('No technology found in this room');
				return;
			}

			// Process each piece of technology found
			for (const roomTech of roomTechnology) {
				try {
					// Get the technology template details
					const techTemplate = await ApiService.getTechnologyTemplate(roomTech.technology_template_id);

					// Discover the technology in the local database
					await gameService.discoverTechnology(
						gameId,
						roomTech.technology_template_id,
						roomTech.count,
						roomTech.description || techTemplate.description,
					);

					// Update inventory resources based on technology type
					const resourceUpdates: Record<string, number> = {};

					// Map technology to inventory resources
					switch (roomTech.technology_template_id) {
					case 'kino':
						resourceUpdates['kino'] = roomTech.count;
						break;
					case 'kino_remote':
						resourceUpdates['kino_remote'] = roomTech.count;
						break;
					case 'stargate_device':
						// Stargate doesn't go in inventory, it's a ship feature
						break;
					case 'kino_systems':
						resourceUpdates['kino_systems'] = roomTech.count;
						break;
					default:
						// Generic ancient tech
						resourceUpdates['ancient_tech'] = roomTech.count;
						break;
					}

					// Update the Destiny inventory if we have resources to add
					if (Object.keys(resourceUpdates).length > 0) {
						await gameService.updateInventoryResources(gameId, resourceUpdates);
					}

					// Show discovery notification
					const countText = roomTech.count > 1 ? ` (×${roomTech.count})` : '';
					toast.success(`🔬 Technology Discovered: ${techTemplate.name}${countText}`, {
						position: 'top-center',
						autoClose: 4000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
					});

					console.log(`✅ Discovered: ${techTemplate.name} (×${roomTech.count})`);
				} catch (error) {
					console.error(`Failed to process technology ${roomTech.technology_template_id}:`, error);
				}
			}
		} catch (error) {
			console.error('Failed to handle technology discovery:', error);
		}
	};

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
					await DB.write(async () => {
						// Update game time
						await game.update((record) => {
							record.totalTimeProgressed = newTime;
							record.lastPlayed = new Date();
						});
					});

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
			// Get all rooms with ongoing exploration
			const rooms = await gameService.getRoomsByGame(gameId);
			let exploringRoomsCount = 0;

			for (const room of rooms) {
				if (room.explorationData) {
					exploringRoomsCount++;
					try {
						const exploration = JSON.parse(room.explorationData) as ExplorationProgress;

						// Convert game time (seconds) to hours for calculation
						const timeElapsed = (currentGameTime - exploration.startTime) / 3600; // currentGameTime is in seconds
						const newProgress = Math.min(100, (timeElapsed / exploration.timeToComplete) * 100);
						const newTimeRemaining = exploration.timeToComplete - timeElapsed;

						if (newProgress >= 100) {
							// Exploration complete - mark room as explored and free crew
							console.log(`🎉 Exploration of ${room.type} (${room.id}) completed!`);

							// These operations are now within the existing DB.write transaction
							await gameService.updateRoom(room.id, { explored: true });

							// Free up assigned crew
							for (const crewId of exploration.crewAssigned) {
								await gameService.assignCrewToRoom(crewId, null);
							}

							// Clear exploration progress
							await gameService.clearExplorationProgress(room.id);

							// Handle technology discovery
							await handleTechnologyDiscovery(room.id, gameId);
						} else if (Math.abs(newProgress - exploration.progress) > 0.1) {
							// Update progress in database (only if significant change)
							const updatedExploration = {
								...exploration,
								progress: newProgress,
								timeRemaining: newTimeRemaining,
							};

							// This operation is now within the existing DB.write transaction
							await gameService.updateRoom(room.id, { explorationData: JSON.stringify(updatedExploration) });
						}
					} catch (error) {
						console.error(`Failed to parse exploration data for room ${room.id}:`, error);
					}
				}
			}

			// Debug log every 10 seconds
			if (Math.floor(currentGameTime) % 10 === 0) {
				console.log(`🔍 Game Loop: ${exploringRoomsCount} rooms currently being explored`);
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
