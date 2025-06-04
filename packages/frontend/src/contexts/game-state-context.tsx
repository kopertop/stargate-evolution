import { useQuery } from '@livestore/react';
import { RoomTemplate } from '@stargate/common/models/room-template';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';
import { toast } from 'react-toastify';

import { useGameService } from '../services/game-service';
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
	game_id: string;
	children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ game_id, children }) => {
	// Start at normal speed
	const [timeSpeed, setTimeSpeed] = useState(1);
	const [gameTime, setGameTime] = useState(0);

	const gameService = useGameService();

	// Query the game and rooms using LiveStore
	const game = useQuery(gameService.queries.gameById(game_id))[0];
	const rooms = useQuery(gameService.queries.roomsByGame(game_id));

	// Initialize game time from the game data
	useEffect(() => {
		if (game) {
			setGameTime(game.total_time_progressed || 0);
		}
	}, [game]);

	/**
	 * Handle technology discovery when a room is fully explored
	 */
	const handleTechnologyDiscovery = async (room: typeof rooms[number], game_id: string) => {
		try {
			console.log(`🔬 Checking for technology in room ${room.template_id}...`);

			// Fetch room technology from backend templates
			const roomTechnology = await ApiService.getRoomTechnology(room.template_id || room.type);

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
				if (room.exploration_data && !room.explored) {
					exploringRoomsCount++;
					try {
						const exploration = JSON.parse(room.exploration_data);

						// Convert game time (seconds) to hours for calculation
						const timeElapsed = (currentGameTime - exploration.startTime) / 3600;
						const newProgress = Math.min(100, (timeElapsed / exploration.timeToComplete) * 100);
						const newTimeRemaining = Math.max(0, exploration.timeToComplete - timeElapsed);

						if (newProgress >= 100) {
							// Exploration complete - mark room as explored and free crew
							console.log(`🎉 Exploration of ${room.type} (${room.id}) completed!`);

							// Get crew members to free up
							const crewAssigned = exploration.crewAssigned || exploration.crew_assigned || [];

							// Free crew members from this room
							for (const crewId of crewAssigned) {
								gameService.assignCrewToRoom(crewId, null);
							}

							// Mark room as explored and clear exploration data
							gameService.updateRoom(room.id, {
								explored: true,
								exploration_data: '',
							});

							// Complete the exploration using LiveStore events
							gameService.completeRoomExploration(room.id, []);

							// Add discovered items
							if (room.layout_id) {
								try {
									const inventoryItems = await gameService.getTechnologyForRoom(room.type);
									if (inventoryItems && inventoryItems.length > 0) {
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
								} catch (error) {
									console.log(`No technology found for room type ${room.type}, continuing...`);
								}
							}

							// Handle technology discovery
							await handleTechnologyDiscovery(room, game_id);
						} else if (Math.abs(newProgress - exploration.progress) > 0.1) {
							// Update progress - only if exploration is not complete
							const updatedExploration = {
								...exploration,
								progress: newProgress,
								time_remaining: newTimeRemaining,
								timeRemaining: newTimeRemaining, // camelCase version for backward compatibility
							};

							// Update the room with new progress
							gameService.updateRoom(room.id, {
								exploration_data: JSON.stringify(updatedExploration),
							});
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
