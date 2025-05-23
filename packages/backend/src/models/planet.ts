import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';
import { StarSystem } from './star-system';

@Table({ tableName: 'planets', timestamps: false })
export class Planet extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.STRING)
	declare type: string;

	@Column(DataType.JSON)
	declare resources: string[];

	@Column(DataType.JSON)
	declare inhabitants: string[];

	@Column(DataType.STRING)
	declare stargateId?: string;

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
