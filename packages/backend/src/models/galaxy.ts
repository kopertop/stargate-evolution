import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'galaxies', timestamps: false })
export class Galaxy extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.STRING)
	declare description?: string;

	@Column(DataType.STRING)
	declare image?: string;

	@Column(DataType.FLOAT)
	declare x: number;

	@Column(DataType.FLOAT)
	declare y: number;

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
