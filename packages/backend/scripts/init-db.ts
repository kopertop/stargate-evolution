import { Sequelize } from 'sequelize-typescript';

import { CheveronSymbol } from '../src/models/cheveron-symbol';
import { DestinyStatus } from '../src/models/destiny-status';
import { Galaxy } from '../src/models/galaxy';
import { Game } from '../src/models/game';
import { Person } from '../src/models/person';
import { Planet } from '../src/models/planet';
import { Race } from '../src/models/race';
import { Room } from '../src/models/room';
import { Ship } from '../src/models/ship';
import { Star } from '../src/models/star';
import { StarSystem } from '../src/models/star-system';
import { Stargate } from '../src/models/stargate';
import { Technology } from '../src/models/technology';

const ALL_MODELS = [
	Game, Galaxy, StarSystem, Star, Planet, Person, Technology, Race, Ship, Stargate, CheveronSymbol, Room, DestinyStatus,
];

async function main() {
	const sequelize = new Sequelize({
		dialect: 'sqlite',
		storage: process.env.DB_PATH || './dev.sqlite',
		logging: false,
		models: ALL_MODELS,
	});
	await sequelize.sync({ force: true });
	console.log('All tables created!');
	await sequelize.close();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
