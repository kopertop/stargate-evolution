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
	@text('assigned') assigned!: string; // JSON array
	@text('technology') technology!: string; // JSON array
	@field('fond') fond!: boolean;
	@field('unlocked') unlocked!: boolean;
	@text('status') status!: 'damaged' | 'destroyed' | 'ok';
	@text('connected_rooms') connectedRooms!: string; // JSON array of room IDs
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
