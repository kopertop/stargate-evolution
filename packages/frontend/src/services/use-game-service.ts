import { useStore } from '@livestore/react';
import { NullToUndefined, RoomTechnology, RoomTemplate } from '@stargate/common';

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
	crewMembers$,
} from '../livestore/queries';
import { events } from '../livestore/schema';

import apiService from './api-service';

export const useGameService = () => {
	const { store } = useStore();

	const createNewGame = async (name: string = 'New Stargate Game'): Promise<string> => {
		console.log('[createNewGame] called');
		const game_id = crypto.randomUUID();
		const now = new Date();

		try {
			// Fetch templates from backend
			const [
				roomTemplates,
				personTemplates,
				raceTemplates,
				galaxyTemplates,
				starSystemTemplates,
				destinyStatusTemplate,
				startingInventory,
			] = await Promise.all([
				apiService.getAllRoomTemplates(),
				apiService.getAllPersonTemplates(),
				apiService.getAllRaceTemplates(),
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
			let createdRoomCount = 0;
			const roomIdMap: Record<string, string> = {};
			const createdRooms: any[] = [];
			// First pass: create rooms and store mapping from template_id (or name) to generated UUID
			for (const room of roomTemplates) {
				const generatedId = crypto.randomUUID();
				roomIdMap[room.id] = generatedId;
				const newRoom = {
					...room,
					image: room.image ?? undefined,
					connection_north: room.connection_north ?? undefined,
					connection_south: room.connection_south ?? undefined,
					connection_east: room.connection_east ?? undefined,
					connection_west: room.connection_west ?? undefined,
					// Template ID
					template_id: room.id,
					// ID is unique per game
					id: generatedId,
					game_id: game_id,
				};
				createdRooms.push(newRoom);
				store.commit(events.roomCreated(newRoom));
				createdRoomCount++;
			}
			// Second pass: update connections to use generated UUIDs
			for (const room of createdRooms) {
				const update: Partial<NullToUndefined<RoomTemplate>> = {};
				if (room.connection_north && roomIdMap[room.connection_north]) {
					update.connection_north = roomIdMap[room.connection_north];
				}
				if (room.connection_south && roomIdMap[room.connection_south]) {
					update.connection_south = roomIdMap[room.connection_south];
				}
				if (room.connection_east && roomIdMap[room.connection_east]) {
					update.connection_east = roomIdMap[room.connection_east];
				}
				if (room.connection_west && roomIdMap[room.connection_west]) {
					update.connection_west = roomIdMap[room.connection_west];
				}
				if (Object.keys(update).length > 0) {
					store.commit(events.roomUpdated({ id: room.id, ...update }));
				}
			}
			console.log(`[createNewGame] Created ${createdRoomCount} rooms for game_id ${game_id}`);

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
		} catch (err) {
			console.error('[createNewGame] Error:', err);
			throw err;
		}
	};

	const updateGame = (game_id: string, updates: { name?: string; total_time_progressed?: number }) => {
		store.commit(
			events.gameUpdated({
				id: game_id,
				...updates,
				...(updates.total_time_progressed !== undefined && {
					total_time_progressed: updates.total_time_progressed,
					last_played: new Date(),
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
		game_days?: number;
		game_hours?: number;
		ftl_status?: string;
		next_ftl_transition?: number;
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

	const updateRoom = (roomId: string, updates: Partial<NullToUndefined<RoomTemplate>>) => {
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
	const updateDoorState = (
		fromRoomId: string,
		toRoomId: string,
		newState: 'closed' | 'opened' | 'locked',
	) => {
		console.log('[updateDoorState] called', fromRoomId, toRoomId, newState);
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

	const assignCrewToRoom = (personId: string, roomId: string | null) => {
		store.commit(
			events.personUpdated({
				id: personId,
				assigned_to: roomId ?? undefined,
				updated_at: new Date(),
			}),
		);
	};

	const clearExplorationProgress = (roomId: string) => {
		store.commit(
			events.roomUpdated({
				id: roomId,
				exploration_data: '',
			}),
		);
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
		crewMembers: (game_id: string) => crewMembers$(game_id),
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
		assignCrewToRoom,
		clearExplorationProgress,
		// Queries
		queries,
		// Raw store
		store,
	};
};
