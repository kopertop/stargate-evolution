import { Database, Q } from '@nozbe/watermelondb';
import { writer } from '@nozbe/watermelondb/decorators';
import { synchronize } from '@nozbe/watermelondb/sync';
import sleep from '@stargate/common/sleep';

import DestinyStatus from '../models/destiny-status';
import Galaxy from '../models/galaxy';
import Game from '../models/game';
import Race from '../models/race';
import Room from '../models/room';
import StarSystem from '../models/star-system';

export class GameService {
	constructor(private database: Database) {}

	async test() {
		const game = await this.database.write(async () => {
			return await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Milky Way';
			});
		});
		await sleep(1000);

		console.log('Created game:', game);
		console.log('Game name after create:', game.name);
		console.log('Game _raw after create:', game._raw);
		const gameLookup = await this.database.get<Game>('games').find(game.id);
		console.log('Game lookup:', gameLookup.name);

		return game;
	}

	/**
	 * Create a new game with all initial data
	 */
	@writer async createNewGame(): Promise<string> {
		console.log('Creating new game...');

		// Try using create with explicit _raw assignment
		const game = await this.database.get<Game>('games').create((gameRecord) => {
			gameRecord.name = 'New Stargate Game';
		});

		console.log('Created game:', game);
		const gameId = game.id;
		console.log('Created game with ID:', gameId);
		console.log('Game name after create:', game.name);
		console.log('Game _raw after create:', game._raw);

		// Create galaxies using proper WatermelonDB methods
		const milkyWay = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
			console.log('Inside galaxy create callback, before assignments');
			galaxy.gameId = gameId;
			galaxy.name = 'Milky Way';
			galaxy.x = 0;
			galaxy.y = 0;
			console.log('Inside galaxy create callback, after assignments:', galaxy.name, galaxy.gameId);
			console.log('Galaxy record _raw after assignment:', galaxy._raw);
		});
		console.log('Created Milky Way galaxy:', milkyWay.id);

		const jadesGalaxy = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
			galaxy.gameId = gameId;
			galaxy.name = 'JADES-GS-z14-0';
			galaxy.x = 1000;
			galaxy.y = 0;
		});
		console.log('Created JADES galaxy:', jadesGalaxy.id);

		// Create star systems
		const solSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = milkyWay.id;
			starSystem.name = 'Sol System';
			starSystem.x = 0;
			starSystem.y = 0;
			starSystem.description = 'The home system of Earth.';
		});
		console.log('Created Sol system:', solSystem.id);

		const icarusSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = milkyWay.id;
			starSystem.name = 'Icarus System';
			starSystem.x = 100;
			starSystem.y = 200;
			starSystem.description = 'Remote system with Icarus planet.';
		});
		console.log('Created Icarus system:', icarusSystem.id);

		const destinySystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = jadesGalaxy.id;
			starSystem.name = 'Destiny System';
			starSystem.x = 500;
			starSystem.y = 500;
			starSystem.description = 'System where Destiny is found.';
		});
		console.log('Created Destiny system:', destinySystem.id);

		// Create races
		const ancientsRace = await this.database.get<Race>('races').create((race) => {
			race.gameId = gameId;
			race.name = 'Ancients';
			race.technology = JSON.stringify([]);
			race.ships = JSON.stringify([]);
		});
		console.log('Created Ancients race:', ancientsRace.id);

		const humanRace = await this.database.get<Race>('races').create((race) => {
			race.gameId = gameId;
			race.name = 'Human';
			race.technology = JSON.stringify([]);
			race.ships = JSON.stringify([]);
		});
		console.log('Created Human race:', humanRace.id);

		// Create Destiny status
		const destinyStatus = await this.database.get<DestinyStatus>('destiny_status').create((destinyStatus) => {
			destinyStatus.gameId = gameId;
			destinyStatus.name = 'Destiny';
			destinyStatus.power = 800;
			destinyStatus.maxPower = 1000;
			destinyStatus.shields = 400;
			destinyStatus.maxShields = 500;
			destinyStatus.hull = 900;
			destinyStatus.maxHull = 1000;
			destinyStatus.raceId = ancientsRace.id;
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
				o2Scrubbers: 1,
			});
			destinyStatus.weapons = JSON.stringify({
				mainGun: false,
				turrets: { total: 12, working: 6 },
			});
			destinyStatus.shuttles = JSON.stringify({ total: 2, working: 1, damaged: 1 });
			destinyStatus.notes = JSON.stringify(['Ship systems coming online. Crew exploring available sections.']);

			// Initialize game time fields
			destinyStatus.gameDays = 1;
			destinyStatus.gameHours = 0;
			destinyStatus.ftlStatus = 'ftl';
			// Random countdown between 6 and 48 hours
			destinyStatus.nextFtlTransition = 6 + Math.random() * 42;
		});
		console.log('Created Destiny status:', destinyStatus.id);

		// Create comprehensive Destiny ship layout with proper connections
		console.log('Creating ship room layout...');

		// Main Floor (Floor 0) - Core ship operations
		const gateRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'gate_room';
			room.x = 0;
			room.y = 0;
			room.floor = 0;
			room.assigned = JSON.stringify(['dr_rush', 'lt_scott']);
			room.technology = JSON.stringify(['stargate', 'dialing_computer', 'shields']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([]); // Will be updated after corridors are created
		});

		// Corridors connected to gate room (north and south)
		const corridorNorth = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.x = 0;
			room.y = 1;
			room.floor = 0;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]); // Will be updated
		});

		const corridorSouth = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.x = 0;
			room.y = -1;
			room.floor = 0;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]); // Will be updated
		});

		// Bridge - connected to north corridor
		const bridgeRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'bridge';
			room.x = 0;
			room.y = 2;
			room.floor = 0;
			room.assigned = JSON.stringify(['colonel_young', 'eli_wallace']);
			room.technology = JSON.stringify(['ftl_drive_controls', 'sensors', 'communications', 'navigation']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorNorth.id]);
		});

		// Engineering - connected to south corridor
		const engineeringRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'engineering';
			room.x = 0;
			room.y = -2;
			room.floor = 0;
			room.assigned = JSON.stringify(['eli_wallace', 'brody']);
			room.technology = JSON.stringify(['power_systems', 'ftl_drive', 'life_support', 'reactor_controls']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorSouth.id]);
		});

		// East-West corridor connecting to quarters and other facilities
		const corridorEast = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.x = 1;
			room.y = 0;
			room.floor = 0;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorNorth.id]);
		});

		const corridorWest = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.x = -1;
			room.y = 0;
			room.floor = 0;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorSouth.id]);
		});

		// Medical Bay - connected to east corridor
		const medBayRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'medical_bay';
			room.x = 2;
			room.y = 0;
			room.floor = 0;
			room.assigned = JSON.stringify(['dr_james', 'medic_volker']);
			room.technology = JSON.stringify(['medical_scanners', 'healing_pods', 'surgical_equipment']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorEast.id]);
		});

		// Mess Hall - connected to west corridor
		const messHallRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'mess_hall';
			room.x = -2;
			room.y = 0;
			room.floor = 0;
			room.assigned = JSON.stringify(['chef_reynolds']);
			room.technology = JSON.stringify(['food_processors', 'water_recycling']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorWest.id]);
		});

		// Crew Quarters Section A - connected to east corridor
		const quartersA = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'quarters';
			room.x = 1;
			room.y = 1;
			room.floor = 0;
			room.assigned = JSON.stringify(['colonel_young', 'dr_rush', 'eli_wallace', 'chloe_armstrong']);
			room.technology = JSON.stringify(['personal_storage', 'sleep_pods']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorEast.id]);
		});

		// Crew Quarters Section B - connected to west corridor
		const quartersB = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'quarters';
			room.x = -1;
			room.y = -1;
			room.floor = 0;
			room.assigned = JSON.stringify(['lt_scott', 'greer', 'dr_james', 'dr_park']);
			room.technology = JSON.stringify(['personal_storage', 'sleep_pods']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorWest.id]);
		});

		// Elevator to lower levels - connected to south corridor
		const elevatorMain = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'elevator';
			room.x = 1;
			room.y = -1;
			room.floor = 0;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['elevator_controls', 'artificial_gravity']);
			room.fond = false;
			room.unlocked = true;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorSouth.id]); // Will connect to lower floor
		});

		// Lower Floor (Floor -1) - Storage and specialized systems
		const lowerCorridor = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.x = 1;
			room.y = -1;
			room.floor = -1;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['emergency_lighting', 'atmosphere_sensors']);
			room.fond = false;
			room.unlocked = false; // Initially locked
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([elevatorMain.id]);
		});

		// Hydroponics - lower level
		const hydroponicsRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'hydroponics';
			room.x = 0;
			room.y = -1;
			room.floor = -1;
			room.assigned = JSON.stringify(['dr_park', 'chloe_armstrong']);
			room.technology = JSON.stringify(['growing_systems', 'air_recycling', 'water_filtration']);
			room.fond = false;
			room.unlocked = false; // Needs to be discovered
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
		});

		// Storage Bay - lower level
		const storageBay = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'storage';
			room.x = 2;
			room.y = -1;
			room.floor = -1;
			room.assigned = JSON.stringify([]);
			room.technology = JSON.stringify(['cargo_systems', 'inventory_management']);
			room.fond = false;
			room.unlocked = false;
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
		});

		// Shuttle Bay - lower level, initially damaged
		const shuttleBayRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'shuttle_bay';
			room.x = 3;
			room.y = -1;
			room.floor = -1;
			room.assigned = JSON.stringify(['lt_scott', 'greer']);
			room.technology = JSON.stringify(['shuttle_systems', 'docking_clamps', 'hangar_controls']);
			room.fond = false;
			room.unlocked = false;
			room.status = 'damaged';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
		});

		// Update connection arrays for all rooms directly within this writer transaction
		console.log('Updating room connections...');

		// Update gate room connections
		await gateRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorNorth.id, corridorSouth.id]);
		});

		// Update corridor connections
		await corridorNorth.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([gateRoom.id, bridgeRoom.id, corridorEast.id]);
		});

		await corridorSouth.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([gateRoom.id, engineeringRoom.id, corridorWest.id, elevatorMain.id]);
		});

		await corridorEast.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorNorth.id, medBayRoom.id, quartersA.id]);
		});

		await corridorWest.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorSouth.id, messHallRoom.id, quartersB.id]);
		});

		// Update elevator connections
		await elevatorMain.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorSouth.id, lowerCorridor.id]);
		});

		// Update lower corridor connections
		await lowerCorridor.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([elevatorMain.id, hydroponicsRoom.id, storageBay.id, shuttleBayRoom.id]);
		});

		console.log('Ship layout created successfully!');
		console.log('Game creation completed successfully!');

		// TODO: Add more entities (stars, planets, people, technology, etc.) when needed

		return gameId;
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
	async updateRoom(roomId: string, updates: Partial<{ unlocked: boolean; status: 'ok' | 'damaged' | 'destroyed'; assigned: string[] }>): Promise<void> {
		const room = await this.database.get<Room>('rooms').find(roomId);
		await this.database.write(async () => {
			await room.update((roomRecord) => {
				if (updates.unlocked !== undefined) {
					roomRecord.unlocked = updates.unlocked;
				}
				if (updates.status !== undefined) {
					roomRecord.status = updates.status;
				}
				if (updates.assigned !== undefined) {
					roomRecord.assigned = JSON.stringify(updates.assigned);
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
				const assigned = JSON.parse(roomData.assigned || '[]');

				console.log(`${roomData.type.toUpperCase()} (${roomData.x}, ${roomData.y})`);
				console.log(`  Status: ${roomData.status} | Unlocked: ${roomData.unlocked}`);
				console.log(`  Assigned: [${assigned.join(', ')}]`);
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
}

