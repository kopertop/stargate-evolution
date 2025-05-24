import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Technology extends Model {
	static table = 'technology';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
	};

	@text('game_id') gameId!: string;
	@text('name') name!: string;
	@text('description') description!: string;
	@field('unlocked') unlocked!: boolean;
	@field('cost') cost!: number;
	@text('image') image?: string;
	@field('number_on_destiny') numberOnDestiny?: number;
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
