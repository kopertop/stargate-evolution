import {
	ExplorationStatus,
	Planet,
	TeamStatus,
	SkillType,
	AIRequestType,
	NotificationType,
} from '../types/game-types';

import AIGenerationService from './ai-generation-service';
import GameStateManager from './game-state-manager';

class PlanetExplorationSystem {
	private static instance: PlanetExplorationSystem;
	private gameStateManager: GameStateManager;
	private aiGenerationService: AIGenerationService;

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
		this.aiGenerationService = AIGenerationService.getInstance();
	}

	public static getInstance(): PlanetExplorationSystem {
		if (!PlanetExplorationSystem.instance) {
			PlanetExplorationSystem.instance = new PlanetExplorationSystem();
		}
		return PlanetExplorationSystem.instance;
	}

	// Explore a planet with a team
	public exploreNewPlanet(teamId: string, explorationFocus?: 'resources' | 'technology' | 'threats' | 'general'): boolean {
		const state = this.gameStateManager.getState();

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team || team.status !== TeamStatus.AVAILABLE) {
			console.error(`Team ${teamId} not available for exploration`);
			return false;
		}

		// Check if we've hit the expedition limit
		const activeTeamsCount = state.player.stargateProgram.teams.filter(
			t => t.status === TeamStatus.ON_MISSION,
		).length;

		if (activeTeamsCount >= state.player.stargateProgram.expeditionLimit) {
			console.error('Expedition limit reached');
			return false;
		}

		// Queue a new planet generation request
		this.aiGenerationService.queueRequest(AIRequestType.PLANET_GENERATION, {
			galaxyName: state.knownGalaxies[0], // Use first known galaxy
			teamId,
			explorationFocus,
		});

		// Mark team as on mission
		this.gameStateManager.updateState(state => {
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return {
						...t,
						status: TeamStatus.ON_MISSION,
						// Team will return in 2-5 days
						returnTime: {
							day: state.gameTime.day + 2 + Math.floor(Math.random() * 4),
							year: state.gameTime.year,
						},
					};
				}
				return t;
			});

			return {
				...state,
				player: {
					...state.player,
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Team Deployed',
			`${team.name} has been deployed through the Stargate to explore a new planet.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Process exploration results when a team returns
	public processTeamReturn(teamId: string): void {
		const state = this.gameStateManager.getState();

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team || team.status !== TeamStatus.RETURNING) {
			console.error(`Team ${teamId} not returning from mission`);
			return;
		}

		// Find the generated planet from AI requests
		const planetRequest = state.aiGenerationQueue.find(
			req => req.parameters?.teamId === teamId &&
			req.type === AIRequestType.PLANET_GENERATION &&
			req.result,
		);

		if (!planetRequest || !planetRequest.result) {
			console.error(`No planet generated for team ${teamId}`);

			// Mark team as available anyway
			this.returnTeamWithoutPlanet(teamId);
			return;
		}

		const newPlanet: Planet = planetRequest.result;

		// Based on exploration focus and team skills, discover some resources
		const explorationFocus = planetRequest.parameters.explorationFocus || 'general';
		const teamSkillSum = team.members.reduce((sum, member) => {
			return sum + this.getRelevantSkillValue(member.skills, explorationFocus);
		}, 0);

		// The higher the team skill, the more resources discovered
		const discoveryChance = Math.min(0.3 + (teamSkillSum / 50), 0.9);

		// Update resources to be discovered based on team skills
		const updatedResources = newPlanet.resources.map(resource => ({
			...resource,
			discovered: Math.random() < discoveryChance,
		}));

		// Calculate exploration status based on discovered resources percentage
		const discoveredCount = updatedResources.filter(r => r.discovered).length;
		const totalResources = updatedResources.length;
		let explorationStatus = ExplorationStatus.UNEXPLORED;

		if (discoveredCount / totalResources > 0.8) {
			explorationStatus = ExplorationStatus.FULLY_DOCUMENTED;
		} else if (discoveredCount / totalResources > 0.5) {
			explorationStatus = ExplorationStatus.EXPLORED;
		} else if (discoveredCount / totalResources > 0.2) {
			explorationStatus = ExplorationStatus.PARTIALLY_EXPLORED;
		}

		// Update planet with discoveries
		const updatedPlanet = {
			...newPlanet,
			resources: updatedResources,
			explorationStatus,
			discoveryDate: { ...state.gameTime },
		};

		// Generate a new gate address to discover
		const randomGateAddress = Array.from({ length: 6 }, () =>
			Math.floor(Math.random() * 36).toString(36),
		).join('').toUpperCase();

		// Add planet and return team
		this.gameStateManager.updateState(state => {
			// Update team status
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return { ...t, status: TeamStatus.AVAILABLE, returnTime: undefined };
				}
				return t;
			});

			// Add new planet to known planets
			return {
				...state,
				player: {
					...state.player,
					planets: {
						...state.player.planets,
						[updatedPlanet.id]: updatedPlanet,
					},
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
					discoveredGateAddresses: [
						...state.player.discoveredGateAddresses,
						randomGateAddress,
					],
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Planet Discovered',
			`${team.name} has returned from their mission and discovered ${newPlanet.name}, a ${newPlanet.climate.toLowerCase()} planet.`,
			NotificationType.SUCCESS,
		);
	}

	// Handle case where team returns but no planet was generated
	private returnTeamWithoutPlanet(teamId: string): void {
		this.gameStateManager.updateState(state => {
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return { ...t, status: TeamStatus.AVAILABLE, returnTime: undefined };
				}
				return t;
			});

			return {
				...state,
				player: {
					...state.player,
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Team Returned',
			`Team ${teamId} has returned from their mission but was unable to discover a viable planet.`,
			NotificationType.WARNING,
		);
	}

	// Explore an existing planet more deeply
	public continueExploration(planetId: string, teamId: string, focus: 'resources' | 'technology' | 'threats' | 'general'): boolean {
		const state = this.gameStateManager.getState();

		// Find the planet
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team || team.status !== TeamStatus.AVAILABLE) {
			console.error(`Team ${teamId} not available for exploration`);
			return false;
		}

		// Check if planet is fully documented
		if (planet.explorationStatus === ExplorationStatus.FULLY_DOCUMENTED) {
			console.error(`Planet ${planetId} is already fully documented`);
			return false;
		}

		// Mark team as on mission
		this.gameStateManager.updateState(state => {
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return {
						...t,
						status: TeamStatus.ON_MISSION,
						// Team will return in 1-3 days
						returnTime: {
							day: state.gameTime.day + 1 + Math.floor(Math.random() * 3),
							year: state.gameTime.year,
						},
					};
				}
				return t;
			});

			return {
				...state,
				player: {
					...state.player,
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Process results immediately (would normally be done after time advance)
		this.processAdditionalExploration(planetId, teamId, focus);

		return true;
	}

	// Process additional exploration of an existing planet
	private processAdditionalExploration(planetId: string, teamId: string, focus: 'resources' | 'technology' | 'threats' | 'general'): void {
		const state = this.gameStateManager.getState();

		// Find the planet
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			this.returnTeamWithoutPlanet(teamId);
			return;
		}

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team) {
			console.error(`Team ${teamId} not found`);
			return;
		}

		// Calculate team skill for this focus
		const teamSkillSum = team.members.reduce((sum, member) => {
			return sum + this.getRelevantSkillValue(member.skills, focus);
		}, 0);

		// The higher the team skill, the more discoveries
		const discoveryChance = Math.min(0.4 + (teamSkillSum / 40), 0.95);

		// Update planet based on focus
		const updatedPlanet = { ...planet };
		let discoveryMessage = '';

		switch (focus) {
		case 'resources':
			// Discover more resources
			const updatedResources = planet.resources.map(resource => ({
				...resource,
				discovered: resource.discovered || Math.random() < discoveryChance,
			}));

			const newlyDiscovered = updatedResources.filter(r => r.discovered).length -
					planet.resources.filter(r => r.discovered).length;

			updatedPlanet.resources = updatedResources;
			discoveryMessage = `Team discovered ${newlyDiscovered} new resource deposits.`;
			break;

		case 'technology':
			// Chance to discover technology
			if (Math.random() < discoveryChance * 0.7) {
				// Queue technology generation
				this.aiGenerationService.queueRequest(AIRequestType.TECHNOLOGY_GENERATION, {
					planetId,
				});
				discoveryMessage = 'Team discovered traces of advanced technology.';
			} else {
				discoveryMessage = 'Team found no significant technological artifacts.';
			}
			break;

		case 'threats':
			// Update threat assessment
			const threatAssessment = Math.random();
			updatedPlanet.threatLevel = (planet.threatLevel + threatAssessment) / 2;
			discoveryMessage = `Team assessed threat level at ${Math.round(updatedPlanet.threatLevel * 100)}%.`;
			break;

		case 'general':
		default:
			// Mix of discoveries
			// Update resources
			const generalResources = planet.resources.map(resource => ({
				...resource,
				discovered: resource.discovered || Math.random() < discoveryChance * 0.6,
			}));

			updatedPlanet.resources = generalResources;

			// Small chance of technology discovery
			if (Math.random() < discoveryChance * 0.3) {
				this.aiGenerationService.queueRequest(AIRequestType.TECHNOLOGY_GENERATION, {
					planetId,
				});
				discoveryMessage = 'Team completed general exploration and found signs of technology.';
			} else {
				discoveryMessage = 'Team completed general exploration of the planet.';
			}
			break;
		}

		// Calculate new exploration status
		const discoveredCount = updatedPlanet.resources.filter(r => r.discovered).length;
		const totalResources = updatedPlanet.resources.length;

		if (discoveredCount / totalResources > 0.8) {
			updatedPlanet.explorationStatus = ExplorationStatus.FULLY_DOCUMENTED;
		} else if (discoveredCount / totalResources > 0.5) {
			updatedPlanet.explorationStatus = ExplorationStatus.EXPLORED;
		} else if (discoveredCount / totalResources > 0.2) {
			updatedPlanet.explorationStatus = ExplorationStatus.PARTIALLY_EXPLORED;
		}

		// Update planet and return team
		this.gameStateManager.updateState(state => {
			// Update team status
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return { ...t, status: TeamStatus.AVAILABLE, returnTime: undefined };
				}
				return t;
			});

			// Update planet
			return {
				...state,
				player: {
					...state.player,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Exploration Complete',
			`${team.name} has completed exploring ${planet.name}. ${discoveryMessage}`,
			NotificationType.INFO,
		);
	}

	// Travel to a discovered planet
	public travelToPlanet(planetId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the planet
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		// Update current planet
		this.gameStateManager.updateState(state => ({
			...state,
			player: {
				...state.player,
				currentPlanetId: planetId,
			},
		}));

		// Add notification
		this.gameStateManager.addNotification(
			'Planet Travel',
			`You have travelled to ${planet.name}.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Helper method to get relevant skill value based on exploration focus
	private getRelevantSkillValue(skills: Record<SkillType, number>, focus?: string): number {
		switch (focus) {
		case 'resources':
			return (skills[SkillType.SCIENCE] * 0.7) + (skills[SkillType.ENGINEERING] * 0.3);
		case 'technology':
			return (skills[SkillType.SCIENCE] * 0.5) + (skills[SkillType.ENGINEERING] * 0.5);
		case 'threats':
			return (skills[SkillType.COMBAT] * 0.6) + (skills[SkillType.LEADERSHIP] * 0.4);
		case 'general':
		default:
			return (
				skills[SkillType.SCIENCE] * 0.3 +
					skills[SkillType.ENGINEERING] * 0.2 +
					skills[SkillType.COMBAT] * 0.2 +
					skills[SkillType.LEADERSHIP] * 0.3
			);
		}
	}

	// Check for teams ready to return from exploration
	public checkReturningTeams(): void {
		const state = this.gameStateManager.getState();
		const currentDay = state.gameTime.day;
		const currentYear = state.gameTime.year;

		// Find teams that should return
		state.player.stargateProgram.teams.forEach(team => {
			if (team.status === TeamStatus.ON_MISSION && team.returnTime) {
				if (
					(team.returnTime.year < currentYear) ||
					(team.returnTime.year === currentYear && team.returnTime.day <= currentDay)
				) {
					// Update team status to returning
					this.gameStateManager.updateState(state => {
						const updatedTeams = state.player.stargateProgram.teams.map(t => {
							if (t.id === team.id) {
								return { ...t, status: TeamStatus.RETURNING };
							}
							return t;
						});

						return {
							...state,
							player: {
								...state.player,
								stargateProgram: {
									...state.player.stargateProgram,
									teams: updatedTeams,
								},
							},
						};
					});

					// Process team return
					this.processTeamReturn(team.id);
				}
			}
		});
	}
}

export default PlanetExplorationSystem;
