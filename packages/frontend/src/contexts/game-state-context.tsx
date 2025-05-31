import { useQuery } from '@livestore/react';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';
import { toast } from 'react-toastify';

import { useGameService } from '../services/use-game-service';
import { ApiService } from '../utils/api-service';

interface GameStateContextType {
	isPaused: boolean;
	timeSpeed: number;
	gameTime: number;
	game: any | null;
	togglePause: () => void;
	setTimeSpeed: (speed: number) => void;
	resumeGame: () => void;
	pauseGame: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

interface GameStateProviderProps {
	game_id?: string;
	children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ game_id, children }) => {
	// Start at normal speed
	const [timeSpeed, setTimeSpeed] = useState(1);
	const [gameTime, setGameTime] = useState(0);

	const gameService = useGameService();

	// Query the game and rooms using LiveStore
	const gameQuery = useQuery(game_id ? gameService.queries.gameById(game_id) : gameService.queries.allGames());
	const roomsQuery = useQuery(game_id ? gameService.queries.roomsByGame(game_id) : gameService.queries.roomsByGame(''));

	const game = game_id && gameQuery ? gameQuery.find((g) => g.id === game_id) : null;
	const rooms = game_id ? (roomsQuery || []) : [];

	// Initialize game time from the game data
	useEffect(() => {
		if (game) {
			setGameTime(game.total_time_progressed || 0);
		}
	}, [game]);

	/**
	 * Handle technology discovery when a room is fully explored
	 */
	const handleTechnologyDiscovery = async (roomId: string, game_id: string) => {
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

					// Discover the technology using LiveStore
					gameService.unlockTechnology(roomTech.technology_template_id, game_id);

					gameService.addInventoryItem({
						game_id,
						resource_type: roomTech.technology_template_id,
						amount: roomTech.count,
						location: roomTech.room_id,
						description: roomTech.description,
					});
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
				setGameTime((prev) => {
					const newTime = prev + timeSpeed;
					if (game_id) {
						updateExplorationProgress(newTime);
						gameService.updateGame(game_id, { total_time_progressed: newTime });
					}
					return newTime;
				});

			}, 1000);
			return () => clearInterval(interval);
		}
	}, [game, timeSpeed, game_id, rooms]);

	// Handle exploration progress updates
	const updateExplorationProgress = async (currentGameTime: number) => {
		if (!game_id) {
			return;
		}

		try {
			// Use the rooms from the hook query
			let exploringRoomsCount = 0;

			for (const room of rooms) {
				if (room.exploration_data) {
					exploringRoomsCount++;
					try {
						const exploration = JSON.parse(room.exploration_data);

						// Convert game time (seconds) to hours for calculation
						const timeElapsed = (currentGameTime - exploration.startTime) / 3600;
						const newProgress = Math.min(100, (timeElapsed / exploration.timeToComplete) * 100);
						const newTimeRemaining = exploration.timeToComplete - timeElapsed;

						if (newProgress >= 100) {
							// Exploration complete - mark room as explored and free crew
							console.log(`🎉 Exploration of ${room.type} (${room.id}) completed!`);

							// Complete the exploration using LiveStore events
							gameService.completeRoomExploration(room.id, []);
							// Add discovered items
							if (room.layout_id) {
								const inventoryItems = await gameService.getTechnologyForRoom(room.template_id);
								if (inventoryItems) {
									for (const item of inventoryItems) {
										gameService.addInventoryItem({
											game_id,
											resource_type: item.technology_template_id,
											amount: item.count,
											location: room.id,
											description: item.description,
										});
									}
								}
							}

							// Handle technology discovery
							await handleTechnologyDiscovery(room.id, game_id);
						} else if (Math.abs(newProgress - exploration.progress) > 0.1) {
							// Update progress - for now we'll skip frequent updates to avoid too many events
							// In a real implementation, you might want to batch these or use a different approach
						}
					} catch (error) {
						console.error(`Failed to parse exploration data for room ${room.id}:`, error);
					}
				}
			}

			// Debug log every 10 seconds
			if (Math.floor(currentGameTime) % 10 === 0) {
				console.log(`🔍 Game Loop: ${exploringRoomsCount} rooms currently being explored`, {
					currentGameTime,
				});
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
