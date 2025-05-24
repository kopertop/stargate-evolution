import { Model } from '@nozbe/watermelondb';
import { date, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';
import Stargate from './stargate';

export default class Chevron extends Model {
	static table = 'chevrons';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		stargate: { type: 'belongs_to' as const, key: 'stargate_id' },
	};

	@text('game_id') gameId!: string;
	@text('stargate_id') stargateId!: string;
	@text('symbol') symbol!: string;
	@text('description') description?: string;
	@text('image') image?: string;
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
	@relation('stargates', 'stargate_id') stargate!: Stargate;
}
