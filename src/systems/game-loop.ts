import AIGenerationService from './ai-generation-service';
import EnemyFactionSystem from './enemy-faction-system';
import GameStateManager from './game-state-manager';
import MissionSystem from './mission-system';
import TradeSystem from './trade-system';

// Define turn phases
export enum TurnPhase {
	PLAYER_ACTION = 'PLAYER_ACTION',
	ENVIRONMENT = 'ENVIRONMENT',
	ENEMY = 'ENEMY',
	ALLY = 'ALLY',
}

class GameLoop {
	private static instance: GameLoop;
	private gameStateManager: GameStateManager;
	private tradeSystem: TradeSystem;
	private missionSystem: MissionSystem;
	private enemyFactionSystem: EnemyFactionSystem;
	private aiGenerationService: AIGenerationService;
	private isRunning = false;
	private currentPhase: TurnPhase = TurnPhase.PLAYER_ACTION;
	private turnCallbacks: { [key in TurnPhase]?: (() => void)[] } = {};
	private turnNumber = 1;

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
		console.log('Game loop started - Turn ' + this.turnNumber);
		console.log('Current phase: ' + this.currentPhase);
	}

	// Stop the game loop
	public stop(): void {
		if (!this.isRunning) return;

		this.isRunning = false;
		console.log('Game loop stopped');
	}

	// Register a callback for a specific turn phase
	public onPhase(phase: TurnPhase, callback: () => void): void {
		if (!this.turnCallbacks[phase]) {
			this.turnCallbacks[phase] = [];
		}
		this.turnCallbacks[phase]?.push(callback);
	}

	// Remove a callback for a specific turn phase
	public offPhase(phase: TurnPhase, callback: () => void): void {
		if (!this.turnCallbacks[phase]) return;

		const index = this.turnCallbacks[phase]?.indexOf(callback) ?? -1;
		if (index !== -1) {
			this.turnCallbacks[phase]?.splice(index, 1);
		}
	}

	// Process a single player action - call this when player takes action
	public processPlayerAction(): void {
		// If not in player action phase, return
		if (this.currentPhase !== TurnPhase.PLAYER_ACTION || !this.isRunning) {
			console.warn('Cannot process player action: not in player action phase');
			return;
		}

		// Execute any player action callbacks
		this.executePhaseCallbacks(TurnPhase.PLAYER_ACTION);

		// Move to environment phase
		this.advancePhase();
	}

	// Process environment turn (resource generation, etc.)
	public processEnvironmentTurn(): void {
		// If not in environment phase, return
		if (this.currentPhase !== TurnPhase.ENVIRONMENT || !this.isRunning) {
			console.warn('Cannot process environment turn: not in environment phase');
			return;
		}

		// Process systems that happen during environment phase
		// Process trade routes
		this.tradeSystem.processTradeRoutes();

		// Check for returning teams and process missions
		this.missionSystem.checkReturningTeams();

		// Process AI generation queue
		// The service processes its queue automatically with its internal interval

		// Execute any environment phase callbacks
		this.executePhaseCallbacks(TurnPhase.ENVIRONMENT);

		// Move to enemy phase
		this.advancePhase();
	}

	// Process enemy turn (enemy movements, attacks, etc.)
	public processEnemyTurn(): void {
		// If not in enemy phase, return
		if (this.currentPhase !== TurnPhase.ENEMY || !this.isRunning) {
			console.warn('Cannot process enemy turn: not in enemy phase');
			return;
		}

		// Process enemy faction activities
		this.enemyFactionSystem.updateFactions();

		// Execute any enemy phase callbacks
		this.executePhaseCallbacks(TurnPhase.ENEMY);

		// Move to ally phase
		this.advancePhase();
	}

	// Process ally turn (ally actions, etc.)
	public processAllyTurn(): void {
		// If not in ally phase, return
		if (this.currentPhase !== TurnPhase.ALLY || !this.isRunning) {
			console.warn('Cannot process ally turn: not in ally phase');
			return;
		}

		// Process ally activities (to be implemented)

		// Execute any ally phase callbacks
		this.executePhaseCallbacks(TurnPhase.ALLY);

		// Complete the turn cycle
		this.completeTurn();
	}

	// Complete the turn cycle
	private completeTurn(): void {
		// Process end-of-turn activities

		// Auto-save if enabled
		const state = this.gameStateManager.getState();
		if (state.gameSettings.autoSave) {
			// Save every few turns
			if (this.turnNumber % state.gameSettings.autoSaveInterval === 0) {
				this.gameStateManager.saveGame();
				console.log('Game auto-saved on turn ' + this.turnNumber);
			}
		}

		// Advance game time
		this.gameStateManager.advanceTime(1);

		// Increment turn number
		this.turnNumber++;

		// Reset phase to player action
		this.currentPhase = TurnPhase.PLAYER_ACTION;

		console.log('Turn ' + this.turnNumber + ' started');
		console.log('Current phase: ' + this.currentPhase);
	}

	// Execute callbacks for the current phase
	private executePhaseCallbacks(phase: TurnPhase): void {
		if (this.turnCallbacks[phase]) {
			this.turnCallbacks[phase]?.forEach(callback => callback());
		}
	}

	// Advance to the next phase
	private advancePhase(): void {
		switch (this.currentPhase) {
			case TurnPhase.PLAYER_ACTION:
				this.currentPhase = TurnPhase.ENVIRONMENT;
				this.processEnvironmentTurn();
				break;
			case TurnPhase.ENVIRONMENT:
				this.currentPhase = TurnPhase.ENEMY;
				this.processEnemyTurn();
				break;
			case TurnPhase.ENEMY:
				this.currentPhase = TurnPhase.ALLY;
				this.processAllyTurn();
				break;
			case TurnPhase.ALLY:
				// Should not happen as processAllyTurn calls completeTurn
				this.completeTurn();
				break;
		}
	}

	// Manually advance to the next turn (skipping remaining phases)
	public advanceToNextTurn(): void {
		if (!this.isRunning) return;

		// Process all remaining phases
		switch (this.currentPhase) {
			case TurnPhase.PLAYER_ACTION:
				this.processEnvironmentTurn();
				break;
			case TurnPhase.ENVIRONMENT:
				this.processEnemyTurn();
				break;
			case TurnPhase.ENEMY:
				this.processAllyTurn();
				break;
			case TurnPhase.ALLY:
				this.completeTurn();
				break;
		}
	}

	// Get the current phase
	public getCurrentPhase(): TurnPhase {
		return this.currentPhase;
	}

	// Get the current turn number
	public getTurnNumber(): number {
		return this.turnNumber;
	}

	// Check if game loop is running
	public isActive(): boolean {
		return this.isRunning;
	}
}

export default GameLoop;
