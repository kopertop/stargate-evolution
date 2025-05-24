import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Galaxy } from './galaxy';
import { Game } from './game';

@Table({ tableName: 'star_systems', timestamps: false })
export class StarSystem extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.FLOAT)
	declare x: number;

	@Column(DataType.FLOAT)
	declare y: number;

	@Column(DataType.STRING)
	declare description?: string;

	@Column(DataType.STRING)
	declare image?: string;

	@ForeignKey(() => Galaxy)
	@Column(DataType.STRING)
	declare galaxyId: string;

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Galaxy)
	declare galaxy: Galaxy;

	@BelongsTo(() => Game)
	declare game: Game;
}
