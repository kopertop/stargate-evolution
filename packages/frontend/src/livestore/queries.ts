import { queryDb } from '@livestore/livestore';

import { tables } from './schema';

// Game queries
export const allGames$ = queryDb(
	() => tables.games,
	{ label: 'allGames' },
);

export const gameById$ = (gameId: string) => queryDb(
	() => tables.games.where({ id: gameId }),
	{ label: `gameById:${gameId}` },
);

// Room queries
export const roomsByGameId$ = (gameId: string) => queryDb(
	() => tables.rooms.where({ gameId }),
	{ label: `roomsByGameId:${gameId}` },
);

export const roomById$ = (roomId: string) => queryDb(
	() => tables.rooms.where({ id: roomId }),
	{ label: `roomById:${roomId}` },
);

export const unexploredRooms$ = (gameId: string) => queryDb(
	() => tables.rooms.where({ gameId, explored: false }),
	{ label: `unexploredRooms:${gameId}` },
);

// Destiny status queries
export const destinyStatusByGameId$ = (gameId: string) => queryDb(
	() => tables.destinyStatus.where({ gameId }),
	{ label: `destinyStatusByGameId:${gameId}` },
);

// People queries
export const peopleByGameId$ = (gameId: string) => queryDb(
	() => tables.people.where({ gameId }),
	{ label: `peopleByGameId:${gameId}` },
);

export const crewMembers$ = (gameId: string) => queryDb(
	() => tables.people.where({ gameId }),
	{ label: `crewMembers:${gameId}` },
);

// Technology queries
export const technologyByGameId$ = (gameId: string) => queryDb(
	() => tables.technology.where({ gameId }),
	{ label: `technologyByGameId:${gameId}` },
);

export const unlockedTechnology$ = (gameId: string) => queryDb(
	() => tables.technology.where({ gameId, unlocked: true }),
	{ label: `unlockedTechnology:${gameId}` },
);

// UI state queries
export const uiState$ = queryDb(
	() => tables.uiState,
	{ label: 'uiState' },
);
