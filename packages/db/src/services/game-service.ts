import { Database } from '@nozbe/watermelondb';
import { ulid } from 'ulid';

import Galaxy from '../models/galaxy';
import Game from '../models/game';

export class GameService {
	constructor(private database: Database) {}

	/**
	 * Create a new game with all initial data
	 */
	async createNewGame(userId: string): Promise<string> {
		return await this.database.write(async () => {
			const gameId = ulid();
			const now = Date.now();

			// Generate ULIDs for all entities
			const sysEarthId = ulid();
			const sysIcarusId = ulid();
			const sysDestinyId = ulid();
			const earthId = ulid();
			const icarusId = ulid();
			const destinyShipId = ulid();
			const destinyStargateId = ulid();
			const destinyBridgeId = ulid();
			const destinyStargateRoomId = ulid();
			const destinyEngineId = ulid();
			const destinyMedbayId = ulid();
			const ancientsRaceId = ulid();
			const humanRaceId = ulid();

			// Create the game record
			await this.database.get<Game>('games').create((game) => {
				game.userId = userId;
				game.name = 'New Stargate Game';
				game.createdAt = new Date(now);
				game.updatedAt = new Date(now);
			});

			// Create galaxies
			const milkyWayId = ulid();
			const jadesId = ulid();

			await this.database.get<Galaxy>('galaxies').create((record) => {
				(record._raw as any).id = milkyWayId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'Milky Way';
				(record._raw as any).x = 0;
				(record._raw as any).y = 0;
				(record._raw as any).created_at = now;
			});

			await this.database.get<Galaxy>('galaxies').create((record) => {
				(record._raw as any).id = jadesId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'JADES-GS-z14-0';
				(record._raw as any).x = 1000;
				(record._raw as any).y = 0;
				(record._raw as any).created_at = now;
			});

			// Create star systems
			await this.database.get('star_systems').create((record) => {
				(record._raw as any).id = sysEarthId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).galaxy_id = milkyWayId;
				(record._raw as any).name = 'Sol System';
				(record._raw as any).x = 0;
				(record._raw as any).y = 0;
				(record._raw as any).description = 'The home system of Earth.';
				(record._raw as any).image = null;
				(record._raw as any).created_at = now;
			});

			await this.database.get('star_systems').create((record) => {
				(record._raw as any).id = sysIcarusId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).galaxy_id = milkyWayId;
				(record._raw as any).name = 'Icarus System';
				(record._raw as any).x = 100;
				(record._raw as any).y = 200;
				(record._raw as any).description = 'Remote system with Icarus planet.';
				(record._raw as any).image = null;
				(record._raw as any).created_at = now;
			});

			await this.database.get('star_systems').create((record) => {
				(record._raw as any).id = sysDestinyId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).galaxy_id = jadesId;
				(record._raw as any).name = 'Destiny System';
				(record._raw as any).x = 500;
				(record._raw as any).y = 500;
				(record._raw as any).description = 'System where Destiny is found.';
				(record._raw as any).image = null;
				(record._raw as any).created_at = now;
			});

			// Create stars
			const solStarId = ulid();
			const icarusStarId = ulid();
			const destinyStarId = ulid();

			await this.database.get('stars').create((record) => {
				(record._raw as any).id = solStarId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).star_system_id = sysEarthId;
				(record._raw as any).name = 'Sol';
				(record._raw as any).type = 'yellow dwarf';
				(record._raw as any).description = 'The Sun.';
				(record._raw as any).image = null;
				(record._raw as any).radius = 696340;
				(record._raw as any).mass = 1.989e30;
				(record._raw as any).temperature = 5778;
				(record._raw as any).luminosity = 1.0;
				(record._raw as any).age = 4.6e9;
				(record._raw as any).created_at = now;
			});

			await this.database.get('stars').create((record) => {
				(record._raw as any).id = icarusStarId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).star_system_id = sysIcarusId;
				(record._raw as any).name = 'Icarus';
				(record._raw as any).type = 'yellow dwarf';
				(record._raw as any).description = 'Star powering Icarus planet.';
				(record._raw as any).image = null;
				(record._raw as any).radius = 700000;
				(record._raw as any).mass = 2.0e30;
				(record._raw as any).temperature = 6000;
				(record._raw as any).luminosity = 1.2;
				(record._raw as any).age = 5.0e9;
				(record._raw as any).created_at = now;
			});

			await this.database.get('stars').create((record) => {
				(record._raw as any).id = destinyStarId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).star_system_id = sysDestinyId;
				(record._raw as any).name = 'Unknown';
				(record._raw as any).type = 'yellow dwarf';
				(record._raw as any).description = 'Star near Destiny.';
				(record._raw as any).image = null;
				(record._raw as any).radius = 700000;
				(record._raw as any).mass = 2.0e30;
				(record._raw as any).temperature = 6000;
				(record._raw as any).luminosity = 1.2;
				(record._raw as any).age = 5.0e9;
				(record._raw as any).created_at = now;
			});

			// Create planets
			await this.database.get('planets').create((record) => {
				(record._raw as any).id = earthId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).star_system_id = sysEarthId;
				(record._raw as any).name = 'Earth';
				(record._raw as any).type = 'terrestrial';
				(record._raw as any).created_at = now;
			});

			await this.database.get('planets').create((record) => {
				(record._raw as any).id = icarusId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).star_system_id = sysIcarusId;
				(record._raw as any).name = 'Icarus';
				(record._raw as any).type = 'terrestrial';
				(record._raw as any).created_at = now;
			});

			// Create races
			await this.database.get('races').create((record) => {
				(record._raw as any).id = ancientsRaceId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'Ancients';
				(record._raw as any).technology = JSON.stringify([]);
				(record._raw as any).ships = JSON.stringify([]);
				(record._raw as any).created_at = now;
			});

			await this.database.get('races').create((record) => {
				(record._raw as any).id = humanRaceId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'Human';
				(record._raw as any).technology = JSON.stringify([]);
				(record._raw as any).ships = JSON.stringify([]);
				(record._raw as any).created_at = now;
			});

			// Create technology
			await this.database.get('technology').create((record) => {
				(record._raw as any).id = ulid();
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'Stargate';
				(record._raw as any).description = 'Allows travel via the stargate network.';
				(record._raw as any).unlocked = true;
				(record._raw as any).cost = 0;
				(record._raw as any).image = null;
				(record._raw as any).number_on_destiny = 1;
				(record._raw as any).created_at = now;
			});

			// Create chevrons
			const chevronIds = [ulid(), ulid(), ulid(), ulid(), ulid(), ulid()];
			for (let i = 0; i < 6; i++) {
				await this.database.get('chevrons').create((record) => {
					(record._raw as any).id = chevronIds[i];
					(record._raw as any).game_id = gameId;
					(record._raw as any).stargate_id = destinyStargateId;
					(record._raw as any).symbol = String.fromCharCode(65 + i); // A, B, C, D, E, F
					(record._raw as any).description = `Chevron ${i + 1}`;
					(record._raw as any).image = null;
					(record._raw as any).created_at = now;
				});
			}

			// Create stargate
			await this.database.get('stargates').create((record) => {
				(record._raw as any).id = destinyStargateId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).address = JSON.stringify(chevronIds);
				(record._raw as any).type = 'master';
				(record._raw as any).location_id = destinyStargateRoomId;
				(record._raw as any).connected_to = JSON.stringify([]);
				(record._raw as any).created_at = now;
			});

			// Create people (crew)
			const crew = [
				{ name: 'Dr. Nicholas Rush', role: 'lead scientist', roomId: destinyBridgeId, description: 'Brilliant but secretive scientist.' },
				{ name: 'Eli Wallace', role: 'jr scientist', roomId: destinyBridgeId, description: 'Exceptionally gifted with mathematics and computers.' },
				{ name: 'Col. Everett Young', role: 'commanding officer', roomId: destinyBridgeId, description: 'Leader of the Destiny expedition.' },
				{ name: 'Lt. Matthew Scott', role: '2nd in command', roomId: destinyBridgeId, description: 'Young, resourceful, and loyal officer.' },
				{ name: 'MSgt. Ronald Greer', role: 'security', roomId: destinyBridgeId, description: 'Tough, loyal, and resourceful marine.' },
				{ name: 'Chloe Armstrong', role: 'civilian', roomId: destinyBridgeId, description: 'Daughter of a U.S. Senator, becomes a key member of the crew.' },
				{ name: 'Lt. Tamara Johansen', role: 'medic', roomId: destinyMedbayId, description: 'Field medic and trusted crew member.' },
				{ name: 'Dr. Dale Volker', role: 'scientist', roomId: destinyBridgeId, description: 'Astrophysicist, part of the science team.' },
				{ name: 'Dr. Adam Brody', role: 'scientist', roomId: destinyBridgeId, description: 'Engineer and science team member.' },
				{ name: 'Dr. Lisa Park', role: 'scientist', roomId: destinyBridgeId, description: 'Talented scientist and engineer.' },
				{ name: 'Lt. Vanessa James', role: 'security', roomId: destinyBridgeId, description: 'Security team member.' },
				{ name: 'Dr. Jeremy Franklin', role: 'scientist', roomId: destinyBridgeId, description: 'Brilliant but troubled scientist.' },
				{ name: 'Sgt. Hunter Riley', role: 'technician', roomId: destinyBridgeId, description: 'Technician and support crew.' },
			];

			for (const person of crew) {
				await this.database.get('people').create((record) => {
					(record._raw as any).id = ulid();
					(record._raw as any).game_id = gameId;
					(record._raw as any).race_id = humanRaceId;
					(record._raw as any).name = person.name;
					(record._raw as any).role = person.role;
					(record._raw as any).location = JSON.stringify({ roomId: person.roomId, shipId: destinyShipId });
					(record._raw as any).description = person.description;
					(record._raw as any).image = null;
					(record._raw as any).conditions = JSON.stringify([]);
					(record._raw as any).created_at = now;
				});
			}

			// Create rooms
			const rooms = [
				{ id: destinyBridgeId, type: 'bridge' },
				{ id: destinyStargateRoomId, type: 'stargate' },
				{ id: destinyEngineId, type: 'engine' },
				{ id: destinyMedbayId, type: 'medbay' },
			];

			for (const room of rooms) {
				await this.database.get('rooms').create((record) => {
					(record._raw as any).id = room.id;
					(record._raw as any).game_id = gameId;
					(record._raw as any).type = room.type;
					(record._raw as any).assigned = JSON.stringify([]);
					(record._raw as any).technology = JSON.stringify([]);
					(record._raw as any).created_at = now;
				});
			}

			// Create destiny status
			await this.database.get('destiny_status').create((record) => {
				(record._raw as any).id = destinyShipId;
				(record._raw as any).game_id = gameId;
				(record._raw as any).name = 'Destiny';
				(record._raw as any).power = 800;
				(record._raw as any).max_power = 1000;
				(record._raw as any).shields = 400;
				(record._raw as any).max_shields = 500;
				(record._raw as any).hull = 900;
				(record._raw as any).max_hull = 1000;
				(record._raw as any).race_id = ancientsRaceId;
				(record._raw as any).crew = JSON.stringify([]);
				(record._raw as any).location = JSON.stringify({ systemId: sysDestinyId });
				(record._raw as any).stargate_id = destinyStargateId;
				(record._raw as any).shield = JSON.stringify({ strength: 400, max: 500, coverage: 80 });
				(record._raw as any).inventory = JSON.stringify({});
				(record._raw as any).unlocked_rooms = JSON.stringify([]);
				(record._raw as any).crew_status = JSON.stringify({
					onboard: 12,
					capacity: 100,
					manifest: [],
				});
				(record._raw as any).atmosphere = JSON.stringify({
					co2: 0.04,
					o2: 20.9,
					co2Scrubbers: 1,
					o2Scrubbers: 1,
				});
				(record._raw as any).weapons = JSON.stringify({
					mainGun: true,
					turrets: { total: 6, working: 3 },
				});
				(record._raw as any).shuttles = JSON.stringify({ total: 2, working: 1, damaged: 1 });
				(record._raw as any).rooms = JSON.stringify(rooms);
				(record._raw as any).notes = JSON.stringify(['One shuttle is damaged. Some rooms are locked.']);
				(record._raw as any).created_at = now;
			});

			return gameId;
		});
	}
}
