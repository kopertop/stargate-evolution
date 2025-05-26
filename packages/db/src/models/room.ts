import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Room extends Model {
	static table = 'rooms';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
	};

	@text('game_id') gameId!: string;
	@text('type') type!: string;
	@field('grid_x') gridX!: number; // Grid position (top-left corner)
	@field('grid_y') gridY!: number; // Grid position (top-left corner)
	@field('grid_width') gridWidth!: number; // Width in grid units
	@field('grid_height') gridHeight!: number; // Height in grid units
	@field('floor') floor!: number; // Floor level (0 = main deck, negative = lower, positive = upper)
	@text('technology') technology!: string; // JSON array
	@text('image') image?: string; // Optional room-specific image
	@field('found') found!: boolean; // Whether the room has been discovered
	@field('explored') explored!: boolean; // Whether the room has been explored
	@field('locked') locked!: boolean; // Whether the room is locked (reverse of unlocked)
	@text('status') status!: 'damaged' | 'destroyed' | 'ok';
	@text('connected_rooms') connectedRooms!: string; // JSON array of room IDs (for backwards compatibility)
	@text('doors') doors!: string; // JSON array of door info with states and requirements
	@text('exploration_data') explorationData?: string; // JSON object for ongoing exploration progress
	@field('base_exploration_time') baseExplorationTime!: number; // Base exploration time in hours
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
