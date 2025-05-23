import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

import { Game } from './game';
import { Stargate } from './stargate';

@Table({ tableName: 'chevrons', timestamps: false })
export class CheveronSymbol extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare symbol: string;

	@Column(DataType.STRING)
	declare description?: string;

	@Column(DataType.STRING)
	declare image?: string;

	@ForeignKey(() => Stargate)
	@Column(DataType.STRING)
	declare stargateId: string;

	@ForeignKey(() => Game)
	@Column(DataType.STRING)
	declare gameId: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@BelongsTo(() => Stargate)
	declare stargate: Stargate;

	@BelongsTo(() => Game)
	declare game: Game;
}
