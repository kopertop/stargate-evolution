// Removed WatermelonDB model imports

import { ulid } from 'ulid';

import type { StargateSchema } from '../livestore-schemas';
import type { RoomTemplate } from '../schemas';

import templateService, { type ParsedShipLayout } from './template-service';


export class GameService {
	private store: any;

	constructor(store: any) {
		this.store = store;
	}

	async createNewGameFromTemplates(shipLayoutId: string = 'destiny_layout'): Promise<string> {
		console.log('[GameService] Creating new game from templates (LiveStore)...');

		// Fetch templates from backend
		const [roomTemplates, personTemplates, raceTemplates, shipLayout] = await Promise.all([
			templateService.getAllRoomTemplates(),
			templateService.getAllPersonTemplates(),
			templateService.getAllRaceTemplates(),
			templateService.getShipLayoutById(shipLayoutId),
		]);

		if (!shipLayout) throw new Error(`Ship layout '${shipLayoutId}' not found`);

		// Create the game record
		const gameId = ulid();
		await this.store.insert('games', {
			id: gameId,
			name: 'New Stargate Game',
			totalTimeProgressed: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});

		// Create races from templates
		const raceMap = new Map<string, string>(); // template_id -> game_race_id
		for (const raceTemplate of raceTemplates) {
			const raceId = ulid();
			await this.store.insert('crew', {
				// This is a placeholder, should be 'races' table when schema is expanded
				id: raceId,
				gameId,
				name: raceTemplate.name,
				raceId: '',
				role: '',
				location: '',
				assignedTo: '',
				skills: JSON.stringify([]),
				description: '',
				image: '',
				conditions: JSON.stringify([]),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
			raceMap.set(raceTemplate.id, raceId);
		}

		// Create crew from person templates
		for (const personTemplate of personTemplates) {
			const crewId = ulid();
			const raceId = personTemplate.race_template_id ? raceMap.get(personTemplate.race_template_id) : '';
			await this.store.insert('crew', {
				id: crewId,
				gameId,
				raceId: raceId || '',
				name: personTemplate.name,
				role: personTemplate.role,
				location: personTemplate.default_location || JSON.stringify({ shipId: 'destiny' }),
				assignedTo: '',
				skills: JSON.stringify(personTemplate.skills || []),
				description: personTemplate.description || '',
				image: personTemplate.image || '',
				conditions: JSON.stringify([]),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
		}

		// Create rooms from ship layout and room templates
		await this.createRoomsFromLayout(gameId, shipLayout, roomTemplates);

		console.log('Game creation completed successfully!');
		return gameId;
	}

	private async createRoomsFromLayout(gameId: string, shipLayout: ParsedShipLayout, roomTemplates: RoomTemplate[]): Promise<void> {
		const templateMap = new Map<string, RoomTemplate>();
		for (const template of roomTemplates) templateMap.set(template.id, template);
		const roomIdMap = new Map<string, string>();

		// First pass: Create all rooms
		for (const layoutRoom of shipLayout.rooms) {
			const template = templateMap.get(layoutRoom.template_id);
			if (!template) continue;
			const roomId = ulid();
			await this.store.insert('rooms', {
				id: roomId,
				gameId,
				type: template.type,
				name: template.name,
				description: template.description ?? '',
				gridX: layoutRoom.position.x,
				gridY: layoutRoom.position.y,
				gridWidth: template.grid_width,
				gridHeight: template.grid_height,
				floor: layoutRoom.position.floor,
				technology: JSON.stringify(template.technology),
				image: template.image || '',
				status: template.default_status as 'ok' | 'damaged' | 'destroyed',
				found: layoutRoom.initial_state.found,
				locked: layoutRoom.initial_state.locked,
				explored: layoutRoom.initial_state.explored,
				connectedRooms: JSON.stringify([]),
				doors: JSON.stringify([]),
				baseExplorationTime: template.base_exploration_time ?? 2,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
			const layoutRoomId = layoutRoom.id || layoutRoom.template_id;
			roomIdMap.set(layoutRoomId, roomId);
		}

		// Second pass: Update connections and doors
		for (const layoutRoom of shipLayout.rooms) {
			const layoutRoomId = layoutRoom.id || layoutRoom.template_id;
			const actualRoomId = roomIdMap.get(layoutRoomId);
			if (!actualRoomId) continue;
			const connectedRoomIds = layoutRoom.connections
				.map(connId => roomIdMap.get(connId))
				.filter(id => id !== undefined);
			const roomDoors = shipLayout.doors
				.filter(door => door.from === layoutRoomId)
				.map(door => {
					const toRoomId = roomIdMap.get(door.to);
					if (!toRoomId) return null;
					return {
						toRoomId,
						state: door.initial_state as 'closed' | 'opened' | 'locked',
						requirements: door.requirements || [],
						description: door.description,
					};
				})
				.filter(Boolean);
			await this.store.update('rooms', actualRoomId, {
				connectedRooms: JSON.stringify(connectedRoomIds),
				doors: JSON.stringify(roomDoors),
				updatedAt: Date.now(),
			});
		}
	}

	// ...other methods to be refactored for LiveStore...
}

