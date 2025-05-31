import { queryDb, Schema, sql, State } from '@livestore/livestore';

import { tables } from './schema';

// Game queries
export const allGames$ = queryDb(
	() => tables.games,
	{ label: 'allGames' },
);

export const gameById$ = (game_id: string) => queryDb(
	() => tables.games.where({ id: game_id }),
	{ label: `gameById:${game_id}` },
);

// Room queries
export const roomsBygame_id$ = (game_id: string) => queryDb(
	() => tables.rooms.where({ game_id }),
	{ label: `roomsBygame_id:${game_id}` },
);

export const roomById$ = (roomId: string) => queryDb(
	() => tables.rooms.where({ id: roomId }),
	{ label: `roomById:${roomId}` },
);

export const unexploredRooms$ = (game_id: string) => queryDb(
	() => tables.rooms.where({ game_id, explored: false }),
	{ label: `unexploredRooms:${game_id}` },
);

export const doorsForRoom$ = (room_id: string) => queryDb({
	query: sql`select * from doors where from_room_id = ? OR to_room_id = ?`,
	bindValues: [room_id, room_id],
	schema: Schema.Array(tables.doors.rowSchema),
});

// Destiny status queries
export const destinyStatusBygame_id$ = (game_id: string) => queryDb(
	() => tables.destinyStatus.where({ id: game_id }),
	{ label: `destinyStatusBygame_id:${game_id}` },
);

// People queries
export const peopleBygame_id$ = (game_id: string) => queryDb(
	() => tables.people.where({ game_id }),
	{ label: `peopleBygame_id:${game_id}` },
);

export const crewMembers$ = (game_id: string) => queryDb(
	() => tables.people.where({ game_id }),
	{ label: `crewMembers:${game_id}` },
);

// Technology queries
export const technologyBygame_id$ = (game_id: string) => queryDb(
	() => tables.technology.where({ game_id }),
	{ label: `technologyBygame_id:${game_id}` },
);

export const unlockedTechnology$ = (game_id: string) => queryDb(
	() => tables.technology.where({ game_id, unlocked: true }),
	{ label: `unlockedTechnology:${game_id}` },
);

// UI state queries
export const uiState$ = queryDb(
	() => tables.uiState,
	{ label: 'uiState' },
);

// Inventory queries
export const inventoryBygame_id$ = (game_id: string) => queryDb(
	() => tables.inventory.where({ game_id }),
	{ label: `inventoryBygame_id:${game_id}` },
);

export const inventoryByLocation$ = (game_id: string, location: string) => queryDb(
	() => tables.inventory.where({ game_id, location }),
	{ label: `inventoryByLocation:${game_id}:${location}` },
);

export const inventoryByResourceType$ = (game_id: string, resourceType: string) => queryDb(
	() => tables.inventory.where({ game_id, resource_type: resourceType }),
	{ label: `inventoryByResourceType:${game_id}:${resourceType}` },
);

// Galaxy and star system queries
export const galaxiesBygame_id$ = (game_id: string) => queryDb(
	() => tables.galaxies.where({ game_id }),
	{ label: `galaxiesBygame_id:${game_id}` },
);

export const starSystemsBygame_id$ = (game_id: string) => queryDb(
	() => tables.starSystems.where({ game_id }),
	{ label: `starSystemsBygame_id:${game_id}` },
);

export const starSystemsByGalaxyId$ = (galaxyId: string) => queryDb(
	() => tables.starSystems.where({ galaxy_id: galaxyId }),
	{ label: `starSystemsByGalaxyId:${galaxyId}` },
);

export const starSystemById$ = (systemId: string) => queryDb(
	() => tables.starSystems.where({ id: systemId }),
	{ label: `starSystemById:${systemId}` },
);

export const starsBySystemId$ = (systemId: string) => queryDb(
	() => tables.stars.where({ star_system_id: systemId }),
	{ label: `starsBySystemId:${systemId}` },
);

// Door queries
export const doorsByGame$ = (game_id: string) => queryDb(
	() => tables.doors.where({ game_id }),
	{ label: `doorsByGame:${game_id}` },
);
