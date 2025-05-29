import { useStore } from '@livestore/react';
import { RoomTechnology } from '@stargate/common/zod-templates';

import {
	gameById$,
	allGames$,
	roomsBygame_id$,
	destinyStatusBygame_id$,
	peopleBygame_id$,
	inventoryBygame_id$,
	galaxiesBygame_id$,
	starSystemsBygame_id$,
	roomById$,
} from '../livestore/queries';
import { events } from '../livestore/schema';

import apiService from './api-service';

export const useGameService = () => {
	const { store } = useStore();

	const createNewGame = async (name: string = 'New Stargate Game'): Promise<string> => {
		const game_id = crypto.randomUUID();
		const now = new Date();

		// Fetch templates from backend
		const [
			roomTemplates,
			personTemplates,
			raceTemplates,
			shipLayout,
			galaxyTemplates,
			starSystemTemplates,
			destinyStatusTemplate,
			startingInventory,
		] = await Promise.all([
			apiService.getAllRoomTemplates(),
			apiService.getAllPersonTemplates(),
			apiService.getAllRaceTemplates(),
			apiService.getShipLayoutById('destiny'),
			apiService.getAllGalaxyTemplates(),
			apiService.getAllStarSystemTemplates(),
			apiService.getDestinyStatusTemplate(),
			apiService.getStartingInventory(),
		]);

		// Create the game record
		store.commit(
			events.gameCreated({
				id: game_id,
				name,
			}),
		);

		// Create races from templates
		for (const race of raceTemplates) {
			store.commit(
				events.raceCreated({
					...race,
					id: crypto.randomUUID(),
					game_id: game_id,
				}),
			);
		}

		// Create crew from person templates
		for (const person of personTemplates) {
			store.commit(
				events.personCreated({
					...person,
					id: crypto.randomUUID(),
					game_id: game_id,
				}),
			);
		}

		// Import galaxy structure
		for (const galaxy of galaxyTemplates) {
			store.commit(
				events.galaxyCreated({
					...galaxy,
					id: crypto.randomUUID(),
					game_id: game_id,
				}),
			);
		}

		// Create star systems
		for (const starSystem of starSystemTemplates) {
			store.commit(
				events.starSystemCreated({
					...starSystem,
					id: crypto.randomUUID(),
					game_id: game_id,
					updated_at: now,
					created_at: now,
				}),
			);
		}

		// Destiny Status
		store.commit(
			events.destinyStatusCreated({
				...destinyStatusTemplate,
				id: game_id,
			}),
		);

		// Default Rooms
		for (const room of roomTemplates) {
			store.commit(
				events.roomCreated({
					...room,
					// Template ID
					template_id: room.id,
					// ID is unique per game
					id: crypto.randomUUID(),
					game_id: game_id,
				}),
			);
		};

		// Add initial inventory
		for (const item of startingInventory) {
			store.commit(
				events.inventoryAdded({
					...item,
					id: crypto.randomUUID(),
					game_id: game_id,
				}),
			);
		}
		return game_id;
	};

	const updateGame = (game_id: string, updates: { name?: string; totalTimeProgressed?: number }) => {
		store.commit(
			events.gameUpdated({
				id: game_id,
				...updates,
				...(updates.totalTimeProgressed !== undefined && {
					lastPlayed: new Date(),
				}),
			}),
		);
	};

	const deleteGame = (game_id: string) => {
		store.commit(
			events.gameDeleted({
				id: game_id,
			}),
		);
	};

	const updateDestinyStatus = (game_id: string, updates: {
		power?: number;
		shields?: number;
		hull?: number;
		gameDays?: number;
		gameHours?: number;
		ftlStatus?: string;
	}) => {
		store.commit(
			events.destinyStatusUpdated({
				game_id,
				...updates,
			}),
		);
	};

	const addInventoryItem = ({
		game_id,
		resource_type,
		amount,
		location,
		description,
	}: {
		game_id: string,
		resource_type: string,
		amount: number,
		location?: string,
		description?: string,
	}) => {
		store.commit(
			events.inventoryAdded({
				id: crypto.randomUUID(),
				game_id,
				resource_type,
				amount,
				location,
				description,
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

	/**
	 * Start a room exploration
	 *
	 * @param roomId - The ID of the room to explore
	 * @param crewAssigned - The IDs of the crew members assigned to the exploration
	 * @param startTime - The game time when the exploration started
	 */
	const startRoomExploration = (roomId: string, crewAssigned: string[], startTime: number) => {
		store.commit(
			events.roomExplorationStarted({
				room_id: roomId,
				crew_assigned: crewAssigned,
				start_time: startTime,
			}),
		);
	};

	const completeRoomExploration = (roomId: string, discovered: string[] = []) => {
		store.commit(
			events.roomExplorationCompleted({
				room_id: roomId,
				completed_at: new Date(),
				discovered,
			}),
		);
	};

	const unlockTechnology = (id: string, game_id: string) => {
		store.commit(
			events.technologyUnlocked({
				id,
				game_id,
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
			}),
		);
	};

	const getTechnologyForRoom = async (templateID: string): Promise<RoomTechnology[]> => {
		return apiService.getTechnologyForRoom(templateID);
	};

	// TODO: Fix this
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
		gameById: (game_id: string) => gameById$(game_id),
		roomsByGame: (game_id: string) => roomsBygame_id$(game_id),
		roomById: (room_id: string) => roomById$(room_id),
		destinyStatus: (game_id: string) => destinyStatusBygame_id$(game_id),
		peopleByGame: (game_id: string) => peopleBygame_id$(game_id),
		inventoryByGame: (game_id: string) => inventoryBygame_id$(game_id),
		galaxiesByGame: (game_id: string) => galaxiesBygame_id$(game_id),
		starSystemsByGame: (game_id: string) => starSystemsBygame_id$(game_id),
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
		getTechnologyForRoom,
		// Queries
		queries,
	};
};
