import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class Stargate extends Model {
	static table = 'stargates';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		chevrons: { type: 'has_many' as const, foreignKey: 'stargate_id' },
	};

	@text('game_id') gameId!: string;
	@text('address') address!: string; // JSON array
	@text('type') type!: string;
	@text('location_id') locationId?: string;
	@text('connected_to') connectedTo!: string; // JSON array
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
