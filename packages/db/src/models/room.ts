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
	@field('x') x!: number; // Position coordinates
	@field('y') y!: number;
	@field('floor') floor!: number; // Floor level (0 = main deck, negative = lower, positive = upper)
	@field('width') width!: number; // Room width in pixels
	@field('height') height!: number; // Room height in pixels
	@text('technology') technology!: string; // JSON array
	@text('image') image?: string; // Optional room-specific image
	@field('found') found!: boolean; // Whether the room has been discovered
	@field('locked') locked!: boolean; // Whether the room is locked (reverse of unlocked)
	@text('status') status!: 'damaged' | 'destroyed' | 'ok';
	@text('connected_rooms') connectedRooms!: string; // JSON array of room IDs (for backwards compatibility)
	@text('doors') doors!: string; // JSON array of door info with states and requirements
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
