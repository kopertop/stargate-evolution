import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

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
	@readonly @date('created_at') createdAt!: Date;
	@readonly @date('updated_at') updatedAt!: Date;
}
