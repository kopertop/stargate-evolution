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
	@text('crew_status') crewStatus!: string; // JSON
	@text('atmosphere') atmosphere!: string; // JSON
	@text('weapons') weapons!: string; // JSON
	@text('shuttles') shuttles!: string; // JSON
	@text('notes') notes?: string; // JSON array
	@field('game_days') gameDays!: number;
	@field('game_hours') gameHours!: number;
	@text('ftl_status') ftlStatus!: string; // 'ftl' or 'normal_space'
	@field('next_ftl_transition') nextFtlTransition!: number; // hours until next FTL transition
	@readonly @date('created_at') createdAt!: Date;

	@relation('games', 'game_id') game!: Game;
}
