import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'ships', timestamps: false })
export class Ship extends Model {
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

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
