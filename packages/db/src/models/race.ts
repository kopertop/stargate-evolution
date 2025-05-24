import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Race extends Model {
	static table = 'races';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		people: { type: 'has_many' as const, foreignKey: 'race_id' },
		ships: { type: 'has_many' as const, foreignKey: 'race_id' },
	};

	@text('game_id') gameId!: string;
	@text('name') name!: string;
	@text('technology') technology!: string; // JSON array
	@text('ships') ships!: string; // JSON array
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
