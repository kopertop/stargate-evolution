import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Galaxy from './galaxy';
import Game from './game';

export default class StarSystem extends Model {
	static table = 'star_systems';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		galaxy: { type: 'belongs_to' as const, key: 'galaxy_id' },
		stars: { type: 'has_many' as const, foreignKey: 'star_system_id' },
		planets: { type: 'has_many' as const, foreignKey: 'star_system_id' },
	};

	@text('game_id') gameId!: string;
	@text('galaxy_id') galaxyId!: string;
	@text('name') name!: string;
	@field('x') x!: number;
	@field('y') y!: number;
	@text('description') description?: string;
	@text('image') image?: string;
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
	@relation('galaxies', 'galaxy_id') galaxy!: Galaxy;
}
