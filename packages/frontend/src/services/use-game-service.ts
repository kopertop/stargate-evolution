import { useStore } from '@livestore/react';

import {
	gameById$,
	allGames$,
	roomsByGameId$,
	destinyStatusByGameId$,
	peopleByGameId$,
	inventoryByGameId$,
	galaxiesByGameId$,
	starSystemsByGameId$,
} from '../livestore/queries';
import { events } from '../livestore/schema';

export const useGameService = () => {
	const { store } = useStore();

	const createNewGame = async (name: string = 'New Stargate Game'): Promise<string> => {
		const gameId = crypto.randomUUID();
		const now = new Date();

		// Create the game record
		store.commit(
			events.gameCreated({
				id: gameId,
				name,
				createdAt: now,
			}),
		);

		// Create basic galaxy structure
		const milkyWayId = crypto.randomUUID();
		const jadesGalaxyId = crypto.randomUUID();

		store.commit(
			events.galaxyCreated({
				id: milkyWayId,
				gameId: gameId,
				name: 'Milky Way',
				x: 0,
				y: 0,
				createdAt: now,
			}),
		);

		store.commit(
			events.galaxyCreated({
				id: jadesGalaxyId,
				gameId: gameId,
				name: 'JADES-GS-z14-0',
				x: 1000,
				y: 0,
				createdAt: now,
			}),
		);

		// Create star systems
		const solSystemId = crypto.randomUUID();
		const icarusSystemId = crypto.randomUUID();
		const destinySystemId = crypto.randomUUID();

		store.commit(
			events.starSystemCreated({
				id: solSystemId,
				gameId: gameId,
				galaxyId: milkyWayId,
				name: 'Sol System',
				x: 0,
				y: 0,
				description: 'The home system of Earth.',
				createdAt: now,
			}),
		);

		store.commit(
			events.starSystemCreated({
				id: icarusSystemId,
				gameId: gameId,
				galaxyId: milkyWayId,
				name: 'Icarus System',
				x: 100,
				y: 200,
				description: 'Remote system with Icarus planet.',
				createdAt: now,
			}),
		);

		store.commit(
			events.starSystemCreated({
				id: destinySystemId,
				gameId: gameId,
				galaxyId: jadesGalaxyId,
				name: 'Destiny System',
				x: 500,
				y: 500,
				description: 'System where Destiny is found.',
				createdAt: now,
			}),
		);

		// Create basic races
		const ancientsRaceId = crypto.randomUUID();
		const humansRaceId = crypto.randomUUID();

		store.commit(
			events.raceCreated({
				id: ancientsRaceId,
				gameId: gameId,
				name: 'Ancients',
				technology: '{"advanced_energy": true, "stargate_network": true, "ancient_database": true}',
				ships: '{"destiny": true, "puddle_jumpers": true}',
				createdAt: now,
			}),
		);

		store.commit(
			events.raceCreated({
				id: humansRaceId,
				gameId: gameId,
				name: 'Humans',
				technology: '{"earth_tech": true, "basic_weapons": true}',
				ships: '{"earth_ships": true}',
				createdAt: now,
			}),
		);

		// Create some basic crew members
		const crewMembers = [
			{ name: 'Colonel Everett Young', role: 'Commander' },
			{ name: 'Dr. Nicholas Rush', role: 'Scientist' },
			{ name: 'Chloe Armstrong', role: 'Civilian' },
			{ name: 'Eli Wallace', role: 'Technician' },
			{ name: 'MSgt. Ronald Greer', role: 'Military' },
		];

		for (const member of crewMembers) {
			store.commit(
				events.personCreated({
					id: crypto.randomUUID(),
					gameId: gameId,
					raceId: humansRaceId,
					name: member.name,
					role: member.role,
					location: '{"shipId": "destiny"}',
					skills: '{"leadership": 5, "science": 3}',
					conditions: '[]',
					createdAt: now,
				}),
			);
		}

		// Create basic ship rooms
		const basicRooms = [
			{ type: 'bridge', floor: 1, gridX: 5, gridY: 5 },
			{ type: 'control_room', floor: 1, gridX: 6, gridY: 5 },
			{ type: 'crew_quarters', floor: 2, gridX: 4, gridY: 3 },
			{ type: 'mess_hall', floor: 2, gridX: 5, gridY: 3 },
			{ type: 'hydroponics', floor: 3, gridX: 3, gridY: 4 },
		];

		for (const room of basicRooms) {
			store.commit(
				events.roomCreated({
					id: crypto.randomUUID(),
					gameId: gameId,
					type: room.type,
					floor: room.floor,
					gridX: room.gridX,
					gridY: room.gridY,
					gridWidth: 1,
					gridHeight: 1,
					technology: '[]',
					found: true,
					locked: false,
					explored: room.type === 'bridge', // Bridge starts explored
					status: 'ok',
					connectedRooms: '[]',
					doors: '[]',
					createdAt: now,
				}),
			);
		}

		// Create initial destiny status
		store.commit(
			events.destinyStatusCreated({
				id: gameId, // Use gameId as the destiny status ID
				gameId: gameId,
				name: 'Destiny',
				power: 800,
				maxPower: 1000,
				shields: 400,
				maxShields: 500,
				hull: 900,
				maxHull: 1000,
				raceId: ancientsRaceId,
				crew: '[]',
				location: `{"systemId": "${destinySystemId}"}`,
				shield: '{"strength": 400, "max": 500, "coverage": 80}',
				crewStatus: '{"onboard": 12, "capacity": 100, "manifest": []}',
				atmosphere: '{"co2": 0.04, "o2": 20.9, "co2Scrubbers": 1}',
				weapons: '{"mainGun": false, "turrets": {"total": 12, "working": 6}}',
				shuttles: '{"total": 2, "working": 1, "damaged": 1}',
				notes: '["Ship systems coming online. Crew exploring available sections."]',
				gameDays: 1,
				gameHours: 0,
				ftlStatus: 'ftl',
				nextFtlTransition: 6 + Math.random() * 42,
				createdAt: now,
			}),
		);

		// Add initial inventory
		const initialInventory = [
			{ resourceType: 'food', amount: 50, location: 'ship', description: 'Emergency food supplies' },
			{ resourceType: 'water', amount: 100, location: 'ship', description: 'Water reserves' },
			{ resourceType: 'parts', amount: 10, location: 'ship', description: 'Spare parts' },
			{ resourceType: 'medicine', amount: 5, location: 'ship', description: 'Medical supplies' },
			{ resourceType: 'ancient_tech', amount: 2, location: 'ship', description: 'Ancient technology' },
		];

		for (const item of initialInventory) {
			store.commit(
				events.inventoryAdded({
					id: crypto.randomUUID(),
					gameId: gameId,
					resourceType: item.resourceType,
					amount: item.amount,
					location: item.location,
					description: item.description,
					createdAt: now,
				}),
			);
		}

		return gameId;
	};

	const updateGame = (gameId: string, updates: { name?: string; totalTimeProgressed?: number }) => {
		store.commit(
			events.gameUpdated({
				id: gameId,
				...updates,
				...(updates.totalTimeProgressed !== undefined && {
					lastPlayed: new Date(),
				}),
			}),
		);
	};

	const deleteGame = (gameId: string) => {
		store.commit(
			events.gameDeleted({
				id: gameId,
				deletedAt: new Date(),
			}),
		);
	};

	const updateDestinyStatus = (gameId: string, updates: {
		power?: number;
		shields?: number;
		hull?: number;
		gameDays?: number;
		gameHours?: number;
		ftlStatus?: string;
	}) => {
		store.commit(
			events.destinyStatusUpdated({
				gameId,
				...updates,
			}),
		);
	};

	const addInventoryItem = (gameId: string, resourceType: string, amount: number, location?: string, description?: string) => {
		store.commit(
			events.inventoryAdded({
				id: crypto.randomUUID(),
				gameId,
				resourceType,
				amount,
				location,
				description,
				createdAt: new Date(),
			}),
		);
	};

	const updateInventoryItem = (id: string, updates: {
		amount?: number;
		location?: string;
		description?: string;
	}) => {
		store.commit(
			events.inventoryUpdated({
				id,
				...updates,
			}),
		);
	};

	const removeInventoryItem = (id: string) => {
		store.commit(
			events.inventoryRemoved({ id }),
		);
	};

	const startRoomExploration = (roomId: string, crewAssigned: string[]) => {
		store.commit(
			events.roomExplorationStarted({
				roomId,
				crewAssigned,
				startTime: new Date(),
			}),
		);
	};

	const completeRoomExploration = (roomId: string, discovered: string[] = []) => {
		store.commit(
			events.roomExplorationCompleted({
				roomId,
				completedAt: new Date(),
				discovered,
			}),
		);
	};

	const unlockTechnology = (id: string, gameId: string) => {
		store.commit(
			events.technologyUnlocked({
				id,
				gameId,
				unlockedAt: new Date(),
			}),
		);
	};

	const updateRoom = (roomId: string, updates: Partial<{
		found: boolean;
		locked: boolean;
		explored: boolean;
		status: string;
		connectedRooms: string;
		doors: string;
		explorationData: string;
	}>) => {
		store.commit(
			events.roomUpdated({
				id: roomId,
				...updates,
				updatedAt: new Date(),
			}),
		);
	};

	const updateDoorState = (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		// Helper to update the doors property for a room
		const updateRoomDoors = (roomId: string, targetRoomId: string) => {
			// Fetch the current room from the store (not reactive, but for event emission)
			// In a real app, you might want to query the current state or pass in the current doors array
			// For now, we assume the UI has the latest state and can pass it in if needed
			// Here, we just emit the event with the new doors state
			// This is a placeholder for a more robust implementation
			store.commit(
				events.roomUpdated({
					id: roomId,
					// Only update the doors property; the reducer/materializer will merge
					// The UI should ensure the new state is correct
					updatedAt: new Date(),
				}),
			);
		};
		// Update both rooms' doors
		updateRoomDoors(fromRoomId, toRoomId);
		updateRoomDoors(toRoomId, fromRoomId);
	};

	// Query functions - these return the query objects for use with useQuery
	const queries = {
		allGames: () => allGames$,
		gameById: (gameId: string) => gameById$(gameId),
		roomsByGame: (gameId: string) => roomsByGameId$(gameId),
		destinyStatus: (gameId: string) => destinyStatusByGameId$(gameId),
		peopleByGame: (gameId: string) => peopleByGameId$(gameId),
		inventoryByGame: (gameId: string) => inventoryByGameId$(gameId),
		galaxiesByGame: (gameId: string) => galaxiesByGameId$(gameId),
		starSystemsByGame: (gameId: string) => starSystemsByGameId$(gameId),
	};

	return {
		// Actions
		createNewGame,
		updateGame,
		deleteGame,
		updateDestinyStatus,
		addInventoryItem,
		updateInventoryItem,
		removeInventoryItem,
		startRoomExploration,
		completeRoomExploration,
		unlockTechnology,
		updateRoom,
		updateDoorState,
		// Queries
		queries,
	};
};
