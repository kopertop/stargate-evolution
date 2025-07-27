import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/game-store';
import { Game } from '../game';

export const useGameEngineSync = (gameRef: React.MutableRefObject<Game | null>) => {
	const store = useGameStore();
	const syncInProgress = useRef(false);

	// Sync from store to game engine
	useEffect(() => {
		const game = gameRef.current;
		if (!game || syncInProgress.current) return;

		syncInProgress.current = true;

		try {
			// Sync player position
			const storePosition = store.playerPosition;
			const gamePosition = game.getPlayerPosition();
			
			if (storePosition.x !== gamePosition.x || storePosition.y !== gamePosition.y) {
				console.log('[SYNC] Syncing player position from store to engine:', storePosition);
				game.setPlayerPosition(storePosition.x, storePosition.y, storePosition.roomId);
			}

			// Sync current floor
			const storeFloor = store.currentFloor;
			const gameFloor = game.getCurrentFloor();
			
			if (storeFloor !== gameFloor) {
				console.log('[SYNC] Syncing floor from store to engine:', storeFloor);
				game.setCurrentFloor(storeFloor);
			}

			// Sync fog of war data
			const storeFogData = store.fogOfWar;
			if (game.fogLayer) {
				game.fogLayer.setAllFogData(storeFogData);
			}

			// Sync door states
			const storeDoorStates = store.doorStates;
			if (storeDoorStates.length > 0) {
				game.restoreDoorStates(storeDoorStates);
			}

			// Sync NPCs
			const storeNPCs = store.npcs;
			const gameNPCs = game.getNPCs();
			
			// Remove NPCs that are no longer in store
			gameNPCs.forEach(npc => {
				if (!storeNPCs.find(storeNpc => storeNpc.id === npc.id)) {
					game.removeNPC(npc.id);
				}
			});
			
			// Add/update NPCs from store
			storeNPCs.forEach(storeNpc => {
				const existingNpc = game.getNPC(storeNpc.id);
				if (!existingNpc) {
					game.addNPC(storeNpc);
				}
			});

			// Sync map zoom
			const storeZoom = store.mapZoom;
			game.setMapZoom(storeZoom);

			// Sync background type
			const storeBackground = store.currentBackgroundType;
			game.setBackgroundType(storeBackground);

		} finally {
			syncInProgress.current = false;
		}
	}, [
		store.playerPosition,
		store.currentFloor,
		store.fogOfWar,
		store.doorStates,
		store.npcs,
		store.mapZoom,
		store.currentBackgroundType,
		gameRef
	]);

	// Sync from game engine to store
	useEffect(() => {
		const game = gameRef.current;
		if (!game || syncInProgress.current) return;

		const syncFromEngine = () => {
			if (syncInProgress.current) return;
			syncInProgress.current = true;

			try {
				// Sync player position
				const gamePosition = game.getPlayerPosition();
				const currentRoom = game.getCurrentRoomId();
				const storePosition = store.playerPosition;
				
				if (gamePosition.x !== storePosition.x || gamePosition.y !== storePosition.y) {
					console.log('[SYNC] Syncing player position from engine to store:', gamePosition);
					store.setPlayerPosition({
						x: gamePosition.x,
						y: gamePosition.y,
						roomId: currentRoom || undefined,
					});
				}

				// Sync current floor
				const gameFloor = game.getCurrentFloor();
				if (gameFloor !== store.currentFloor) {
					console.log('[SYNC] Syncing floor from engine to store:', gameFloor);
					store.setCurrentFloor(gameFloor);
				}

				// Sync fog of war data
				if (game.fogLayer) {
					const engineFogData = game.fogLayer.getAllFogData();
					store.setAllFogData(engineFogData);
				}

				// Sync door states
				const engineDoorStates = game.getDoorStates();
				store.setDoorStates(engineDoorStates);

				// Sync NPCs
				const engineNPCs = game.getNPCs();
				const storeNPCs = engineNPCs.map(npc => ({
					id: npc.id,
					name: npc.name,
					x: npc.x,
					y: npc.y,
					roomId: npc.roomId,
					floor: npc.floor,
				}));
				store.setNPCs(storeNPCs);

			} finally {
				syncInProgress.current = false;
			}
		};

		// Set up periodic sync from engine to store
		const syncInterval = setInterval(syncFromEngine, 1000); // Sync every second

		// Also sync when the game updates
		const originalUpdate = game.update.bind(game);
		game.update = function(...args: any[]) {
			originalUpdate(...args);
			syncFromEngine();
		};

		return () => {
			clearInterval(syncInterval);
			game.update = originalUpdate;
		};
	}, [gameRef, store]);

	// Set up game engine callbacks to sync to store
	useEffect(() => {
		const game = gameRef.current;
		if (!game) return;

		// Override the game's setCurrentFloor to sync to store
		const originalSetCurrentFloor = game.setCurrentFloor.bind(game);
		game.setCurrentFloor = function(floor: number) {
			originalSetCurrentFloor(floor);
			store.setCurrentFloor(floor);
		};

		// Override the game's setPlayerPosition to sync to store
		const originalSetPlayerPosition = game.setPlayerPosition.bind(game);
		game.setPlayerPosition = function(x: number, y: number, roomId?: string) {
			originalSetPlayerPosition(x, y, roomId);
			store.setPlayerPosition({ x, y, roomId });
		};

		return () => {
			game.setCurrentFloor = originalSetCurrentFloor;
			game.setPlayerPosition = originalSetPlayerPosition;
		};
	}, [gameRef, store]);

	return {
		// Expose sync functions for manual sync if needed
		syncToStore: () => {
			const game = gameRef.current;
			if (!game) return;
			
			const gamePosition = game.getPlayerPosition();
			const currentRoom = game.getCurrentRoomId();
			store.setPlayerPosition({
				x: gamePosition.x,
				y: gamePosition.y,
				roomId: currentRoom || undefined,
			});
			
			store.setCurrentFloor(game.getCurrentFloor());
			
			if (game.fogLayer) {
				store.setAllFogData(game.fogLayer.getAllFogData());
			}
			
			store.setDoorStates(game.getDoorStates());
			
			const engineNPCs = game.getNPCs();
			const storeNPCs = engineNPCs.map(npc => ({
				id: npc.id,
				name: npc.name,
				x: npc.x,
				y: npc.y,
				roomId: npc.roomId,
				floor: npc.floor,
			}));
			store.setNPCs(storeNPCs);
		},
		
		syncToEngine: () => {
			const game = gameRef.current;
			if (!game) return;
			
			const storePosition = store.playerPosition;
			game.setPlayerPosition(storePosition.x, storePosition.y, storePosition.roomId);
			game.setCurrentFloor(store.currentFloor);
			
			if (game.fogLayer) {
				game.fogLayer.setAllFogData(store.fogOfWar);
			}
			
			if (store.doorStates.length > 0) {
				game.restoreDoorStates(store.doorStates);
			}
		}
	};
}; 