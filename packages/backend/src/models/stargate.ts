import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';

@Table({ tableName: 'stargates', timestamps: false })
export class Stargate extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.JSON)
	declare address: any[];

	@Column(DataType.STRING)
	declare type: string;

	@Column(DataType.STRING)
	declare locationId: string;

	@Column(DataType.JSON)
	declare connectedTo: string[];

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Game)
	declare game: Game;
}
