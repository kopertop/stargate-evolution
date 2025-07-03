// Simple game service without LiveStore - Admin-focused
// This service is kept minimal since we're focusing on Admin functionality

class GameService {
	// Placeholder service - most game functionality removed since we're focusing on Admin
	// If game functionality is needed later, it should use direct API calls instead of LiveStore

	async getGameById(gameId: string) {
		// Placeholder - implement direct API call if needed
		console.warn('Game service functionality removed - use Admin APIs instead');
		return null;
	}
}

export const gameService = new GameService();
