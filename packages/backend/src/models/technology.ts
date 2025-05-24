import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'technology', timestamps: false })
export class Technology extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.STRING)
	declare description: string;

	@Column(DataType.BOOLEAN)
	declare unlocked: boolean;

	@Column(DataType.INTEGER)
	declare cost: number;

	@Column(DataType.STRING)
	declare image?: string;

	@Column(DataType.JSON)
	declare abilities?: string[];

	@Column(DataType.INTEGER)
	declare number_on_destiny?: number;

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
