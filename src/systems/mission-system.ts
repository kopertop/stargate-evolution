import {
	Mission,
	MissionType,
	Team,
	TeamStatus,
	SkillType,
	ResourceType,
	AIRequestType,
	RewardType,
	NotificationType,
	MissionReward,
} from '../types/game-types';
import { generateEntityId } from '../utils/id-generator';

import AIGenerationService from './ai-generation-service';
import GameStateManager from './game-state-manager';

class MissionSystem {
	private static instance: MissionSystem;
	private gameStateManager: GameStateManager;
	private aiGenerationService: AIGenerationService;

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
		this.aiGenerationService = AIGenerationService.getInstance();
	}

	public static getInstance(): MissionSystem {
		if (!MissionSystem.instance) {
			MissionSystem.instance = new MissionSystem();
		}
		return MissionSystem.instance;
	}

	// Generate a new mission for a planet
	public generateMission(planetId: string, forcedType?: MissionType): void {
		// Queue mission generation in AI service
		this.aiGenerationService.queueRequest(AIRequestType.MISSION_GENERATION, {
			planetId,
			forcedType,
		});
	}

	// Assign a team to a mission
	public assignTeam(missionId: string, teamId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the mission
		const mission = state.player.missions.find(m => m.id === missionId);
		if (!mission) {
			console.error(`Mission ${missionId} not found`);
			return false;
		}

		// Check if mission already has a team assigned
		if (mission.assignedTeamId) {
			console.error(`Mission ${missionId} already has team ${mission.assignedTeamId} assigned`);
			return false;
		}

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team) {
			console.error(`Team ${teamId} not found`);
			return false;
		}

		// Check if team is available
		if (team.status !== TeamStatus.AVAILABLE) {
			console.error(`Team ${teamId} is not available (status: ${team.status})`);
			return false;
		}

		// Calculate success probability based on team skills vs. mission requirements
		const successProbability = this.calculateSuccessProbability(team, mission);

		// Assign team to mission
		this.gameStateManager.updateState(state => {
			// Update mission with assigned team
			const updatedMissions = state.player.missions.map(m => {
				if (m.id === missionId) {
					return {
						...m,
						assignedTeamId: teamId,
					};
				}
				return m;
			});

			// Update team status
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return {
						...t,
						status: TeamStatus.ON_MISSION,
						assignedMissionId: missionId,
						// Team will return after mission duration
						returnTime: {
							day: state.gameTime.day + mission.duration,
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
					missions: updatedMissions,
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Team Assigned to Mission',
			`${team.name} has been assigned to the mission: ${mission.description}. Estimated success probability: ${Math.round(successProbability * 100)}%`,
			NotificationType.INFO,
		);

		return true;
	}

	// Calculate success probability for a team on a mission
	private calculateSuccessProbability(team: Team, mission: MissionType | Mission): number {
		// If passed a mission type instead of a mission object
		if (typeof mission === 'string') {
			// Default requirements by mission type
			const defaultRequirements: Record<MissionType, Record<SkillType, number>> = {
				[MissionType.EXPLORATION]: {
					[SkillType.SCIENCE]: 5,
					[SkillType.LEADERSHIP]: 3,
					[SkillType.ENGINEERING]: 2,
					[SkillType.COMBAT]: 2,
					[SkillType.DIPLOMACY]: 1,
					[SkillType.MEDICINE]: 1,
				},
				[MissionType.COMBAT]: {
					[SkillType.COMBAT]: 6,
					[SkillType.LEADERSHIP]: 4,
					[SkillType.MEDICINE]: 2,
					[SkillType.ENGINEERING]: 1,
					[SkillType.SCIENCE]: 1,
					[SkillType.DIPLOMACY]: 0,
				},
				[MissionType.DIPLOMACY]: {
					[SkillType.DIPLOMACY]: 6,
					[SkillType.LEADERSHIP]: 4,
					[SkillType.SCIENCE]: 2,
					[SkillType.MEDICINE]: 1,
					[SkillType.COMBAT]: 1,
					[SkillType.ENGINEERING]: 0,
				},
				[MissionType.RESEARCH]: {
					[SkillType.SCIENCE]: 6,
					[SkillType.ENGINEERING]: 4,
					[SkillType.LEADERSHIP]: 2,
					[SkillType.MEDICINE]: 2,
					[SkillType.DIPLOMACY]: 0,
					[SkillType.COMBAT]: 0,
				},
				[MissionType.RESCUE]: {
					[SkillType.MEDICINE]: 5,
					[SkillType.COMBAT]: 4,
					[SkillType.LEADERSHIP]: 3,
					[SkillType.ENGINEERING]: 2,
					[SkillType.SCIENCE]: 1,
					[SkillType.DIPLOMACY]: 1,
				},
			};

			// Use default requirements for mission type
			const requirements = defaultRequirements[mission as MissionType];

			let totalSkillValue = 0;
			let totalRequiredValue = 0;

			// Sum team skills and requirements
			Object.values(SkillType).forEach(skillType => {
				const requiredSkill = requirements[skillType] || 0;
				totalRequiredValue += requiredSkill;

				// Sum skills from all team members
				const teamSkillValue = team.members.reduce((sum, member) => {
					return sum + (member.skills[skillType] || 0);
				}, 0);

				totalSkillValue += Math.min(teamSkillValue, requiredSkill * 2); // Cap at 2x requirement
			});

			// Calculate probability (0.0 to 1.0)
			return Math.min(totalSkillValue / (totalRequiredValue * 1.5), 1.0);
		} else {
			// If we have a specific mission object
			const missionObj = mission as Mission;
			const requirements = missionObj.requirements;

			let totalSkillValue = 0;
			let totalRequiredValue = 0;

			// Sum team skills and requirements for each required skill
			Object.entries(requirements).forEach(([skillType, requiredValue]) => {
				totalRequiredValue += requiredValue;

				// Sum skills from all team members
				const teamSkillValue = team.members.reduce((sum, member) => {
					return sum + (member.skills[skillType as SkillType] || 0);
				}, 0);

				totalSkillValue += Math.min(teamSkillValue, requiredValue * 2); // Cap at 2x requirement
			});

			// Calculate probability (0.0 to 1.0)
			return Math.min(totalSkillValue / (totalRequiredValue * 1.5), 1.0);
		}
	}

	// Check for teams ready to return from missions
	public checkReturningTeams(): void {
		const state = this.gameStateManager.getState();
		const currentDay = state.gameTime.day;
		const currentYear = state.gameTime.year;

		// Find teams that should return
		state.player.stargateProgram.teams.forEach(team => {
			if (
				team.status === TeamStatus.ON_MISSION &&
				team.returnTime &&
				team.assignedMissionId
			) {
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

					// Process mission completion
					this.completeMission(team.assignedMissionId, team.id);
				}
			}
		});
	}

	// Complete a mission and process rewards
	private completeMission(missionId: string, teamId: string): void {
		const state = this.gameStateManager.getState();

		// Find the mission
		const mission = state.player.missions.find(m => m.id === missionId);
		if (!mission) {
			console.error(`Mission ${missionId} not found`);
			this.returnTeam(teamId);
			return;
		}

		// Find the team
		const team = state.player.stargateProgram.teams.find(t => t.id === teamId);
		if (!team) {
			console.error(`Team ${teamId} not found`);
			return;
		}

		// Calculate success probability
		const successProbability = this.calculateSuccessProbability(team, mission);

		// Determine if mission was successful
		const isSuccessful = Math.random() < successProbability;

		// Process mission completion
		this.gameStateManager.updateState(state => {
			// Update mission status
			const updatedMissions = state.player.missions.map(m => {
				if (m.id === missionId) {
					return {
						...m,
						progress: 100,
						complete: true,
					};
				}
				return m;
			});

			// Update team status
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return {
						...t,
						status: TeamStatus.AVAILABLE,
						assignedMissionId: undefined,
						returnTime: undefined,
					};
				}
				return t;
			});

			return {
				...state,
				player: {
					...state.player,
					missions: updatedMissions,
					stargateProgram: {
						...state.player.stargateProgram,
						teams: updatedTeams,
					},
				},
			};
		});

		// Process rewards if mission was successful
		if (isSuccessful) {
			this.processRewards(mission.rewards);

			// Add notification
			this.gameStateManager.addNotification(
				'Mission Completed Successfully',
				`${team.name} has successfully completed the mission: ${mission.description}.`,
				NotificationType.SUCCESS,
			);
		} else {
			// Add notification
			this.gameStateManager.addNotification(
				'Mission Failed',
				`${team.name} has returned but failed to complete the mission: ${mission.description}.`,
				NotificationType.WARNING,
			);
		}
	}

	// Process mission rewards
	private processRewards(rewards: MissionReward[]): void {
		rewards.forEach(reward => {
			switch (reward.type) {
			case RewardType.RESOURCE:
				if (reward.resourceType && reward.amount) {
					this.gameStateManager.updateState(state => {
						const updatedResources = { ...state.player.resources };
						updatedResources[reward.resourceType as ResourceType] += reward.amount as number;

						return {
							...state,
							player: {
								...state.player,
								resources: updatedResources,
							},
						};
					});

					// Add notification
					this.gameStateManager.addNotification(
						'Resources Acquired',
						`Mission reward: ${reward.amount} ${reward.resourceType}`,
						NotificationType.INFO,
					);
				}
				break;

			case RewardType.TECHNOLOGY:
				// Queue technology generation
				this.aiGenerationService.queueRequest(AIRequestType.TECHNOLOGY_GENERATION, {
					origin: 'UNKNOWN',
				});

				// Add notification
				this.gameStateManager.addNotification(
					'Technology Discovered',
					'Mission reward: New technology discovered',
					NotificationType.INFO,
				);
				break;

			case RewardType.GATE_ADDRESS:
				// Generate a random gate address
				const gateAddress = Array.from({ length: 6 }, () =>
					Math.floor(Math.random() * 36).toString(36),
				).join('').toUpperCase();

				this.gameStateManager.updateState(state => ({
					...state,
					player: {
						...state.player,
						discoveredGateAddresses: [
							...state.player.discoveredGateAddresses,
							gateAddress,
						],
					},
				}));

				// Add notification
				this.gameStateManager.addNotification(
					'Gate Address Discovered',
					`Mission reward: New Stargate address discovered: ${gateAddress}`,
					NotificationType.INFO,
				);
				break;

			case RewardType.ALLY:
				// Ally rewards would be handled by another system
				this.gameStateManager.addNotification(
					'New Ally',
					'Mission reward: New potential ally contact established',
					NotificationType.INFO,
				);
				break;
			}
		});
	}

	// Just return a team without completing a mission
	private returnTeam(teamId: string): void {
		this.gameStateManager.updateState(state => {
			const updatedTeams = state.player.stargateProgram.teams.map(t => {
				if (t.id === teamId) {
					return {
						...t,
						status: TeamStatus.AVAILABLE,
						assignedMissionId: undefined,
						returnTime: undefined,
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
	}

	// Add a new mission to the game
	public addMission(mission: Mission): void {
		this.gameStateManager.updateState(state => ({
			...state,
			player: {
				...state.player,
				missions: [...state.player.missions, mission],
			},
		}));

		// Add notification
		this.gameStateManager.addNotification(
			'New Mission Available',
			`A new mission is available: ${mission.description}`,
			NotificationType.INFO,
		);
	}

	// Create a new team
	public createTeam(teamName: string, members: string[]): boolean {
		const state = this.gameStateManager.getState();

		// Check if we've reached max teams
		if (state.player.stargateProgram.teams.length >= state.player.stargateProgram.maxTeams) {
			console.error('Maximum team limit reached');
			return false;
		}

		// Create a new team ID
		const teamId = generateEntityId('team');

		// Create the team with basic personnel
		const newTeam: Team = {
			id: teamId,
			name: teamName,
			members: [
				{
					id: generateEntityId('teamMember'),
					name: members[0] || 'Team Leader',
					skills: {
						[SkillType.LEADERSHIP]: 5,
						[SkillType.COMBAT]: 3,
						[SkillType.SCIENCE]: 3,
						[SkillType.ENGINEERING]: 2,
						[SkillType.DIPLOMACY]: 2,
						[SkillType.MEDICINE]: 2,
					},
					specialization: 'MILITARY' as any,
				},
			],
			status: TeamStatus.AVAILABLE,
		};

		// Add additional members if specified
		if (members.length > 1) {
			const specializations = [
				'SCIENTIST',
				'ENGINEER',
				'MILITARY',
				'DIPLOMAT',
			];

			// Add team members (up to 4 total)
			for (let i = 1; i < Math.min(members.length, 4); i++) {
				const specialization = specializations[i % specializations.length];

				// Generate skills based on specialization
				const skills: Record<SkillType, number> = {
					[SkillType.LEADERSHIP]: 2,
					[SkillType.COMBAT]: 2,
					[SkillType.SCIENCE]: 2,
					[SkillType.ENGINEERING]: 2,
					[SkillType.DIPLOMACY]: 2,
					[SkillType.MEDICINE]: 2,
				};

				// Boost skills based on specialization
				switch (specialization) {
				case 'SCIENTIST':
					skills[SkillType.SCIENCE] = 6;
					skills[SkillType.MEDICINE] = 4;
					break;
				case 'ENGINEER':
					skills[SkillType.ENGINEERING] = 6;
					skills[SkillType.SCIENCE] = 4;
					break;
				case 'MILITARY':
					skills[SkillType.COMBAT] = 6;
					skills[SkillType.LEADERSHIP] = 4;
					break;
				case 'DIPLOMAT':
					skills[SkillType.DIPLOMACY] = 6;
					skills[SkillType.LEADERSHIP] = 4;
					break;
				}

				newTeam.members.push({
					id: generateEntityId('teamMember'),
					name: members[i],
					skills,
					specialization: specialization as any,
				});
			}
		}

		// Add the team
		this.gameStateManager.updateState(state => ({
			...state,
			player: {
				...state.player,
				stargateProgram: {
					...state.player.stargateProgram,
					teams: [...state.player.stargateProgram.teams, newTeam],
				},
			},
		}));

		// Add notification
		this.gameStateManager.addNotification(
			'New Team Created',
			`A new team "${teamName}" has been formed with ${newTeam.members.length} members.`,
			NotificationType.SUCCESS,
		);

		return true;
	}

	// Get active missions
	public getActiveMissions(): Mission[] {
		const state = this.gameStateManager.getState();
		return state.player.missions.filter(mission => !mission.complete);
	}

	// Get completed missions
	public getCompletedMissions(): Mission[] {
		const state = this.gameStateManager.getState();
		return state.player.missions.filter(mission => mission.complete);
	}
}

export default MissionSystem;
