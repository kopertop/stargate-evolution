import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { useGameStore } from '../game-store';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

describe('GameStore Auto-Save', () => {
	beforeEach(() => {
		// Reset zustand store
		useGameStore.getState().setGameId(null);
		useGameStore.getState().setIsInitialized(false);
    
		// Clear all mocks
		vi.clearAllMocks();
    
		// Reset localStorage mock
		localStorageMock.getItem.mockReturnValue(null);
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it('should provide auto-save actions', () => {
		const store = useGameStore.getState();
    
		expect(typeof store.enableAutoSave).toBe('function');
		expect(typeof store.disableAutoSave).toBe('function');
		expect(typeof store.triggerAutoSave).toBe('function');
		expect(typeof store.getAutoSaveData).toBe('function');
		expect(typeof store.hasAutoSave).toBe('function');
	});

	it('should trigger auto-save when manually called', () => {
		const store = useGameStore.getState();
    
		// Initialize game
		store.setGameId('test-game-123');
		store.setGameName('Test Game');
		store.setIsInitialized(true);
		store.setPlayerPosition({ x: 100, y: 200, roomId: 'test-room', floor: 1 });
		store.setCurrentFloor(1);
    
		// Trigger auto-save
		store.triggerAutoSave();
    
		// Check that localStorage.setItem was called
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringContaining('"gameId":"test-game-123"'),
		);
	});

	it('should retrieve auto-save data', () => {
		const mockAutoSaveData = {
			timestamp: Date.now(),
			gameId: 'test-game-123',
			gameName: 'Test Game',
			playerPosition: { x: 100, y: 200, roomId: 'test-room', floor: 1 },
			currentFloor: 1,
			fogOfWar: { 1: { '100,200': true } },
			doorStates: [],
			npcs: [],
		};
    
		localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAutoSaveData));
    
		const store = useGameStore.getState();
		const autoSaveData = store.getAutoSaveData('test-game-123');
    
		expect(autoSaveData).toEqual(mockAutoSaveData);
		expect(localStorageMock.getItem).toHaveBeenCalledWith('stargate-auto-save-test-game-123');
	});

	it('should detect when auto-save data exists', () => {
		const store = useGameStore.getState();
    
		// No auto-save data
		localStorageMock.getItem.mockReturnValue(null);
		expect(store.hasAutoSave('test-game-123')).toBe(false);
    
		// Has auto-save data
		localStorageMock.getItem.mockReturnValue('{"test": "data"}');
		expect(store.hasAutoSave('test-game-123')).toBe(true);
	});

	it('should not trigger auto-save when game is not initialized', () => {
		const store = useGameStore.getState();
    
		// Set game ID but not initialized
		store.setGameId('test-game-123');
		store.setIsInitialized(false);
    
		// Trigger auto-save
		store.triggerAutoSave();
    
		// Should not save to localStorage
		expect(localStorageMock.setItem).not.toHaveBeenCalled();
	});

	it('should include all game state in auto-save', () => {
		const store = useGameStore.getState();
    
		// Initialize game with full state
		store.setGameId('test-game-123');
		store.setGameName('Test Game');
		store.setIsInitialized(true);
		store.setPlayerPosition({ x: 100, y: 200, roomId: 'test-room', floor: 1 });
		store.setCurrentFloor(1);
		store.setFogOfWar(1, { '100,200': true });
		store.setDoorStates([{ id: 'door-1', state: 'open' }]);
		store.setNPCs([{ id: 'npc-1', name: 'Test NPC', x: 150, y: 250, roomId: 'test-room', floor: 1 }]);
		store.setMapZoom(2.5);
		store.setBackgroundType('ftl');
    
		// Trigger auto-save
		store.triggerAutoSave();
    
		// Check that all state was saved
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"playerPosition".*"x":100.*"y":200/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"currentFloor":1/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"fogOfWar".*"1".*"100,200":true/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"doorStates".*"door-1".*"open"/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"npcs".*"npc-1".*"Test NPC"/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"mapZoom":2\.5/),
		);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'stargate-auto-save-test-game-123',
			expect.stringMatching(/"currentBackgroundType":"ftl"/),
		);
	});

	it('should handle localStorage errors gracefully', () => {
		const store = useGameStore.getState();
    
		// Initialize game
		store.setGameId('test-game-123');
		store.setIsInitialized(true);
    
		// Mock localStorage.setItem to throw an error
		localStorageMock.setItem.mockImplementation(() => {
			throw new Error('localStorage full');
		});
    
		// Should not throw when auto-save fails
		expect(() => store.triggerAutoSave()).not.toThrow();
	});

	it('should handle invalid JSON in getAutoSaveData gracefully', () => {
		localStorageMock.getItem.mockReturnValue('invalid json{');
    
		const store = useGameStore.getState();
		const result = store.getAutoSaveData('test-game-123');
    
		expect(result).toBeNull();
	});
});