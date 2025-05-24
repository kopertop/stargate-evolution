import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';
import Race from './race';

export default class Ship extends Model {
	static table = 'ships';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
		race: { type: 'belongs_to' as const, key: 'race_id' },
	};

	@text('game_id') gameId!: string;
	@text('race_id') raceId!: string;
	@text('name') name!: string;
	@field('power') power!: number;
	@field('max_power') maxPower!: number;
	@field('shields') shields!: number;
	@field('max_shields') maxShields!: number;
	@field('hull') hull!: number;
	@field('max_hull') maxHull!: number;
	@text('crew') crew!: string; // JSON array
	@text('location') location!: string; // JSON
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
	@relation('races', 'race_id') race!: Race;
}
