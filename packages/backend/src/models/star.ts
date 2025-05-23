import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';
import { StarSystem } from './star-system';

@Table({ tableName: 'stars', timestamps: false })
export class Star extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.STRING)
	declare type: string;

	@Column(DataType.STRING)
	declare description?: string;

	@Column(DataType.STRING)
	declare image?: string;

	@Column(DataType.FLOAT)
	declare radius: number;

	@Column(DataType.FLOAT)
	declare mass: number;

	@Column(DataType.FLOAT)
	declare temperature: number;

	@Column(DataType.FLOAT)
	declare luminosity: number;

	@Column(DataType.FLOAT)
	declare age: number;

	@ForeignKey(() => StarSystem)
	@Column(DataType.STRING)
	declare starSystemId: string;

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => StarSystem)
	declare starSystem: StarSystem;

	@BelongsTo(() => Game)
	declare game: Game;
}
