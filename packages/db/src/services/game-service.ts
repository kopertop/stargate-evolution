import { Database, Q } from '@nozbe/watermelondb';
import { writer } from '@nozbe/watermelondb/decorators';
import { synchronize } from '@nozbe/watermelondb/sync';
import sleep from '@stargate/common/src/sleep';

import DestinyStatus from '../models/destiny-status';
import Galaxy from '../models/galaxy';
import Game from '../models/game';
import Person from '../models/person';
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

		// Create default crew members
		console.log('Creating default crew members...');

		const defaultCrew = [
			{
				name: 'Colonel Young',
				role: 'commanding_officer',
				skills: ['leadership', 'military_tactics', 'weapons'],
				description: 'Commanding officer of the Destiny expedition. Military leader with extensive combat experience.',
				image: 'colonel-young.png',
			},
			{
				name: 'Eli Wallace',
				role: 'systems_specialist',
				skills: ['ancient_technology', 'computer_systems', 'mathematics'],
				description: 'Brilliant young mathematician and gamer recruited for his problem-solving abilities.',
				image: 'eli-wallace.png',
			},
			{
				name: 'Dr. Nicholas Rush',
				role: 'chief_scientist',
				skills: ['ancient_technology', 'physics', 'engineering'],
				description: 'Brilliant but obsessive scientist specializing in Ancient technology.',
				image: 'dr-rush.png',
			},
			{
				name: 'Lt. Matthew Scott',
				role: 'military_officer',
				skills: ['military_tactics', 'piloting', 'reconnaissance'],
				description: 'Young military officer and pilot with strong leadership potential.',
				image: 'lt-scott.png',
			},
			{
				name: 'Sergeant Greer',
				role: 'security_chief',
				skills: ['weapons', 'security', 'combat'],
				description: 'Tough marine sergeant responsible for ship security and combat operations.',
				image: 'greer.png',
			},
			{
				name: 'Dr. Tamara James',
				role: 'chief_medical_officer',
				skills: ['medical', 'surgery', 'biology'],
				description: 'Chief medical officer responsible for crew health and medical research.',
				image: 'dr-james.png',
			},
			{
				name: 'Dr. Lisa Park',
				role: 'scientist',
				skills: ['biology', 'medical', 'research'],
				description: 'Scientist specializing in biological research and environmental analysis.',
				image: 'dr-park.png',
			},
			{
				name: 'Chloe Armstrong',
				role: 'civilian',
				skills: ['diplomacy', 'linguistics', 'research'],
				description: 'Civilian member of the expedition with diplomatic and research skills.',
				image: 'chloe-armstrong.png',
			},
		];

		for (const crewData of defaultCrew) {
			const person = await this.database.get('people').create((personRecord: any) => {
				personRecord.gameId = gameId;
				personRecord.raceId = humanRace.id;
				personRecord.name = crewData.name;
				personRecord.role = crewData.role;
				personRecord.location = JSON.stringify({ shipId: 'destiny' });
				personRecord.assignedTo = null; // Not assigned to any room initially
				personRecord.skills = JSON.stringify(crewData.skills);
				personRecord.description = crewData.description;
				personRecord.image = crewData.image;
				personRecord.conditions = JSON.stringify([]);
			});
			console.log(`Created crew member: ${crewData.name} (${person.id})`);
		}

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
		console.log('Creating ship room layout with grid system...');

		// Main Floor (Floor 0) - Core ship operations
		// Gate room: 3x3 grid centered at origin, spans from (-1,-1) to (2,2)
		const gateRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'gate_room';
			room.gridX = -1;      // Top-left corner X
			room.gridY = -1;      // Top-left corner Y
			room.gridWidth = 3;   // 3 grid units wide
			room.gridHeight = 3;  // 3 grid units tall
			room.floor = 0;
			room.technology = JSON.stringify(['stargate', 'dialing_computer', 'shields']);
			room.image = 'stargate-room.png';
			room.found = true; // Gate room starts as discovered
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([]); // Will be updated after corridors are created
			room.doors = JSON.stringify([]); // Will be updated with door info later
		});

		// Corridors connected to gate room (north and south)
		// North corridor: 1x1 grid at (0, 2) - directly north of gate room
		const corridorNorth = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.gridX = 0;
			room.gridY = 2;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.image = 'corridor.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]); // Will be updated
			room.doors = JSON.stringify([]);
		});

		// South corridor: 1x1 grid at (0, -2) - directly south of gate room
		const corridorSouth = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.gridX = 0;
			room.gridY = -2;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.image = 'corridor.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]); // Will be updated
			room.doors = JSON.stringify([]);
		});

		// Bridge: 2x2 grid at (-1, 3) - north of north corridor
		const bridgeRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'bridge';
			room.gridX = -1;
			room.gridY = 3;
			room.gridWidth = 2;
			room.gridHeight = 2;
			room.floor = 0;
			room.technology = JSON.stringify(['ftl_drive_controls', 'sensors', 'communications', 'navigation']);
			room.image = 'bridge.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorNorth.id]);
			room.doors = JSON.stringify([]);
		});

		// Engineering: 2x2 grid at (-1, -4) - south of south corridor
		const engineeringRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'engineering';
			room.gridX = -1;
			room.gridY = -4;
			room.gridWidth = 2;
			room.gridHeight = 2;
			room.floor = 0;
			room.technology = JSON.stringify(['power_systems', 'ftl_drive', 'life_support', 'reactor_controls']);
			room.image = 'engineering.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorSouth.id]);
			room.doors = JSON.stringify([]);
		});

		// East corridor: 1x1 grid at (2, 0) - east of gate room
		const corridorEast = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.gridX = 2;
			room.gridY = 0;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.image = 'corridor.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]);
			room.doors = JSON.stringify([]);
		});

		// West corridor: 1x1 grid at (-2, 0) - west of gate room
		const corridorWest = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.gridX = -2;
			room.gridY = 0;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
			room.image = 'corridor.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([gateRoom.id]);
			room.doors = JSON.stringify([]);
		});

		// Medical Bay: 1x2 grid at (3, -1) - east of east corridor
		const medBayRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'medical_bay';
			room.gridX = 3;
			room.gridY = -1;
			room.gridWidth = 1;
			room.gridHeight = 2;
			room.floor = 0;
			room.technology = JSON.stringify(['medical_scanners', 'healing_pods', 'surgical_equipment']);
			room.image = 'medical-bay.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorEast.id]);
			room.doors = JSON.stringify([]);
		});

		// Mess Hall: 1x2 grid at (-3, -1) - west of west corridor
		const messHallRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'mess_hall';
			room.gridX = -3;
			room.gridY = -1;
			room.gridWidth = 1;
			room.gridHeight = 2;
			room.floor = 0;
			room.technology = JSON.stringify(['food_processors', 'water_recycling']);
			room.image = 'mess-hall.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorWest.id]);
			room.doors = JSON.stringify([]);
		});

		// Crew Quarters Section A: 1x1 grid at (2, 1) - northeast of gate room
		const quartersA = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'quarters';
			room.gridX = 2;
			room.gridY = 1;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['personal_storage', 'sleep_pods']);
			room.image = 'quarters.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorEast.id]);
			room.doors = JSON.stringify([]);
		});

		// Crew Quarters Section B: 1x1 grid at (-2, -1) - southwest of gate room
		const quartersB = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'quarters';
			room.gridX = -2;
			room.gridY = -1;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['personal_storage', 'sleep_pods']);
			room.image = 'quarters.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorWest.id]);
			room.doors = JSON.stringify([]);
		});

		// Elevator: 1x1 grid at (1, -2) - southeast of gate room
		const elevatorMain = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'elevator';
			room.gridX = 1;
			room.gridY = -2;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = 0;
			room.technology = JSON.stringify(['elevator_controls', 'artificial_gravity']);
			room.image = 'elevator.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([corridorSouth.id]); // Will connect to lower floor
			room.doors = JSON.stringify([]);
		});

		// Lower Floor (Floor -1) - Storage and specialized systems
		// Lower corridor: 1x1 grid at (1, -2) on floor -1
		const lowerCorridor = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'corridor';
			room.gridX = 1;
			room.gridY = -2;
			room.gridWidth = 1;
			room.gridHeight = 1;
			room.floor = -1;
			room.technology = JSON.stringify(['emergency_lighting', 'atmosphere_sensors']);
			room.image = 'corridor.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([elevatorMain.id]);
			room.doors = JSON.stringify([]);
		});

		// Hydroponics: 2x1 grid at (-1, -2) on floor -1
		const hydroponicsRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'hydroponics';
			room.gridX = -1;
			room.gridY = -2;
			room.gridWidth = 2;
			room.gridHeight = 1;
			room.floor = -1;
			room.technology = JSON.stringify(['growing_systems', 'air_recycling', 'water_filtration']);
			room.image = 'hydroponics.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
			room.doors = JSON.stringify([]);
		});

		// Storage Bay: 1x2 grid at (2, -3) on floor -1
		const storageBay = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'storage';
			room.gridX = 2;
			room.gridY = -3;
			room.gridWidth = 1;
			room.gridHeight = 2;
			room.floor = -1;
			room.technology = JSON.stringify(['cargo_systems', 'inventory_management']);
			room.image = 'storage.png';
			room.status = 'ok';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
			room.doors = JSON.stringify([]);
		});

		// Shuttle Bay: 2x2 grid at (3, -3) on floor -1, initially damaged
		const shuttleBayRoom = await this.database.get<Room>('rooms').create((room) => {
			room.gameId = gameId;
			room.type = 'shuttle_bay';
			room.gridX = 3;
			room.gridY = -3;
			room.gridWidth = 2;
			room.gridHeight = 2;
			room.floor = -1;
			room.technology = JSON.stringify(['shuttle_systems', 'docking_clamps', 'hangar_controls']);
			room.image = 'shuttle-bay.png';
			room.status = 'damaged';
			room.connectedRooms = JSON.stringify([lowerCorridor.id]);
			room.doors = JSON.stringify([]);
		});

		// Update connection arrays for all rooms directly within this writer transaction
		console.log('Updating room connections...');

		// Helper function to create door info
		const createDoorInfo = (toRoomId: string, state: 'closed' | 'opened' | 'locked' = 'closed', requirements: any[] = [], description?: string) => ({
			toRoomId,
			state,
			requirements,
			description,
		});

		// Helper function to create door requirements
		const createDoorRequirement = (type: 'code' | 'item' | 'technology' | 'crew_skill' | 'power_level' | 'story_progress', value: string, description: string, met: boolean = false) => ({
			type,
			value,
			description,
			met,
		});

		// Update gate room connections - starts with all doors closed
		await gateRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorNorth.id, corridorSouth.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorNorth.id, 'closed', [], 'Northern corridor access'),
				createDoorInfo(corridorSouth.id, 'closed', [], 'Southern corridor access'),
			]);
		});

		// Update corridor connections - some locked doors with requirements
		await corridorNorth.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([gateRoom.id, bridgeRoom.id, corridorEast.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(gateRoom.id, 'closed', [], 'Gate room access'),
				createDoorInfo(bridgeRoom.id, 'locked', [
					createDoorRequirement('code', 'bridge_access_code', 'Bridge requires an access code found in the ship\'s command protocols'),
				], 'Bridge command center - Locked'),
				createDoorInfo(corridorEast.id, 'closed', [], 'Eastern corridor'),
			]);
		});

		await corridorSouth.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([gateRoom.id, engineeringRoom.id, corridorWest.id, elevatorMain.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(gateRoom.id, 'closed', [], 'Gate room access'),
				createDoorInfo(engineeringRoom.id, 'locked', [
					createDoorRequirement('crew_skill', 'engineering_expertise', 'Engineering section requires advanced technical knowledge'),
					createDoorRequirement('power_level', '50', 'Engineering systems need at least 50 power to operate'),
				], 'Engineering section - Restricted'),
				createDoorInfo(corridorWest.id, 'closed', [], 'Western corridor'),
				createDoorInfo(elevatorMain.id, 'closed', [], 'Elevator to lower levels'),
			]);
		});

		await corridorEast.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorNorth.id, medBayRoom.id, quartersA.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorNorth.id, 'closed', [], 'Northern corridor'),
				createDoorInfo(medBayRoom.id, 'locked', [
					createDoorRequirement('technology', 'medical_scanner', 'Medical bay requires functional scanner systems'),
				], 'Medical bay - Biometric lock'),
				createDoorInfo(quartersA.id, 'closed', [], 'Crew quarters section A'),
			]);
		});

		await corridorWest.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorSouth.id, messHallRoom.id, quartersB.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorSouth.id, 'closed', [], 'Southern corridor'),
				createDoorInfo(messHallRoom.id, 'closed', [], 'Mess hall'),
				createDoorInfo(quartersB.id, 'closed', [], 'Crew quarters section B'),
			]);
		});

		// Update elevator connections - lower levels require power
		await elevatorMain.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorSouth.id, lowerCorridor.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorSouth.id, 'closed', [], 'Main corridor'),
				createDoorInfo(lowerCorridor.id, 'locked', [
					createDoorRequirement('power_level', '75', 'Elevator to lower levels requires significant power'),
					createDoorRequirement('technology', 'elevator_controls', 'Elevator systems must be operational'),
				], 'Lower levels - Power required'),
			]);
		});

		// Update bridge room connections - highly restricted
		await bridgeRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorNorth.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorNorth.id, 'locked', [
					createDoorRequirement('code', 'bridge_access_code', 'Bridge requires an access code found in the ship\'s command protocols'),
				], 'Exit to corridor - Locked from inside'),
			]);
		});

		// Update engineering room connections - technical requirements
		await engineeringRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorSouth.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorSouth.id, 'locked', [
					createDoorRequirement('crew_skill', 'engineering_expertise', 'Engineering section requires advanced technical knowledge'),
					createDoorRequirement('power_level', '50', 'Engineering systems need at least 50 power to operate'),
				], 'Exit to corridor - Technical lock'),
			]);
		});

		// Update medical bay connections
		await medBayRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorEast.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorEast.id, 'locked', [
					createDoorRequirement('technology', 'medical_scanner', 'Medical bay requires functional scanner systems'),
				], 'Exit to corridor - Biometric lock'),
			]);
		});

		// Update mess hall connections - simple access
		await messHallRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorWest.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorWest.id, 'closed', [], 'Exit to corridor'),
			]);
		});

		// Update quarters connections - residential access
		await quartersA.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorEast.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorEast.id, 'closed', [], 'Exit to corridor'),
			]);
		});

		await quartersB.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([corridorWest.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(corridorWest.id, 'closed', [], 'Exit to corridor'),
			]);
		});

		// Update lower corridor connections - all locked initially
		await lowerCorridor.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([elevatorMain.id, hydroponicsRoom.id, storageBay.id, shuttleBayRoom.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(elevatorMain.id, 'locked', [
					createDoorRequirement('power_level', '75', 'Elevator requires significant power'),
					createDoorRequirement('technology', 'elevator_controls', 'Elevator systems must be operational'),
				], 'Elevator to main level'),
				createDoorInfo(hydroponicsRoom.id, 'locked', [
					createDoorRequirement('story_progress', 'food_shortage', 'Access to hydroponics is critical during food shortages'),
					createDoorRequirement('technology', 'air_recycling', 'Hydroponics requires functioning life support systems'),
				], 'Hydroponics bay - Environmental lock'),
				createDoorInfo(storageBay.id, 'closed', [], 'Storage bay'),
				createDoorInfo(shuttleBayRoom.id, 'locked', [
					createDoorRequirement('item', 'shuttle_repair_kit', 'Shuttle bay door is damaged and requires repair'),
					createDoorRequirement('crew_skill', 'pilot_certification', 'Shuttle bay requires qualified pilot access'),
				], 'Shuttle bay - Damaged door'),
			]);
		});

		// Update hydroponics connections
		await hydroponicsRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([lowerCorridor.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(lowerCorridor.id, 'locked', [
					createDoorRequirement('story_progress', 'food_shortage', 'Access to hydroponics is critical during food shortages'),
					createDoorRequirement('technology', 'air_recycling', 'Hydroponics requires functioning life support systems'),
				], 'Exit to corridor - Environmental lock'),
			]);
		});

		// Update storage bay connections
		await storageBay.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([lowerCorridor.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(lowerCorridor.id, 'closed', [], 'Exit to corridor'),
			]);
		});

		// Update shuttle bay connections
		await shuttleBayRoom.update((roomRecord) => {
			roomRecord.connectedRooms = JSON.stringify([lowerCorridor.id]);
			roomRecord.doors = JSON.stringify([
				createDoorInfo(lowerCorridor.id, 'locked', [
					createDoorRequirement('item', 'shuttle_repair_kit', 'Shuttle bay door is damaged and requires repair'),
					createDoorRequirement('crew_skill', 'pilot_certification', 'Shuttle bay requires qualified pilot access'),
				], 'Exit to corridor - Damaged door'),
			]);
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
}

