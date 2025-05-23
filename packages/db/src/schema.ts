import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
	version: 1,
	tables: [
		tableSchema({
			name: 'games',
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'created_at', type: 'number' },
				{ name: 'updated_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'galaxies',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'x', type: 'number' },
				{ name: 'y', type: 'number' },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'star_systems',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'galaxy_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'x', type: 'number' },
				{ name: 'y', type: 'number' },
				{ name: 'description', type: 'string', isOptional: true },
				{ name: 'image', type: 'string', isOptional: true },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'stars',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'star_system_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'type', type: 'string' },
				{ name: 'description', type: 'string', isOptional: true },
				{ name: 'image', type: 'string', isOptional: true },
				{ name: 'radius', type: 'number' },
				{ name: 'mass', type: 'number' },
				{ name: 'temperature', type: 'number' },
				{ name: 'luminosity', type: 'number' },
				{ name: 'age', type: 'number' },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'planets',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'star_system_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'type', type: 'string' },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'races',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'technology', type: 'string' }, // JSON array
				{ name: 'ships', type: 'string' }, // JSON array
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'people',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'race_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'role', type: 'string' },
				{ name: 'location', type: 'string' }, // JSON
				{ name: 'description', type: 'string', isOptional: true },
				{ name: 'image', type: 'string', isOptional: true },
				{ name: 'conditions', type: 'string' }, // JSON array
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'technology',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'description', type: 'string' },
				{ name: 'unlocked', type: 'boolean' },
				{ name: 'cost', type: 'number' },
				{ name: 'image', type: 'string', isOptional: true },
				{ name: 'number_on_destiny', type: 'number', isOptional: true },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'ships',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'race_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'power', type: 'number' },
				{ name: 'max_power', type: 'number' },
				{ name: 'shields', type: 'number' },
				{ name: 'max_shields', type: 'number' },
				{ name: 'hull', type: 'number' },
				{ name: 'max_hull', type: 'number' },
				{ name: 'crew', type: 'string' }, // JSON array
				{ name: 'location', type: 'string' }, // JSON
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'stargates',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'address', type: 'string' }, // JSON array
				{ name: 'type', type: 'string' },
				{ name: 'location_id', type: 'string', isOptional: true },
				{ name: 'connected_to', type: 'string' }, // JSON array
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'chevrons',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'stargate_id', type: 'string', isIndexed: true },
				{ name: 'symbol', type: 'string' },
				{ name: 'description', type: 'string', isOptional: true },
				{ name: 'image', type: 'string', isOptional: true },
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'rooms',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'type', type: 'string' },
				{ name: 'assigned', type: 'string' }, // JSON array
				{ name: 'technology', type: 'string' }, // JSON array
				{ name: 'created_at', type: 'number' },
			],
		}),
		tableSchema({
			name: 'destiny_status',
			columns: [
				{ name: 'game_id', type: 'string', isIndexed: true },
				{ name: 'name', type: 'string' },
				{ name: 'power', type: 'number' },
				{ name: 'max_power', type: 'number' },
				{ name: 'shields', type: 'number' },
				{ name: 'max_shields', type: 'number' },
				{ name: 'hull', type: 'number' },
				{ name: 'max_hull', type: 'number' },
				{ name: 'race_id', type: 'string' },
				{ name: 'crew', type: 'string' }, // JSON array
				{ name: 'location', type: 'string' }, // JSON
				{ name: 'stargate_id', type: 'string', isOptional: true },
				{ name: 'shield', type: 'string' }, // JSON
				{ name: 'inventory', type: 'string' }, // JSON
				{ name: 'unlocked_rooms', type: 'string' }, // JSON array
				{ name: 'crew_status', type: 'string' }, // JSON
				{ name: 'atmosphere', type: 'string' }, // JSON
				{ name: 'weapons', type: 'string' }, // JSON
				{ name: 'shuttles', type: 'string' }, // JSON
				{ name: 'rooms', type: 'string' }, // JSON array
				{ name: 'notes', type: 'string', isOptional: true }, // JSON array
				{ name: 'created_at', type: 'number' },
			],
		}),
	],
});
