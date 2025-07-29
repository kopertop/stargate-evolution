import { GameDataSchema } from '@stargate/common/models/game';
import { CreateSavedGameSchema, UpdateSavedGameSchema } from '@stargate/common/models/saved-game';
import { describe, it, expect } from 'vitest';

describe('Games API - Game Data Validation', () => {
	const problematicPayload = {
		'game_data': '{"destinyStatus":{"id":"destiny-1","name":"Destiny","power":85,"max_power":100,"shields":67,"max_shields":100,"hull":92,"max_hull":100,"water":78,"max_water":100,"food":45,"max_food":100,"spare_parts":34,"max_spare_parts":100,"medical_supplies":89,"max_medical_supplies":100,"race_id":"ancient","location":"{\\"system\\":\\"Pegasus Prime\\",\\"galaxy\\":\\"Pegasus\\",\\"sector\\":\\"Alpha\\"}","co2":0.04,"o2":20.9,"co2Scrubbers":5,"weapons":"{}","shuttles":"{}","current_time":25,"next_jump_time":86639.68572530238,"time_speed":1,"ftl_status":"normal_space","next_ftl_transition":24.059634923695103},"characters":[],"technologies":[],"exploredRooms":[],"explorationProgress":[],"currentGalaxy":null,"currentSystem":null,"knownGalaxies":[],"knownSystems":[],"playerPosition":{"x":1395.078210486803,"y":3.764501987817127,"roomId":"control_interface_room"},"doorStates":[{"id":"door_1751652494667_stargate_corridor_north_connector_gate_room","state":"closed","from_room_id":"stargate_corridor_north_connector","to_room_id":"gate_room","x":-4.9744740569846755,"y":-200,"width":32,"height":8,"rotation":0,"is_automatic":0,"open_direction":"inward","style":"standard","color":null,"requirements":null,"power_required":0}],"fogOfWar":{"0":{"-5,0":true,"-4,-3":true}},"mapZoom":1.024,"currentBackgroundType":"stars"}',
	};

	it('should fail validation when game_data is a JSON string instead of object', () => {
		// This simulates the current problematic behavior where frontend sends JSON string
		const result = CreateSavedGameSchema.safeParse({
			name: 'Test Game',
			description: 'Test Description',
			...problematicPayload,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toContain('game_data');
		}
	});

	it('should pass validation when game_data is properly parsed as object', () => {
		// This is how it should work - parse the JSON string first
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		const result = CreateSavedGameSchema.safeParse({
			name: 'Test Game',
			description: 'Test Description',
			game_data: gameDataObject,
		});

		expect(result.success).toBe(true);
	});

	it('should validate the parsed game data structure', () => {
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		const result = GameDataSchema.safeParse(gameDataObject);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.destinyStatus).toBeDefined();
			expect(result.data.destinyStatus.id).toBe('destiny-1');
			expect(result.data.playerPosition).toBeDefined();
			expect(result.data.playerPosition?.x).toBe(1395.078210486803);
			expect(result.data.fogOfWar).toBeDefined();
			expect(result.data.doorStates).toBeInstanceOf(Array);
		}
	});

	it('should handle update payload with JSON string game_data', () => {
		// Test the update schema as well
		const result = UpdateSavedGameSchema.safeParse({
			name: 'Updated Game',
			...problematicPayload,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toContain('game_data');
		}
	});

	it('should handle update payload with properly parsed game_data', () => {
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		const result = UpdateSavedGameSchema.safeParse({
			name: 'Updated Game',
			game_data: gameDataObject,
		});

		expect(result.success).toBe(true);
	});

	it('should validate fog of war data structure', () => {
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		// Check that fog of war data is properly structured
		expect(gameDataObject.fogOfWar).toBeDefined();
		expect(typeof gameDataObject.fogOfWar).toBe('object');

		// Check that it has floor-aware structure
		expect(gameDataObject.fogOfWar['0']).toBeDefined();
		expect(typeof gameDataObject.fogOfWar['0']).toBe('object');

		// Check specific fog tiles
		expect(gameDataObject.fogOfWar['0']['-5,0']).toBe(true);
		expect(gameDataObject.fogOfWar['0']['-4,-3']).toBe(true);
	});

	it('should validate door states structure', () => {
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		expect(gameDataObject.doorStates).toBeInstanceOf(Array);
		expect(gameDataObject.doorStates.length).toBeGreaterThan(0);

		const firstDoor = gameDataObject.doorStates[0];
		expect(firstDoor.id).toBeDefined();
		expect(firstDoor.state).toBe('closed');
		expect(firstDoor.from_room_id).toBeDefined();
		expect(firstDoor.to_room_id).toBeDefined();
	});

	it('should validate player position structure', () => {
		const gameDataObject = JSON.parse(problematicPayload.game_data);

		expect(gameDataObject.playerPosition).toBeDefined();
		expect(typeof gameDataObject.playerPosition.x).toBe('number');
		expect(typeof gameDataObject.playerPosition.y).toBe('number');
		expect(typeof gameDataObject.playerPosition.roomId).toBe('string');
		expect(gameDataObject.playerPosition.roomId).toBe('control_interface_room');
	});
});
