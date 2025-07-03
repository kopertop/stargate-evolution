import type {
	SavedGame,
	SavedGameListItem,
	CreateSavedGame,
	UpdateSavedGame,
} from '@stargate/common/models/saved-game';

import { apiClient } from './api-client';

export class SavedGameService {
	/**
	 * List all saved games for the current user
	 */
	static async listSavedGames(): Promise<SavedGameListItem[]> {
		try {
			const response = await apiClient.get('/api/games/saves', true); // true = authenticated
			if (response.error) {
				throw new Error(response.error);
			}
			return response.data || [];
		} catch (error) {
			console.error('[SAVED-GAME-SERVICE] Failed to list saved games:', error);
			return [];
		}
	}

	/**
	 * Get a specific saved game by ID
	 */
	static async getSavedGame(id: string): Promise<SavedGame> {
		try {
			const response = await apiClient.get(`/api/games/saves/${id}`, true); // true = authenticated
			if (response.error) {
				throw new Error(response.error);
			}
			if (!response.data) {
				throw new Error('No game data received from server');
			}
			return response.data;
		} catch (error) {
			console.error('[SAVED-GAME-SERVICE] Failed to get saved game:', id, error);
			throw error;
		}
	}

	/**
	 * Create a new saved game
	 */
	static async createSavedGame(data: CreateSavedGame): Promise<SavedGame> {
		const response = await apiClient.post('/api/games/saves', data, true); // true = authenticated
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	/**
	 * Update an existing saved game
	 */
	static async updateSavedGame(id: string, data: UpdateSavedGame): Promise<SavedGame> {
		const response = await apiClient.put(`/api/games/saves/${id}`, data, true); // true = authenticated
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	/**
	 * Delete a saved game
	 */
	static async deleteSavedGame(id: string): Promise<void> {
		const response = await apiClient.delete(`/api/games/saves/${id}`, true); // true = authenticated
		if (response.error) {
			throw new Error(response.error);
		}
	}

	/**
	 * Save current game state
	 * This is a convenience method that serializes the game state and saves it
	 */
	static async saveCurrentGame(
		name: string,
		description: string | undefined,
		gameState: any,
	): Promise<SavedGame> {
		const gameData = JSON.stringify(gameState);
		return this.createSavedGame({
			name,
			description,
			game_data: gameData,
		});
	}

	/**
	 * Load a game and parse its state
	 * This is a convenience method that loads a saved game and parses its JSON data
	 */
	static async loadGame(id: string): Promise<{ savedGame: SavedGame; gameState: any }> {
		const savedGame = await this.getSavedGame(id);
		const gameState = JSON.parse(savedGame.game_data);
		return { savedGame, gameState };
	}

	/**
	 * Update a saved game with new game state
	 * This is a convenience method for updating just the game data
	 */
	static async updateGameState(id: string, gameState: any): Promise<SavedGame> {
		const gameData = JSON.stringify(gameState);
		return this.updateSavedGame(id, {
			game_data: gameData,
		});
	}
}
