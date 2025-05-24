import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'games', timestamps: false })
export class Game extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare userId: string;

	@Column(DataType.STRING)
	declare name: string;

	@Column(DataType.DATE)
	declare createdAt: Date;

	@Column(DataType.DATE)
	declare updatedAt: Date;
}
