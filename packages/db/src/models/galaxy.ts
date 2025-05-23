import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Galaxy extends Model {
	static table = 'galaxies';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		star_systems: { type: 'has_many' as const, foreignKey: 'galaxy_id' },
	};

	@text('game_id') gameId!: string;
	@text('name') name!: string;
	@field('x') x!: number;
	@field('y') y!: number;
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
