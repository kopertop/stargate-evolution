import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'destiny_status', timestamps: false })
export class DestinyStatus extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.INTEGER)
	declare power: number;

	@Column(DataType.INTEGER)
	declare maxPower: number;

	@Column(DataType.INTEGER)
	declare shields: number;

	@Column(DataType.INTEGER)
	declare maxShields: number;

	@Column(DataType.INTEGER)
	declare hull: number;

	@Column(DataType.INTEGER)
	declare maxHull: number;

	@Column(DataType.STRING)
	declare raceId: string;

	@Column(DataType.JSON)
	declare crew: string[];

	@Column(DataType.JSON)
	declare location: Record<string, any>;

	@Column(DataType.STRING)
	declare stargateId?: string;

	@Column(DataType.JSON)
	declare shield: Record<string, any>;

	@Column(DataType.JSON)
	declare inventory: Record<string, number>;

	@Column(DataType.JSON)
	declare unlockedRooms: string[];

	@Column(DataType.JSON)
	declare crewStatus: Record<string, any>;

	@Column(DataType.JSON)
	declare atmosphere: Record<string, any>;

	@Column(DataType.JSON)
	declare weapons: Record<string, any>;

	@Column(DataType.JSON)
	declare shuttles: Record<string, any>;

	@Column(DataType.JSON)
	declare rooms: any[];

	@Column(DataType.JSON)
	declare notes?: string[];

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
