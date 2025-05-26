import { Model, Relation } from '@nozbe/watermelondb';
import { children, date, field, readonly, text } from '@nozbe/watermelondb/decorators';

import type DestinyStatus from './destiny-status';

export default class Game extends Model {
	static table = 'games';
	static associations = {
		galaxies: { type: 'has_many' as const, foreignKey: 'game_id' },
		star_systems: { type: 'has_many' as const, foreignKey: 'game_id' },
		stars: { type: 'has_many' as const, foreignKey: 'game_id' },
		planets: { type: 'has_many' as const, foreignKey: 'game_id' },
		people: { type: 'has_many' as const, foreignKey: 'game_id' },
		technology: { type: 'has_many' as const, foreignKey: 'game_id' },
		races: { type: 'has_many' as const, foreignKey: 'game_id' },
		ships: { type: 'has_many' as const, foreignKey: 'game_id' },
		stargates: { type: 'has_many' as const, foreignKey: 'game_id' },
		chevrons: { type: 'has_many' as const, foreignKey: 'game_id' },
		rooms: { type: 'has_many' as const, foreignKey: 'game_id' },
		destiny_status: { type: 'has_many' as const, foreignKey: 'game_id' },
	};

	@text('name') name!: string;
	@field('total_time_progressed') totalTimeProgressed!: number; // total hours progressed since game start
	@field('last_played') lastPlayed!: Date; // last time the game was played
	@readonly @date('created_at') createdAt!: Date;
	@date('updated_at') updatedAt!: Date;

	@children('destiny_status') destinyStatus!: Relation<DestinyStatus>;
}
