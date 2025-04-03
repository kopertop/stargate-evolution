import AIGenerationService from './ai-generation-service';
import EnemyFactionSystem from './enemy-faction-system';
import GameStateManager from './game-state-manager';
import MissionSystem from './mission-system';
import TradeSystem from './trade-system';

class GameLoop {
	private static instance: GameLoop;
	private gameStateManager: GameStateManager;
	private tradeSystem: TradeSystem;
	private missionSystem: MissionSystem;
	private enemyFactionSystem: EnemyFactionSystem;
	private aiGenerationService: AIGenerationService;
	private isRunning = false;
	private tickInterval = 5000; // Default: 5 seconds per tick
	private intervalId: number | null = null;

	private constructor() {
		// Initialize systems
		this.gameStateManager = GameStateManager.getInstance();
		this.tradeSystem = TradeSystem.getInstance();
		this.missionSystem = MissionSystem.getInstance();
		this.enemyFactionSystem = EnemyFactionSystem.getInstance();
		this.aiGenerationService = AIGenerationService.getInstance();
	}

	public static getInstance(): GameLoop {
		if (!GameLoop.instance) {
			GameLoop.instance = new GameLoop();
		}
		return GameLoop.instance;
	}

	// Start the game loop
	public start(): void {
		if (this.isRunning) return;

		this.isRunning = true;
		// Use window.setInterval to get a number ID for later clearing
		this.intervalId = window.setInterval(() => this.tick(), this.tickInterval);
		console.log('Game loop started');
	}

	// Stop the game loop
	public stop(): void {
		if (!this.isRunning || this.intervalId === null) return;

		window.clearInterval(this.intervalId);
		this.intervalId = null;
		this.isRunning = false;
		console.log('Game loop stopped');
	}

	// Set tick rate (milliseconds per tick)
	public setTickRate(milliseconds: number): void {
		if (milliseconds < 1000) {
			console.warn('Tick rate below 1000ms may cause performance issues');
		}

		this.tickInterval = milliseconds;

		// Restart the loop if it's running
		if (this.isRunning) {
			this.stop();
			this.start();
		}
	}

	// Process a single game tick
	private tick(): void {
		// Process each system
		this.processSystems();

		// Auto-save if enabled
		const state = this.gameStateManager.getState();
		if (state.gameSettings.autoSave) {
			// Save every 12 ticks (assuming this is roughly 1 minute at default tick rate)
			const autoSaveInterval = Math.floor(
				(state.gameSettings.autoSaveInterval * 60 * 1000) / this.tickInterval,
			);

			if (Math.random() < (1 / autoSaveInterval)) {
				this.gameStateManager.saveGame();
				console.log('Game auto-saved');
			}
		}

		// Advance game time
		// At default rate, 5 seconds real time = 1 day game time
		this.gameStateManager.advanceTime(1);
	}

	// Process all game systems
	private processSystems(): void {
		// Process trade routes
		this.tradeSystem.processTradeRoutes();

		// Check for returning teams and process missions
		this.missionSystem.checkReturningTeams();

		// Process AI generation queue
		// The service processes its queue automatically with its internal interval

		// Process enemy faction activities
		this.enemyFactionSystem.updateFactions();
	}

	// Pause/resume the game loop
	public togglePause(): boolean {
		if (this.isRunning) {
			this.stop();
			return false;
		} else {
			this.start();
			return true;
		}
	}

	// Check if game loop is running
	public isActive(): boolean {
		return this.isRunning;
	}
}

export default GameLoop;
