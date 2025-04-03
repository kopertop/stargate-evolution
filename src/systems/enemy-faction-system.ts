import {
	MissionType,
	NotificationType,
	Planet,
	ResourceType,
	SkillType,
} from '../types/game-types';
import { generateId } from '../utils/id-generator';

import GameStateManager from './game-state-manager';
import MissionSystem from './mission-system';

interface FactionActivity {
	id: string;
	planetId: string;
	type: 'OCCUPATION' | 'ATTACK' | 'SCOUT' | 'COLONIZE';
	progress: number;
	strength: number;
	startDay: number;
	startYear: number;
}

class EnemyFactionSystem {
	private static instance: EnemyFactionSystem;
	private gameStateManager: GameStateManager;
	private missionSystem: MissionSystem;
	private currentActivities: FactionActivity[] = [];

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
		this.missionSystem = MissionSystem.getInstance();

		// Restore saved activities if they exist
		this.loadActivities();
	}

	public static getInstance(): EnemyFactionSystem {
		if (!EnemyFactionSystem.instance) {
			EnemyFactionSystem.instance = new EnemyFactionSystem();
		}
		return EnemyFactionSystem.instance;
	}

	// Load activities from state
	private loadActivities(): void {
		// In a real implementation, these would be loaded from persistent storage
		// For now, we'll just initialize an empty array
		this.currentActivities = [];
	}

	// Update faction activities
	public updateFactions(): void {
		// Process current activities
		this.processActivities();

		// Generate new activities based on faction presence
		this.generateNewActivities();
	}

	// Process ongoing faction activities
	private processActivities(): void {
		const state = this.gameStateManager.getState();
		const currentDay = state.gameTime.day;
		const currentYear = state.gameTime.year;

		// Process each activity
		const completedActivities: string[] = [];

		this.currentActivities.forEach(activity => {
			// Calculate days passed since activity started
			let daysPassed = 0;
			if (currentYear === activity.startYear) {
				daysPassed = currentDay - activity.startDay;
			} else {
				// Assume 365 days per year for simplicity
				daysPassed = (currentYear - activity.startYear) * 365 + (currentDay - activity.startDay);
			}

			// Progress increases over time
			const newProgress = Math.min(activity.progress + (daysPassed * (5 + Math.random() * 5)), 100);

			// If activity is complete, process its effects
			if (newProgress >= 100) {
				this.completeActivity(activity);
				completedActivities.push(activity.id);
			} else {
				// Update progress
				activity.progress = newProgress;
			}
		});

		// Remove completed activities
		this.currentActivities = this.currentActivities.filter(
			activity => !completedActivities.includes(activity.id),
		);
	}

	// Generate new activities based on faction presence
	private generateNewActivities(): void {
		const state = this.gameStateManager.getState();
		const playerPlanets = Object.values(state.player.planets);

		// Check Goa'uld activity
		if (state.enemies.goauldPresence > 0) {
			// Chance of new activity is based on Goa'uld presence
			const activityChance = state.enemies.goauldPresence * 0.3;

			if (Math.random() < activityChance) {
				// Select a random planet that isn't already under attack
				const validPlanets = playerPlanets.filter(planet =>
					!this.currentActivities.some(a => a.planetId === planet.id),
				);

				if (validPlanets.length > 0) {
					const targetPlanet = validPlanets[Math.floor(Math.random() * validPlanets.length)];
					this.createGoauldActivity(targetPlanet);
				}
			}
		}

		// Future implementation: Process Ori faction
		if (state.enemies.oriPresence > 0) {
			// Ori faction logic would go here
		}

		// Future implementation: Process Wraith faction
		if (state.enemies.wraithPresence > 0) {
			// Wraith faction logic would go here
		}
	}

	// Create a new Goa'uld activity
	private createGoauldActivity(planet: Planet): void {
		const state = this.gameStateManager.getState();

		// Determine activity type based on planet characteristics
		let activityType: 'OCCUPATION' | 'ATTACK' | 'SCOUT' | 'COLONIZE';

		if (planet.bases.length > 0) {
			// If planet has bases, more likely to attack or occupy
			const rand = Math.random();
			if (rand < 0.5) {
				activityType = 'ATTACK';
			} else if (rand < 0.8) {
				activityType = 'OCCUPATION';
			} else {
				activityType = 'SCOUT';
			}
		} else if (planet.resources.some(r => r.type === ResourceType.NAQUADAH && r.abundance > 0.5)) {
			// If planet has high Naquadah, more likely to colonize
			activityType = Math.random() < 0.6 ? 'COLONIZE' : 'SCOUT';
		} else {
			// Otherwise, more likely to scout
			activityType = Math.random() < 0.8 ? 'SCOUT' : 'ATTACK';
		}

		// Determine strength based on Goa'uld presence
		const baseStrength = 3 + Math.random() * 7; // 3-10
		const factionStrength = state.enemies.goauldPresence * 10; // 0-10 based on presence
		const strength = baseStrength + factionStrength; // 3-20

		// Create and add the activity
		const newActivity: FactionActivity = {
			id: generateId(),
			planetId: planet.id,
			type: activityType,
			progress: 0,
			strength,
			startDay: state.gameTime.day,
			startYear: state.gameTime.year,
		};

		this.currentActivities.push(newActivity);

		// Generate a mission to counter this activity
		this.generateCounterMission(newActivity, planet);

		// Add notification
		let notificationMessage = '';
		switch (activityType) {
		case 'SCOUT':
			notificationMessage = `Goa'uld scout ships detected near ${planet.name}.`;
			break;
		case 'ATTACK':
			notificationMessage = `Goa'uld forces are preparing to attack ${planet.name}!`;
			break;
		case 'COLONIZE':
			notificationMessage = `Goa'uld ships are establishing a presence on ${planet.name}.`;
			break;
		case 'OCCUPATION':
			notificationMessage = `Goa'uld forces are occupying parts of ${planet.name}.`;
			break;
		}

		this.gameStateManager.addNotification(
			'Goa\'uld Activity Detected',
			notificationMessage,
			NotificationType.WARNING,
		);

		// Update planet threat level
		this.updatePlanetThreatLevel(planet.id, 0.2);
	}

	// Generate a mission to counter enemy activity
	private generateCounterMission(activity: FactionActivity, planet: Planet): void {
		// Create a mission based on activity type
		let missionType: MissionType;
		let description = '';
		const requirements: Record<SkillType, number> = {} as Record<SkillType, number>;

		switch (activity.type) {
		case 'SCOUT':
			missionType = MissionType.EXPLORATION;
			description = `Investigate Goa'uld scout ships near ${planet.name}.`;
			requirements[SkillType.COMBAT] = 3;
			requirements[SkillType.SCIENCE] = 4;
			requirements[SkillType.LEADERSHIP] = 3;
			break;

		case 'ATTACK':
			missionType = MissionType.COMBAT;
			description = `Defend against Goa'uld attack on ${planet.name}.`;
			requirements[SkillType.COMBAT] = 6;
			requirements[SkillType.LEADERSHIP] = 5;
			requirements[SkillType.ENGINEERING] = 2;
			break;

		case 'COLONIZE':
			missionType = MissionType.COMBAT;
			description = `Prevent Goa'uld colonization of ${planet.name}.`;
			requirements[SkillType.COMBAT] = 5;
			requirements[SkillType.LEADERSHIP] = 4;
			requirements[SkillType.SCIENCE] = 3;
			break;

		case 'OCCUPATION':
			missionType = MissionType.COMBAT;
			description = `Liberate ${planet.name} from Goa'uld occupation.`;
			requirements[SkillType.COMBAT] = 7;
			requirements[SkillType.LEADERSHIP] = 5;
			requirements[SkillType.MEDICINE] = 3;
			break;
		}

		// Scale requirements based on activity strength
		Object.keys(requirements).forEach(skill => {
			requirements[skill as SkillType] = Math.ceil(
				requirements[skill as SkillType] * (1 + activity.strength / 20),
			);
		});

		// Create mission
		const mission = {
			id: generateId(),
			type: missionType,
			planetId: planet.id,
			description,
			requirements,
			duration: 2 + Math.floor(Math.random() * 3), // 2-4 days
			progress: 0,
			complete: false,
			rewards: [
				{
					type: 'RESOURCE' as any,
					resourceType: 'NAQUADAH' as any,
					amount: 10 + Math.floor(Math.random() * 15),
				},
				{
					type: 'RESOURCE' as any,
					resourceType: 'MINERAL' as any,
					amount: 30 + Math.floor(Math.random() * 50),
				},
			],
		};

		// Add mission via mission system
		this.missionSystem.addMission(mission);
	}

	// Complete an enemy faction activity
	private completeActivity(activity: FactionActivity): void {
		const state = this.gameStateManager.getState();
		const planet = state.player.planets[activity.planetId];

		if (!planet) {
			console.error(`Planet ${activity.planetId} not found for activity ${activity.id}`);
			return;
		}

		// Process effects based on activity type
		switch (activity.type) {
		case 'SCOUT': {
			// Scouts increase knowledge but have minimal direct impact
			// Add planet to Goa'uld known worlds
			this.gameStateManager.updateState(state => ({
				...state,
				enemies: {
					...state.enemies,
					goauldWorlds: [...state.enemies.goauldWorlds, activity.planetId],
				},
			}));

			this.gameStateManager.addNotification(
				'Goa\'uld Scout Mission Complete',
				`Goa'uld scouts have completed their reconnaissance of ${planet.name}.`,
				NotificationType.WARNING,
			);

			// Small threat level increase
			this.updatePlanetThreatLevel(planet.id, 0.1);
			break;
		}

		case 'ATTACK': {
			// Attacks damage bases if present
			if (planet.bases.length > 0) {
				// Calculate damage to bases
				this.gameStateManager.updateState(state => {
					const updatedBases = state.player.planets[activity.planetId].bases.map(base => {
						// Random buildings affected
						const updatedBuildings = base.buildings.map(building => {
							if (Math.random() < 0.3) {
								return {
									...building,
									active: false,
									constructionProgress: Math.max(0, building.constructionProgress - 50),
									constructionComplete: false,
								};
							}
							return building;
						});

						return {
							...base,
							buildings: updatedBuildings,
						};
					});

					const updatedPlanet = {
						...state.player.planets[activity.planetId],
						bases: updatedBases,
					};

					return {
						...state,
						player: {
							...state.player,
							planets: {
								...state.player.planets,
								[activity.planetId]: updatedPlanet,
							},
						},
					};
				});

				this.gameStateManager.addNotification(
					'Goa\'uld Attack Successful',
					`Goa'uld forces have attacked your bases on ${planet.name}, causing damage to buildings and infrastructure.`,
					NotificationType.DANGER,
				);
			} else {
				this.gameStateManager.addNotification(
					'Goa\'uld Attack',
					`Goa'uld forces have attacked ${planet.name}, but found no significant targets.`,
					NotificationType.WARNING,
				);
			}

			// Significant threat level increase
			this.updatePlanetThreatLevel(planet.id, 0.3);
			break;
		}

		case 'COLONIZE': {
			// Colonization establishes Goa'uld presence
			this.gameStateManager.updateState(state => {
				// Add planet to Goa'uld worlds
				const updatedGoauldWorlds = [...state.enemies.goauldWorlds];
				if (!updatedGoauldWorlds.includes(activity.planetId)) {
					updatedGoauldWorlds.push(activity.planetId);
				}

				return {
					...state,
					enemies: {
						...state.enemies,
						goauldWorlds: updatedGoauldWorlds,
					},
				};
			});

			this.gameStateManager.addNotification(
				'Goa\'uld Colony Established',
				`Goa'uld forces have established a colony on ${planet.name}. This will make exploration and resource gathering more difficult.`,
				NotificationType.DANGER,
			);

			// Major threat level increase
			this.updatePlanetThreatLevel(planet.id, 0.5);
			break;
		}

		case 'OCCUPATION': {
			// Occupation is the most severe, effectively taking over the planet
			this.gameStateManager.updateState(state => {
				// Add planet to Goa'uld worlds
				const updatedGoauldWorlds = [...state.enemies.goauldWorlds];
				if (!updatedGoauldWorlds.includes(activity.planetId)) {
					updatedGoauldWorlds.push(activity.planetId);
				}

				// Update planet status
				const updatedPlanet = {
					...state.player.planets[activity.planetId],
					threatLevel: 0.9, // Extremely high threat
				};

				return {
					...state,
					enemies: {
						...state.enemies,
						goauldWorlds: updatedGoauldWorlds,
					},
					player: {
						...state.player,
						planets: {
							...state.player.planets,
							[activity.planetId]: updatedPlanet,
						},
					},
				};
			});

			this.gameStateManager.addNotification(
				'Planet Occupied by Goa\'uld',
				`Goa'uld forces have taken full control of ${planet.name}. Extensive military action will be required to liberate it.`,
				NotificationType.DANGER,
			);
			break;
		}
		}
	}

	// Update a planet's threat level
	private updatePlanetThreatLevel(planetId: string, increase: number): void {
		this.gameStateManager.updateState(state => {
			const planet = state.player.planets[planetId];
			if (!planet) return state;

			const newThreatLevel = Math.min(planet.threatLevel + increase, 1);

			return {
				...state,
				player: {
					...state.player,
					planets: {
						...state.player.planets,
						[planetId]: {
							...planet,
							threatLevel: newThreatLevel,
						},
					},
				},
			};
		});
	}

	// Change Goa'uld presence level
	public updateGoauldPresence(change: number): void {
		this.gameStateManager.updateState(state => {
			const newPresence = Math.max(0, Math.min(state.enemies.goauldPresence + change, 1));

			return {
				...state,
				enemies: {
					...state.enemies,
					goauldPresence: newPresence,
				},
			};
		});

		// Notification if presence changes significantly
		if (Math.abs(change) >= 0.1) {
			const direction = change > 0 ? 'increased' : 'decreased';
			this.gameStateManager.addNotification(
				'Goa\'uld Presence Change',
				`Intelligence reports indicate that Goa'uld presence in the galaxy has ${direction}.`,
				change > 0 ? NotificationType.WARNING : NotificationType.SUCCESS,
			);
		}
	}

	// Get current enemy activities
	public getActivities(): FactionActivity[] {
		return [...this.currentActivities];
	}

	// Check if a planet is occupied by enemies
	public isPlanetOccupied(planetId: string): boolean {
		const state = this.gameStateManager.getState();

		// Check if in Goa'uld worlds
		if (state.enemies.goauldWorlds.includes(planetId)) {
			return true;
		}

		// Check if in Ori worlds
		if (state.enemies.oriWorlds.includes(planetId)) {
			return true;
		}

		// Check if in Wraith worlds
		if (state.enemies.wraithWorlds.includes(planetId)) {
			return true;
		}

		return false;
	}

	// Get occupation faction for a planet
	public getOccupyingFaction(planetId: string): string | null {
		const state = this.gameStateManager.getState();

		if (state.enemies.goauldWorlds.includes(planetId)) {
			return 'Goa\'uld';
		}

		if (state.enemies.oriWorlds.includes(planetId)) {
			return 'Ori';
		}

		if (state.enemies.wraithWorlds.includes(planetId)) {
			return 'Wraith';
		}

		return null;
	}
}

export default EnemyFactionSystem;
