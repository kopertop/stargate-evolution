import { Database, Q } from '@nozbe/watermelondb';
import { writer } from '@nozbe/watermelondb/decorators';
import { synchronize } from '@nozbe/watermelondb/sync';
import { RoomTemplate, ShipLayout } from '@stargate/common/src/zod-templates';

import DestinyStatus from '../models/destiny-status';
import Galaxy from '../models/galaxy';
import Game from '../models/game';
import Race from '../models/race';
import Room from '../models/room';
import StarSystem from '../models/star-system';

import templateService from './template-service';


export class GameService {
	constructor(private database: Database) {}

	/**
	 * Create a new game using templates from the backend API
	 */
	@writer async createNewGameFromTemplates(shipLayoutId: string = 'destiny'): Promise<string> {
		console.log('[GameService] Creating new game from templates...');

		try {
			// Fetch templates from backend
			console.log('[GameService] Fetching templates from backend...');
			const [roomTemplates, personTemplates, raceTemplates, shipLayout] = await Promise.all([
				templateService.getAllRoomTemplates(),
				templateService.getAllPersonTemplates(),
				templateService.getAllRaceTemplates(),
				templateService.getShipLayoutById(shipLayoutId),
			]);

			console.log(`Loaded ${roomTemplates.length} room templates, ${personTemplates.length} person templates, ${raceTemplates.length} race templates`);

			if (!shipLayout) {
				throw new Error(`Ship layout '${shipLayoutId}' not found`);
			}

			// Create the game record
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'New Stargate Game';
				gameRecord.totalTimeProgressed = 0;
			});

			const gameId = game.id;
			console.log('Created game with ID:', gameId);

			// Create galaxies (keeping the same structure as before)
			const milkyWay = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
				galaxy.gameId = gameId;
				galaxy.name = 'Milky Way';
				galaxy.x = 0;
				galaxy.y = 0;
			});

			const jadesGalaxy = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
				galaxy.gameId = gameId;
				galaxy.name = 'JADES-GS-z14-0';
				galaxy.x = 1000;
				galaxy.y = 0;
			});

			// Create star systems
			const solSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
				starSystem.gameId = gameId;
				starSystem.galaxyId = milkyWay.id;
				starSystem.name = 'Sol System';
				starSystem.x = 0;
				starSystem.y = 0;
				starSystem.description = 'The home system of Earth.';
			});

			const icarusSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
				starSystem.gameId = gameId;
				starSystem.galaxyId = milkyWay.id;
				starSystem.name = 'Icarus System';
				starSystem.x = 100;
				starSystem.y = 200;
				starSystem.description = 'Remote system with Icarus planet.';
			});

			const destinySystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
				starSystem.gameId = gameId;
				starSystem.galaxyId = jadesGalaxy.id;
				starSystem.name = 'Destiny System';
				starSystem.x = 500;
				starSystem.y = 500;
				starSystem.description = 'System where Destiny is found.';
			});

			// Create races from templates
			console.log('Creating races from templates...');
			const raceMap = new Map<string, string>(); // template_id -> game_race_id

			for (const raceTemplate of raceTemplates) {
				const race = await this.database.get<Race>('races').create((race) => {
					race.gameId = gameId;
					race.name = raceTemplate.name;
					race.technology = raceTemplate.default_technology;
					race.ships = raceTemplate.default_ships;
				});
				raceMap.set(raceTemplate.id, race.id);
				console.log(`Created race: ${raceTemplate.name} (${race.id})`);
			}

			// Create crew from person templates
			console.log('Creating crew from person templates...');
			for (const personTemplate of personTemplates) {
				const raceId = personTemplate.race_template_id ? raceMap.get(personTemplate.race_template_id) : null;

				const person = await this.database.get('people').create((personRecord: any) => {
					personRecord.gameId = gameId;
					personRecord.raceId = raceId;
					personRecord.name = personTemplate.name;
					personRecord.role = personTemplate.role;
					personRecord.location = personTemplate.default_location || JSON.stringify({ shipId: 'destiny' });
					personRecord.assignedTo = null;
					personRecord.skills = personTemplate.skills;
					personRecord.description = personTemplate.description;
					personRecord.image = personTemplate.image;
					personRecord.conditions = JSON.stringify([]);
				});
				console.log(`Created crew member: ${personTemplate.name} (${person.id})`);
			}

			// Create Destiny status (keeping same structure)
			const ancientsRaceId = raceMap.get('ancients');
			const destinyStatus = await this.database.get<DestinyStatus>('destiny_status').create((destinyStatus) => {
				destinyStatus._raw.id = gameId;
				destinyStatus.gameId = gameId;
				destinyStatus.name = 'Destiny';
				destinyStatus.power = 800;
				destinyStatus.maxPower = 1000;
				destinyStatus.shields = 400;
				destinyStatus.maxShields = 500;
				destinyStatus.hull = 900;
				destinyStatus.maxHull = 1000;
				destinyStatus.raceId = ancientsRaceId || '';
				destinyStatus.crew = JSON.stringify([]);
				destinyStatus.location = JSON.stringify({ systemId: destinySystem.id });
				destinyStatus.shield = JSON.stringify({ strength: 400, max: 500, coverage: 80 });
				destinyStatus.inventory = JSON.stringify({
					food: 50,
					water: 100,
					parts: 10,
					medicine: 5,
					ancient_tech: 2,
					lime: 20,
					oxygen_canister: 5,
				});
				destinyStatus.crewStatus = JSON.stringify({
					onboard: 12,
					capacity: 100,
					manifest: [],
				});
				destinyStatus.atmosphere = JSON.stringify({
					co2: 0.04,
					o2: 20.9,
					co2Scrubbers: 1,
				});
				destinyStatus.weapons = JSON.stringify({
					mainGun: false,
					turrets: { total: 12, working: 6 },
				});
				destinyStatus.shuttles = JSON.stringify({ total: 2, working: 1, damaged: 1 });
				destinyStatus.notes = JSON.stringify(['Ship systems coming online. Crew exploring available sections.']);
				destinyStatus.gameDays = 1;
				destinyStatus.gameHours = 0;
				destinyStatus.ftlStatus = 'ftl';
				destinyStatus.nextFtlTransition = 6 + Math.random() * 42;
			});

			// Create rooms from ship layout and room templates
			console.log('Creating ship rooms from layout and templates...');
			await this.createRoomsFromLayout(gameId, shipLayout, roomTemplates);

			console.log('Game creation completed successfully!');
			return gameId;

		} catch (error) {
			console.error('Failed to create game from templates:', error);
			throw error;
		}
	}

	/**
	 * Helper method to create rooms from ship layout and room templates
	 */
	private async createRoomsFromLayout(gameId: string, shipLayout: ShipLayout, roomTemplates: RoomTemplate[]): Promise<void> {
		// Create a map of template_id -> RoomTemplate for quick lookup
		const templateMap = new Map<string, RoomTemplate>();
		for (const template of roomTemplates) {
			templateMap.set(template.id, template);
		}

		// Create a map to store room_id -> actual_room_id for connections
		const roomIdMap = new Map<string, string>();

		// Helper functions (same as before)
		const createDoorInfo = (toRoomId: string, state: 'closed' | 'opened' | 'locked' = 'closed', requirements: any[] = [], description?: string) => ({
			toRoomId,
			state,
			requirements,
			description,
		});

		const setDefaultRoomState = (room: any, isInitiallyFound: boolean = false) => {
			room.found = isInitiallyFound;
			room.locked = false;
			room.explored = false;
		};

		// Transform backend rooms to expected structure
		const transformedRooms = shipLayout.rooms.map(layoutRoomRaw => ({
			template_id: layoutRoomRaw.id,
			position: {
				x: layoutRoomRaw.position_x,
				y: layoutRoomRaw.position_y,
				floor: layoutRoomRaw.floor,
			},
			initial_state: JSON.parse(layoutRoomRaw.initial_state),
			connections: [
				layoutRoomRaw.connection_north,
				layoutRoomRaw.connection_south,
				layoutRoomRaw.connection_east,
				layoutRoomRaw.connection_west,
			].filter(Boolean),
			id: layoutRoomRaw.id, // for mapping
		}));

		// First pass: Create all rooms
		console.log(`Creating ${transformedRooms.length} rooms from layout...`);
		for (const layoutRoom of transformedRooms) {
			const template = templateMap.get(layoutRoom.template_id);
			if (!template) {
				console.warn(`Room template '${layoutRoom.template_id}' not found, skipping room`);
				continue;
			}

			const room = await this.database.get<Room>('rooms').create((room) => {
				room.gameId = gameId;
				room.type = template.type;
				room.gridX = layoutRoom.position.x;
				room.gridY = layoutRoom.position.y;
				room.gridWidth = template.size_factor;
				room.gridHeight = template.size_factor;
				room.floor = layoutRoom.position.floor;
				room.technology = template.technology || '';
				room.image = template.image || '';
				room.status = template.default_status as 'ok' | 'damaged' | 'destroyed' || 'ok';

				// Set initial state from layout
				setDefaultRoomState(room, layoutRoom.initial_state.found);
				room.locked = layoutRoom.initial_state.locked;
				room.explored = layoutRoom.initial_state.explored;

				// Will be updated in second pass
				room.connectedRooms = JSON.stringify([]);
				room.doors = JSON.stringify([]);
			});

			// Map the layout room ID to the actual room ID
			const layoutRoomId = layoutRoom.id || layoutRoom.template_id;
			roomIdMap.set(layoutRoomId, room.id);

			console.log(`Created room: ${template.name} at (${layoutRoom.position.x}, ${layoutRoom.position.y}, floor ${layoutRoom.position.floor})`);
		}

		// Second pass: Update connections and doors
		console.log('Updating room connections and doors...');
		for (const layoutRoom of transformedRooms) {
			const layoutRoomId = layoutRoom.id || layoutRoom.template_id;
			const actualRoomId = roomIdMap.get(layoutRoomId) || '';

			if (!actualRoomId) continue;

			const room = await this.database.get<Room>('rooms').find(actualRoomId as string);

			// Map connection IDs to actual room IDs
			const connectedRoomIds = layoutRoom.connections
				.map(connId => roomIdMap.get(connId || '') || '')
				.filter(id => id);

			// Find doors for this room from the layout
			const roomDoors = shipLayout.doors
				.filter(door => door.from_room_id === layoutRoomId)
				.map(door => {
					const toRoomId = roomIdMap.get(door.to_room_id) || '';
					if (!toRoomId) return null;

					return createDoorInfo(
						toRoomId,
						door.initial_state as 'closed' | 'opened' | 'locked',
						door.requirements ? JSON.parse(door.requirements) : [],
						door.description ?? undefined,
					);
				})
				.filter(door => door !== null);

			// Update the room with connections and doors
			await room.update((roomRecord) => {
				roomRecord.connectedRooms = JSON.stringify(connectedRoomIds);
				roomRecord.doors = JSON.stringify(roomDoors);
			});
		}

		console.log('Room layout creation completed!');
	}

	/**
	 * Create a new game - now uses templates exclusively
	 */
	@writer async createNewGame(): Promise<string> {
		// Delegate to the template-based method
		return this.createNewGameFromTemplates();
	}

	/**
	 * List all games
	 */
	async listGames(): Promise<Game[]> {
		return await this.database
			.get<Game>('games')
			.query()
			.fetch();
	}

	/**
	 * Load game data with all related tables
	 */
	async getGameData(gameId: string): Promise<Record<string, unknown[]>> {
		console.log('Loading game data for gameId:', gameId);

		const tables = [
			'galaxies',
			'star_systems',
			'stars',
			'planets',
			'stargates',
			'chevrons',
			'technology',
			'races',
			'ships',
			'destiny_status',
			'people',
			'rooms',
		];
		const result: Record<string, unknown[]> = {};

		for (const table of tables) {
			const records = await this.database
				.get(table)
				.query(Q.where('game_id', gameId))
				.fetch();
			result[table] = records;
			console.log(`Loaded ${records.length} records from ${table}`);
		}

		console.log('Final game data result:', result);
		return result;
	}

	/**
	 * Get all rooms for a specific game
	 */
	async getRoomsByGame(gameId: string): Promise<Room[]> {
		return await this.database
			.get<Room>('rooms')
			.query(Q.where('game_id', gameId))
			.fetch();
	}

	/**
	 * Get rooms by type (e.g., 'corridor', 'quarters', 'elevator')
	 */
	async getRoomsByType(gameId: string, roomType: string): Promise<Room[]> {
		return await this.database
			.get<Room>('rooms')
			.query(
				Q.where('game_id', gameId),
				Q.where('type', roomType),
			)
			.fetch();
	}

	/**
	 * Get rooms on a specific floor
	 */
	async getRoomsByFloor(gameId: string, floor: number): Promise<Room[]> {
		return await this.database
			.get<Room>('rooms')
			.query(
				Q.where('game_id', gameId),
				Q.where('floor', floor),
			)
			.fetch();
	}

	/**
	 * Get unlocked rooms for exploration
	 */
	async getUnlockedRooms(gameId: string): Promise<Room[]> {
		return await this.database
			.get<Room>('rooms')
			.query(
				Q.where('game_id', gameId),
				Q.where('unlocked', true),
			)
			.fetch();
	}

	/**
	 * Update room status (unlock, repair, etc.)
	 */
	async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
		const room = await this.database.get<Room>('rooms').find(roomId);
		await this.database.write(async () => {
			await room.update((roomRecord) => {
				if (updates.locked !== undefined) {
					roomRecord.locked = updates.locked;
				}
				if (updates.found !== undefined) {
					roomRecord.found = updates.found;
				}
				if (updates.status !== undefined) {
					roomRecord.status = updates.status;
				}
				if (updates.explorationData !== undefined) {
					roomRecord.explorationData = updates.explorationData;
				}
				if (updates.explored !== undefined) {
					roomRecord.explored = updates.explored;
				}
			});
		});
	}

	/**
	 * Debug function to check database status
	 */
	async debugDatabaseStatus(): Promise<void> {
		console.log('=== Database Debug Info ===');

		const tables = [
			'games', 'galaxies', 'star_systems', 'stars', 'planets',
			'stargates', 'chevrons', 'technology', 'races', 'ships',
			'destiny_status', 'people', 'rooms',
		];

		for (const table of tables) {
			try {
				const collection = this.database.get(table);
				const count = await collection.query().fetchCount();
				console.log(`Table '${table}': ${count} records`);
			} catch (error) {
				console.error(`Error querying table '${table}':`, error);
			}
		}

		console.log('=== End Database Debug ===');
	}

	/**
	 * Debug room layout - display all rooms and their connections
	 */
	async debugRoomLayout(gameId: string): Promise<void> {
		console.log('=== Ship Room Layout Debug ===');

		const rooms = await this.getRoomsByGame(gameId);

		// Group by floor
		const roomsByFloor = rooms.reduce((acc, room) => {
			const floor = (room as any).floor || 0;
			if (!acc[floor]) acc[floor] = [];
			acc[floor].push(room);
			return acc;
		}, {} as Record<number, any[]>);

		// Sort floors
		const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => b - a);

		for (const floor of floors) {
			console.log(`\n--- Floor ${floor} ---`);
			const floorRooms = roomsByFloor[floor];

			for (const room of floorRooms) {
				const roomData = room as any;
				const connections = JSON.parse(roomData.connectedRooms || '[]');
				const technology = JSON.parse(roomData.technology || '[]');

				console.log(`${roomData.type.toUpperCase()} (${roomData.x}, ${roomData.y})`);
				console.log(`  Status: ${roomData.status} | Unlocked: ${roomData.unlocked}`);
				console.log(`  Technology: [${technology.join(', ')}]`);
				console.log(`  Connections: ${connections.length} room(s)`);

				// Show connected room types
				if (connections.length > 0) {
					const connectedRoomNames = await Promise.all(
						connections.map(async (connId: string) => {
							try {
								const connRoom = await this.database.get('rooms').find(connId);
								return (connRoom as any).type;
							} catch {
								return 'unknown';
							}
						}),
					);
					console.log(`  Connected to: [${connectedRoomNames.join(', ')}]`);
				}
				console.log('');
			}
		}

		console.log(`Total rooms: ${rooms.length}`);
		console.log('=== End Room Layout Debug ===');
	}

	/**
	 * Get all crew members for a specific game
	 */
	async getCrewByGame(gameId: string): Promise<any[]> {
		return await this.database
			.get('people')
			.query(Q.where('game_id', gameId))
			.fetch();
	}

	/**
	 * Get available crew members (not assigned to any room)
	 */
	async getAvailableCrew(gameId: string): Promise<any[]> {
		return await this.database
			.get('people')
			.query(
				Q.where('game_id', gameId),
				Q.where('assigned_to', null),
			)
			.fetch();
	}

	/**
	 * Get crew members assigned to a specific room
	 */
	async getCrewByRoom(gameId: string, roomId: string): Promise<any[]> {
		return await this.database
			.get('people')
			.query(
				Q.where('game_id', gameId),
				Q.where('assigned_to', roomId),
			)
			.fetch();
	}

	/**
	 * Assign crew member to a room
	 */
	async assignCrewToRoom(personId: string, roomId: string | null): Promise<void> {
		const person = await this.database.get('people').find(personId);
		await this.database.write(async () => {
			await person.update((personRecord: any) => {
				personRecord.assignedTo = roomId;
			});
		});
	}

	/**
	 * Get crew members with specific skills
	 */
	async getCrewWithSkills(gameId: string, requiredSkills: string[]): Promise<any[]> {
		const allCrew = await this.getCrewByGame(gameId);
		return allCrew.filter((person: any) => {
			const skills = JSON.parse(person.skills || '[]');
			return requiredSkills.some(skill => skills.includes(skill));
		});
	}

	async reset() {
		await this.database.write(async () => {
			await this.database.unsafeResetDatabase();
		});
	}

	async sync() {
		return synchronize({
			database: this.database,
			pullChanges: async ({ lastPulledAt }) => {
				/*
				const response = await fetchApi('/sync?last_pulled_at=' + lastPulledAt);

				if (!response.ok) {
					throw new Error(`Server responded with ${response.status}`);
				}

				const { changes, timestamp } = await response.json();
				return { changes, timestamp };
				*/
				return { changes: {}, timestamp: Date.now() };
			},
			pushChanges: async ({ changes, lastPulledAt }) => {
				/*
				const response = await fetchApi('/sync', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						changes,
						last_pulled_at: lastPulledAt,
					}),
				});

				if (!response.ok) {
					throw new Error(`Server responded with ${response.status}`);
				}
				*/
			},
		});
	}

	/**
	 * Delete a game and all its related data
	 */
	@writer async deleteGame(gameId: string): Promise<void> {
		console.log('Deleting game and all related data for gameId:', gameId);

		// List of all tables that have game_id foreign key
		const tablesToClean = [
			'chevrons',
			'stargates',
			'ships',
			'technology',
			'people',
			'races',
			'planets',
			'stars',
			'star_systems',
			'galaxies',
			'rooms',
			'destiny_status',
		];

		// Delete all related records first (in reverse dependency order)
		for (const tableName of tablesToClean) {
			const records = await this.database
				.get(tableName)
				.query(Q.where('game_id', gameId))
				.fetch();

			console.log(`Deleting ${records.length} records from ${tableName}`);

			for (const record of records) {
				await record.markAsDeleted();
			}
		}

		// Finally delete the game itself
		const game = await this.database.get<Game>('games').find(gameId);
		await game.markAsDeleted();

		console.log('Game deletion completed successfully');
	}

	/**
	 * Save exploration progress to database
	 */
	async saveExplorationProgress(gameId: string, explorationData: Record<string, any>): Promise<void> {
		// For now, we'll store exploration progress in the room's assignedTo field for crew
		// and use a simple JSON storage approach
		// In a more complex system, we'd have a separate exploration table

		for (const [roomId, exploration] of Object.entries(explorationData)) {
			try {
				const room = await this.database.get<Room>('rooms').find(roomId);
				await this.database.write(async () => {
					await room.update((roomRecord) => {
						// Store exploration data in a custom field (we'll need to add this to the schema)
						// For now, store it as JSON in the room's notes or a custom field
						roomRecord.explorationData = JSON.stringify(exploration);
						if (exploration.progress >= 100) {
							roomRecord.explored = true;
						}
					});
				});
			} catch (error) {
				console.error(`Failed to save exploration progress for room ${roomId}:`, error);
			}
		}
	}

	/**
	 * Load exploration progress from database
	 */
	async loadExplorationProgress(gameId: string): Promise<Record<string, any>> {
		const explorationData: Record<string, any> = {};

		try {
			const rooms = await this.getRoomsByGame(gameId);

			for (const room of rooms) {
				const roomData = room as any;
				if (roomData.explorationData) {
					try {
						const exploration = JSON.parse(roomData.explorationData);
						// Only include ongoing explorations (not completed ones)
						if (exploration.progress < 100) {
							explorationData[room.id] = exploration;
						}
					} catch (error) {
						console.error(`Failed to parse exploration data for room ${room.id}:`, error);
					}
				}
			}
		} catch (error) {
			console.error('Failed to load exploration progress:', error);
		}

		return explorationData;
	}

	/**
	 * Clear exploration progress for a room (when exploration completes)
	 */
	async clearExplorationProgress(roomId: string): Promise<void> {
		try {
			const room = await this.database.get<Room>('rooms').find(roomId);
			await this.database.write(async () => {
				await room.update((roomRecord) => {
					roomRecord.explorationData = undefined;
				});
			});
		} catch (error) {
			console.error(`Failed to clear exploration progress for room ${roomId}:`, error);
		}
	}

	/**
	 * Update door state between two rooms (bidirectional)
	 */
	async updateDoorState(fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked'): Promise<void> {
		await this.database.write(async () => {
			// Update the door state in the fromRoom
			const fromRoom = await this.database.get<Room>('rooms').find(fromRoomId);
			await fromRoom.update((roomRecord) => {
				const doors = JSON.parse(roomRecord.doors || '[]');
				const updatedDoors = doors.map((door: any) =>
					door.toRoomId === toRoomId
						? { ...door, state: newState }
						: door,
				);
				roomRecord.doors = JSON.stringify(updatedDoors);
			});

			// Update the corresponding door state in the toRoom (bidirectional)
			try {
				const toRoom = await this.database.get<Room>('rooms').find(toRoomId);
				await toRoom.update((roomRecord) => {
					const doors = JSON.parse(roomRecord.doors || '[]');
					const updatedDoors = doors.map((door: any) =>
						door.toRoomId === fromRoomId
							? { ...door, state: newState }
							: door,
					);
					roomRecord.doors = JSON.stringify(updatedDoors);
				});
			} catch (error) {
				// toRoom might not exist or might not have a return door - that's okay
				console.log(`No bidirectional door found from ${toRoomId} to ${fromRoomId}`);
			}
		});
	}

	/**
	 * Update destiny status in the database
	 */
	@writer async updateDestinyStatus(gameId: string, destinyStatus: any): Promise<void> {
		const existingStatus = await this.database.get<DestinyStatus>('destiny_status')
			.query(Q.where('game_id', gameId))
			.fetch();

		if (existingStatus.length > 0) {
			const status = existingStatus[0];
			await status.update((record) => {
				record.power = destinyStatus.power;
				record.maxPower = destinyStatus.maxPower;
				record.shields = destinyStatus.shield.strength;
				record.maxShields = destinyStatus.shield.max;
				record.hull = destinyStatus.hull;
				record.maxHull = destinyStatus.maxHull;
				record.shield = JSON.stringify(destinyStatus.shield);
				record.inventory = JSON.stringify(destinyStatus.inventory);
				record.crewStatus = JSON.stringify(destinyStatus.crewStatus);
				record.atmosphere = JSON.stringify(destinyStatus.atmosphere);
				record.weapons = JSON.stringify(destinyStatus.weapons);
				record.shuttles = JSON.stringify(destinyStatus.shuttles);
				record.notes = JSON.stringify(destinyStatus.notes || []);
				record.gameDays = destinyStatus.gameDays;
				record.gameHours = destinyStatus.gameHours;
				record.ftlStatus = destinyStatus.ftlStatus;
				record.nextFtlTransition = destinyStatus.nextFtlTransition;
			});
		}
	}

	/**
	 * Get total time progressed for a game
	 */
	async getGameTimeProgressed(gameId: string): Promise<number> {
		const game = await this.database.get<Game>('games').find(gameId);
		return (game as any).totalTimeProgressed || 0;
	}

	/**
	 * Update total time progressed for a game
	 */
	@writer async updateGameTimeProgressed(gameId: string, totalTimeProgressed: number): Promise<void> {
		const game = await this.database.get<Game>('games').find(gameId);
		await game.update((record) => {
			record.totalTimeProgressed = totalTimeProgressed;
			record.lastPlayed = new Date();
		});
	}
}

