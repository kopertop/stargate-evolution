import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Room extends Model {
	static table = 'rooms';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
	};

	@text('game_id') gameId!: string;
	@text('type') type!: string;
	@text('assigned') assigned!: string; // JSON array
	@text('technology') technology!: string; // JSON array
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
