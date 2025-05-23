import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'people', timestamps: false })
export class Person extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.STRING)
	declare raceId: string;

	@Column(DataType.STRING)
	declare role: string;

	@Column(DataType.JSON)
	declare location: Record<string, any>;

	@Column(DataType.STRING)
	declare description?: string;

	@Column(DataType.STRING)
	declare image?: string;

	@Column(DataType.JSON)
	declare conditions: string[];

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
