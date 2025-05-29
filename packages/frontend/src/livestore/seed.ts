import { Store } from '@livestore/livestore';

import { events, schema } from './schema';

export const createSampleGame = (store: Store<typeof schema>) => {
	const gameId = crypto.randomUUID();
	const now = new Date();

	// Create the game
	store.commit(
		events.gameCreated({
			id: gameId,
			name: 'Test Game',
			createdAt: now,
		}),
	);

	return gameId;
};

export const createSampleDestinyStatus = (store: Store<typeof schema>, gameId: string) => {
	// This would typically be done through a specific event, but for now we'll add it directly
	// In a real app, you'd want to create specific events for ship initialization
	console.log('Sample Destiny status creation would go here for game:', gameId);
	// You can add specific Destiny status creation logic later
};

export const createSampleRooms = (store: Store<typeof schema>, gameId: string) => {
	// Sample room data - you can expand this based on your game's room templates
	const sampleRooms = [
		{
			type: 'gate_room',
			floor: 1,
			technology: JSON.stringify(['stargate']),
			status: 'ok',
		},
		{
			type: 'control_room',
			floor: 1,
			technology: JSON.stringify(['computers', 'sensors']),
			status: 'ok',
		},
		{
			type: 'quarters',
			floor: 2,
			technology: JSON.stringify([]),
			status: 'damaged',
		},
	];

	console.log('Sample rooms creation would go here for game:', gameId, sampleRooms);
	// You can implement room creation events later
};

export const updateUIState = (store: Store<typeof schema>, updates: Partial<{
	selectedGameId: string;
	currentView: string;
	selectedRoomId: string;
	mapZoom: number;
	mapCenterX: number;
	mapCenterY: number;
}>) => {
	store.commit(events.uiStateSet(updates));
};
