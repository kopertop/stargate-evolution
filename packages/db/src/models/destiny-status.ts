import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';

import Game from './game';

export default class DestinyStatus extends Model {
	static table = 'destiny_status';
	static associations = {
		game: { type: 'belongs_to' as const, key: 'game_id' },
	};

	@text('game_id') gameId!: string;
	@text('name') name!: string;
	@field('power') power!: number;
	@field('max_power') maxPower!: number;
	@field('shields') shields!: number;
	@field('max_shields') maxShields!: number;
	@field('hull') hull!: number;
	@field('max_hull') maxHull!: number;
	@text('race_id') raceId!: string;
	@text('crew') crew!: string; // JSON array
	@text('location') location!: string; // JSON
	@text('stargate_id') stargateId?: string;
	@text('shield') shield!: string; // JSON
	@text('inventory') inventory!: string; // JSON
	@text('unlocked_rooms') unlockedRooms!: string; // JSON array
	@text('crew_status') crewStatus!: string; // JSON
	@text('atmosphere') atmosphere!: string; // JSON
	@text('weapons') weapons!: string; // JSON
	@text('shuttles') shuttles!: string; // JSON
	@text('rooms') rooms!: string; // JSON array
	@text('notes') notes?: string; // JSON array
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
