import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';
import Race from './race';

export default class Person extends Model {
	static table = 'people';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		race: { type: 'belongs_to' as const, key: 'race_id' },
	};

	@text('game_id') gameId!: string;
	@text('race_id') raceId!: string;
	@text('name') name!: string;
	@text('role') role!: string;
	@text('location') location!: string; // JSON
	@text('description') description?: string;
	@text('image') image?: string;
	@text('conditions') conditions!: string; // JSON array
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
	@relation('races', 'race_id') race!: Race;
}
