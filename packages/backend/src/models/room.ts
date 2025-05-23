import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'rooms', timestamps: false })
export class Room extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare type: string;

	@Column(DataType.JSON)
	declare assigned: string[];

	@Column(DataType.JSON)
	declare technology: any[];

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
