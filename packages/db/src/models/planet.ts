import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';
import StarSystem from './star-system';

export default class Planet extends Model {
	static table = 'planets';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		star_system: { type: 'belongs_to' as const, key: 'star_system_id' },
	};

	@text('game_id') gameId!: string;
	@text('star_system_id') starSystemId!: string;
	@text('name') name!: string;
	@text('type') type!: string;
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
	@relation('star_systems', 'star_system_id') starSystem!: StarSystem;
}
