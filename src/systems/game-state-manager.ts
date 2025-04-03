import { GameState, GamePhase, ResourceType, PersonnelType, NotificationType } from '../types/game-types';
import { generateEntityId } from '../utils/id-generator';

// Type for state subscribers
type StateSubscriber = (state: GameState) => void;

class GameStateManager {
	private state: GameState;
	private subscribers: StateSubscriber[] = [];
	private static instance: GameStateManager;

	private constructor() {
		// Initialize with default game state
		this.state = this.createInitialState();
	}

	public static getInstance(): GameStateManager {
		if (!GameStateManager.instance) {
			GameStateManager.instance = new GameStateManager();
		}
		return GameStateManager.instance;
	}

	private createInitialState(): GameState {
		// Create Earth as the starting planet
		const earthId = generateEntityId('planet');

		// Create SG-1 as the starting team
		const sg1TeamId = generateEntityId('team');

		return {
			currentPhase: GamePhase.EXPLORATION,
			gameTime: { day: 1, year: 1997 },
			player: {
				planets: {
					[earthId]: {
						id: earthId,
						name: 'Earth',
						address: '1',
						climate: 'TEMPERATE' as any,
						resources: [
							{ type: ResourceType.MINERAL, abundance: 0.7, difficulty: 0.3, discovered: true },
							{ type: ResourceType.ORGANIC, abundance: 0.8, difficulty: 0.2, discovered: true },
							{ type: ResourceType.ENERGY, abundance: 0.6, difficulty: 0.4, discovered: true },
							{ type: ResourceType.EXOTIC, abundance: 0.3, difficulty: 0.8, discovered: true },
							{ type: ResourceType.NAQUADAH, abundance: 0.1, difficulty: 0.9, discovered: true },
						],
						explorationStatus: 'FULLY_DOCUMENTED' as any,
						bases: [],
						threatLevel: 0,
						description: 'Home planet of humanity and the Stargate program',
						position: { x: 0, y: 0, z: 0 },
						hasStargate: true,
					},
				},
				currentPlanetId: earthId,
				homeBasePlanetId: earthId,
				discoveredTechnologies: [],
				resources: {
					[ResourceType.MINERAL]: 100,
					[ResourceType.ORGANIC]: 50,
					[ResourceType.ENERGY]: 75,
					[ResourceType.EXOTIC]: 10,
					[ResourceType.NAQUADAH]: 5,
				},
				personnel: {
					[PersonnelType.SCIENTIST]: 5,
					[PersonnelType.MILITARY]: 10,
					[PersonnelType.ENGINEER]: 5,
					[PersonnelType.DIPLOMAT]: 2,
				},
				stargateProgram: {
					level: 1,
					maxTeams: 1,
					teams: [{
						id: sg1TeamId,
						name: 'SG-1',
						members: [
							{
								id: generateEntityId('member'),
								name: 'Jack O\'Neill',
								skills: {
									COMBAT: 8,
									SCIENCE: 3,
									ENGINEERING: 3,
									DIPLOMACY: 5,
									LEADERSHIP: 9,
									MEDICINE: 2,
								},
								specialization: PersonnelType.MILITARY,
							},
							{
								id: generateEntityId('member'),
								name: 'Samantha Carter',
								skills: {
									COMBAT: 6,
									SCIENCE: 9,
									ENGINEERING: 8,
									DIPLOMACY: 6,
									LEADERSHIP: 7,
									MEDICINE: 4,
								},
								specialization: PersonnelType.SCIENTIST,
							},
						],
						status: 'AVAILABLE' as any,
					}],
					expeditionLimit: 1,
					baseLimit: 1,
				},
				discoveredGateAddresses: ['1'], // Earth's address
				missions: [],
				tradeRoutes: [],
				notifications: [{
					id: generateEntityId('notification'),
					title: 'Welcome to Stargate Universe',
					message: 'Begin your journey of exploration through the Stargate network.',
					type: NotificationType.INFO,
					read: false,
					timestamp: { day: 1, year: 1997 },
				}],
			},
			enemies: {
				goauldPresence: 1.0,
				goauldWorlds: [],
				oriPresence: 0,
				oriWorlds: [],
				wraithPresence: 0,
				wraithWorlds: [],
			},
			allies: [],
			knownGalaxies: ['Milky Way'],
			aiGenerationQueue: [],
			gameSettings: {
				difficultyLevel: 'NORMAL' as any,
				autoSave: true,
				autoSaveInterval: 10, // minutes
				notificationLevel: 'IMPORTANT' as any,
			},
		};
	}

	// Subscribe to state changes
	public subscribe(callback: StateSubscriber): () => void {
		this.subscribers.push(callback);
		// Return unsubscribe function
		return () => {
			this.subscribers = this.subscribers.filter(sub => sub !== callback);
		};
	}

	// Notify all subscribers
	private notifySubscribers(): void {
		// Create a deep copy of the state to ensure immutability
		const stateCopy = JSON.parse(JSON.stringify(this.state));
		this.subscribers.forEach(subscriber => subscriber(stateCopy));
	}

	// Get current state (immutable copy)
	public getState(): GameState {
		return JSON.parse(JSON.stringify(this.state));
	}

	// Update state with a partial state object
	public updateState(updater: (state: GameState) => GameState): void {
		this.state = updater(this.state);
		this.notifySubscribers();
	}

	// Save game state to localStorage
	public saveGame(): boolean {
		try {
			localStorage.setItem('stargate_universe_save', JSON.stringify(this.state));
			return true;
		} catch (error) {
			console.error('Failed to save game:', error);
			return false;
		}
	}

	// Load game state from localStorage
	public loadGame(): boolean {
		try {
			const savedState = localStorage.getItem('stargate_universe_save');
			if (savedState) {
				this.state = JSON.parse(savedState);
				this.notifySubscribers();
				return true;
			}
			return false;
		} catch (error) {
			console.error('Failed to load game:', error);
			return false;
		}
	}

	// Add a new notification
	public addNotification(title: string, message: string, type: NotificationType): void {
		const notification = {
			id: generateEntityId('notification'),
			title,
			message,
			type,
			read: false,
			timestamp: { ...this.state.gameTime },
		};

		this.updateState(state => ({
			...state,
			player: {
				...state.player,
				notifications: [notification, ...state.player.notifications],
			},
		}));
	}

	// Advance game time by days
	public advanceTime(days: number): void {
		this.updateState(state => {
			let newDay = state.gameTime.day + days;
			let newYear = state.gameTime.year;

			// Assuming 365 days in a year for simplicity
			while (newDay > 365) {
				newDay -= 365;
				newYear += 1;
			}

			return {
				...state,
				gameTime: {
					day: newDay,
					year: newYear,
				},
			};
		});
	}
}

export default GameStateManager;
