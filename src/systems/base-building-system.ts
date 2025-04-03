import {
	Base,
	BaseType,
	Building,
	BuildingType,
	ResourceType,
	PersonnelType,
	NotificationType,
} from '../types/game-types';
import { generateId } from '../utils/id-generator';

import GameStateManager from './game-state-manager';

interface ResourceCost {
	[ResourceType.MINERAL]: number;
	[ResourceType.ORGANIC]: number;
	[ResourceType.ENERGY]: number;
	[ResourceType.EXOTIC]: number;
	[ResourceType.NAQUADAH]: number;
}

interface BuildingCost extends ResourceCost {
	constructionTime: number; // In game days
	personnelRequirements: {
		[PersonnelType.SCIENTIST]?: number;
		[PersonnelType.MILITARY]?: number;
		[PersonnelType.ENGINEER]?: number;
		[PersonnelType.DIPLOMAT]?: number;
	};
}

class BaseBuildingSystem {
	private static instance: BaseBuildingSystem;
	private gameStateManager: GameStateManager;

	// Base costs by type
	private baseCosts: Record<BaseType, ResourceCost> = {
		[BaseType.MINING]: {
			[ResourceType.MINERAL]: 200,
			[ResourceType.ORGANIC]: 50,
			[ResourceType.ENERGY]: 100,
			[ResourceType.EXOTIC]: 20,
			[ResourceType.NAQUADAH]: 10,
		},
		[BaseType.RESEARCH]: {
			[ResourceType.MINERAL]: 150,
			[ResourceType.ORGANIC]: 50,
			[ResourceType.ENERGY]: 150,
			[ResourceType.EXOTIC]: 50,
			[ResourceType.NAQUADAH]: 15,
		},
		[BaseType.MILITARY]: {
			[ResourceType.MINERAL]: 250,
			[ResourceType.ORGANIC]: 100,
			[ResourceType.ENERGY]: 120,
			[ResourceType.EXOTIC]: 30,
			[ResourceType.NAQUADAH]: 20,
		},
		[BaseType.DIPLOMATIC]: {
			[ResourceType.MINERAL]: 180,
			[ResourceType.ORGANIC]: 150,
			[ResourceType.ENERGY]: 100,
			[ResourceType.EXOTIC]: 40,
			[ResourceType.NAQUADAH]: 5,
		},
		[BaseType.MIXED]: {
			[ResourceType.MINERAL]: 300,
			[ResourceType.ORGANIC]: 120,
			[ResourceType.ENERGY]: 150,
			[ResourceType.EXOTIC]: 40,
			[ResourceType.NAQUADAH]: 25,
		},
	};

	// Building costs by type
	private buildingCosts: Record<BuildingType, BuildingCost> = {
		[BuildingType.MINING_FACILITY]: {
			[ResourceType.MINERAL]: 80,
			[ResourceType.ORGANIC]: 20,
			[ResourceType.ENERGY]: 40,
			[ResourceType.EXOTIC]: 5,
			[ResourceType.NAQUADAH]: 0,
			constructionTime: 3,
			personnelRequirements: {
				[PersonnelType.ENGINEER]: 2,
			},
		},
		[BuildingType.RESEARCH_LAB]: {
			[ResourceType.MINERAL]: 60,
			[ResourceType.ORGANIC]: 30,
			[ResourceType.ENERGY]: 70,
			[ResourceType.EXOTIC]: 20,
			[ResourceType.NAQUADAH]: 5,
			constructionTime: 4,
			personnelRequirements: {
				[PersonnelType.SCIENTIST]: 3,
				[PersonnelType.ENGINEER]: 1,
			},
		},
		[BuildingType.POWER_GENERATOR]: {
			[ResourceType.MINERAL]: 100,
			[ResourceType.ORGANIC]: 20,
			[ResourceType.ENERGY]: 20,
			[ResourceType.EXOTIC]: 10,
			[ResourceType.NAQUADAH]: 3,
			constructionTime: 2,
			personnelRequirements: {
				[PersonnelType.ENGINEER]: 2,
			},
		},
		[BuildingType.DEFENSE_SYSTEM]: {
			[ResourceType.MINERAL]: 120,
			[ResourceType.ORGANIC]: 10,
			[ResourceType.ENERGY]: 50,
			[ResourceType.EXOTIC]: 15,
			[ResourceType.NAQUADAH]: 10,
			constructionTime: 5,
			personnelRequirements: {
				[PersonnelType.MILITARY]: 3,
				[PersonnelType.ENGINEER]: 1,
			},
		},
		[BuildingType.BARRACKS]: {
			[ResourceType.MINERAL]: 90,
			[ResourceType.ORGANIC]: 40,
			[ResourceType.ENERGY]: 30,
			[ResourceType.EXOTIC]: 5,
			[ResourceType.NAQUADAH]: 0,
			constructionTime: 3,
			personnelRequirements: {
				[PersonnelType.MILITARY]: 2,
			},
		},
		[BuildingType.STARGATE_SHIELD]: {
			[ResourceType.MINERAL]: 100,
			[ResourceType.ORGANIC]: 10,
			[ResourceType.ENERGY]: 80,
			[ResourceType.EXOTIC]: 30,
			[ResourceType.NAQUADAH]: 15,
			constructionTime: 6,
			personnelRequirements: {
				[PersonnelType.MILITARY]: 1,
				[PersonnelType.ENGINEER]: 2,
				[PersonnelType.SCIENTIST]: 1,
			},
		},
	};

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
	}

	public static getInstance(): BaseBuildingSystem {
		if (!BaseBuildingSystem.instance) {
			BaseBuildingSystem.instance = new BaseBuildingSystem();
		}
		return BaseBuildingSystem.instance;
	}

	// Start building a new base on a planet
	public startBaseConstruction(planetId: string, baseType: BaseType, baseName: string): boolean {
		const state = this.gameStateManager.getState();

		// Check if the planet exists
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		// Check if we've reached the base limit
		const baseCount = Object.values(state.player.planets).reduce(
			(count, planet) => count + planet.bases.length,
			0,
		);

		if (baseCount >= state.player.stargateProgram.baseLimit) {
			console.error('Base limit reached');
			return false;
		}

		// Check resource requirements
		const costs = this.baseCosts[baseType];
		for (const resourceType of Object.values(ResourceType)) {
			if (state.player.resources[resourceType] < costs[resourceType]) {
				console.error(`Insufficient ${resourceType} resources`);
				return false;
			}
		}

		// Create a new base
		const newBase: Base = {
			id: generateId(),
			name: baseName,
			type: baseType,
			level: 1,
			buildings: [],
			constructionProgress: 0,
			constructionComplete: false,
			personnel: {
				[PersonnelType.SCIENTIST]: 0,
				[PersonnelType.MILITARY]: 0,
				[PersonnelType.ENGINEER]: 0,
				[PersonnelType.DIPLOMAT]: 0,
			},
		};

		// Deduct resources
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };
			for (const resourceType of Object.values(ResourceType)) {
				updatedResources[resourceType] -= costs[resourceType];
			}

			// Add base to planet
			const updatedPlanet = {
				...state.player.planets[planetId],
				bases: [...state.player.planets[planetId].bases, newBase],
			};

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Base Construction Started',
			`Construction of ${baseName} (${baseType}) has begun on ${planet.name}.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Start building a new building in a base
	public startBuildingConstruction(planetId: string, baseId: string, buildingType: BuildingType): boolean {
		const state = this.gameStateManager.getState();

		// Find planet and base
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		const base = planet.bases.find(b => b.id === baseId);
		if (!base) {
			console.error(`Base ${baseId} not found on planet ${planetId}`);
			return false;
		}

		// Check if base construction is complete
		if (!base.constructionComplete) {
			console.error('Base construction must be complete before building structures');
			return false;
		}

		// Check resource requirements
		const costs = this.buildingCosts[buildingType];
		for (const resourceType of Object.values(ResourceType)) {
			if (state.player.resources[resourceType] < costs[resourceType]) {
				console.error(`Insufficient ${resourceType} resources`);
				return false;
			}
		}

		// Check personnel requirements
		for (const personnelType of Object.keys(costs.personnelRequirements) as PersonnelType[]) {
			const required = costs.personnelRequirements[personnelType] || 0;
			if (base.personnel[personnelType] < required) {
				console.error(`Insufficient ${personnelType} personnel at base`);
				return false;
			}
		}

		// Create new building
		const newBuilding: Building = {
			id: generateId(),
			type: buildingType,
			level: 1,
			constructionProgress: 0,
			constructionComplete: false,
			active: false,
		};

		// Deduct resources
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };
			for (const resourceType of Object.values(ResourceType)) {
				updatedResources[resourceType] -= costs[resourceType];
			}

			// Add building to base
			const updatedBases = state.player.planets[planetId].bases.map(b => {
				if (b.id === baseId) {
					return {
						...b,
						buildings: [...b.buildings, newBuilding],
					};
				}
				return b;
			});

			// Update planet
			const updatedPlanet = {
				...state.player.planets[planetId],
				bases: updatedBases,
			};

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Building Construction Started',
			`Construction of a ${buildingType} has begun at ${base.name} on ${planet.name}.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Assign personnel to a base
	public assignPersonnel(planetId: string, baseId: string, personnelType: PersonnelType, count: number): boolean {
		const state = this.gameStateManager.getState();

		// Find planet and base
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		const base = planet.bases.find(b => b.id === baseId);
		if (!base) {
			console.error(`Base ${baseId} not found on planet ${planetId}`);
			return false;
		}

		// Check if we have enough personnel available
		if (state.player.personnel[personnelType] < count) {
			console.error(`Insufficient ${personnelType} personnel available`);
			return false;
		}

		// Update base and player personnel
		this.gameStateManager.updateState(state => {
			// Update bases
			const updatedBases = state.player.planets[planetId].bases.map(b => {
				if (b.id === baseId) {
					return {
						...b,
						personnel: {
							...b.personnel,
							[personnelType]: b.personnel[personnelType] + count,
						},
					};
				}
				return b;
			});

			// Update planet
			const updatedPlanet = {
				...state.player.planets[planetId],
				bases: updatedBases,
			};

			// Update player personnel
			const updatedPersonnel = {
				...state.player.personnel,
				[personnelType]: state.player.personnel[personnelType] - count,
			};

			return {
				...state,
				player: {
					...state.player,
					personnel: updatedPersonnel,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Personnel Assigned',
			`${count} ${personnelType} personnel have been assigned to ${base.name} on ${planet.name}.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Update construction progress for all bases and buildings
	public updateConstructionProgress(): void {
		const state = this.gameStateManager.getState();

		// For each planet
		Object.keys(state.player.planets).forEach(planetId => {
			const planet = state.player.planets[planetId];
			let planetUpdated = false;

			// For each base on the planet
			const updatedBases = planet.bases.map(base => {
				let baseUpdated = false;

				// If base is under construction
				if (!base.constructionComplete) {
					// Increase progress by 10% per day
					let newProgress = base.constructionProgress + 10;
					let newConstructionComplete: boolean = base.constructionComplete;

					if (newProgress >= 100) {
						newProgress = 100;
						newConstructionComplete = true;

						// Notification for base completion
						this.gameStateManager.addNotification(
							'Base Construction Complete',
							`${base.name} on ${planet.name} is now operational.`,
							NotificationType.SUCCESS,
						);
					}

					if (base.constructionProgress !== newProgress) {
						baseUpdated = true;
						planetUpdated = true;
					}

					return {
						...base,
						constructionProgress: newProgress,
						constructionComplete: newConstructionComplete,
					};
				}

				// For each building in the base
				const updatedBuildings = base.buildings.map(building => {
					if (!building.constructionComplete) {
						// Calculate progress increase based on building type
						const buildingCost = this.buildingCosts[building.type];
						const progressPerDay = 100 / buildingCost.constructionTime;

						let newProgress: number = building.constructionProgress + progressPerDay;
						let newConstructionComplete: boolean = building.constructionComplete;
						let newActive: boolean = building.active;

						if (newProgress >= 100) {
							newProgress = 100;
							newConstructionComplete = true;
							newActive = true;

							// Notification for building completion
							this.gameStateManager.addNotification(
								'Building Construction Complete',
								`${building.type} at ${base.name} on ${planet.name} is now operational.`,
								NotificationType.SUCCESS,
							);
						}

						if (building.constructionProgress !== newProgress) {
							baseUpdated = true;
							planetUpdated = true;
						}

						return {
							...building,
							constructionProgress: newProgress,
							constructionComplete: newConstructionComplete,
							active: newActive,
						};
					}

					return building;
				});

				if (baseUpdated || updatedBuildings.some((b, i) => b !== base.buildings[i])) {
					return {
						...base,
						buildings: updatedBuildings,
					};
				}

				return base;
			});

			if (planetUpdated) {
				const updatedPlanet = {
					...planet,
					bases: updatedBases,
				};

				// Update the planet
				this.gameStateManager.updateState(state => ({
					...state,
					player: {
						...state.player,
						planets: {
							...state.player.planets,
							[planetId]: updatedPlanet,
						},
					},
				}));
			}
		});
	}

	// Get resource production per day for a base
	public getBaseResourceProduction(baseId: string, planetId: string): Record<ResourceType, number> {
		const state = this.gameStateManager.getState();
		const planet = state.player.planets[planetId];
		if (!planet) return this.emptyResourceProduction();

		const base = planet.bases.find(b => b.id === baseId);
		if (!base || !base.constructionComplete) return this.emptyResourceProduction();

		const production = this.emptyResourceProduction();

		// Base production based on base type
		switch (base.type) {
		case BaseType.MINING:
			production[ResourceType.MINERAL] += 5;
			production[ResourceType.ENERGY] += 2;
			break;
		case BaseType.RESEARCH:
			production[ResourceType.EXOTIC] += 2;
			break;
		case BaseType.MILITARY:
			production[ResourceType.MINERAL] += 2;
			production[ResourceType.ENERGY] += 3;
			break;
		case BaseType.DIPLOMATIC:
			production[ResourceType.ORGANIC] += 3;
			break;
		case BaseType.MIXED:
			production[ResourceType.MINERAL] += 2;
			production[ResourceType.ORGANIC] += 2;
			production[ResourceType.ENERGY] += 2;
			production[ResourceType.EXOTIC] += 1;
			break;
		}

		// Add production from buildings
		for (const building of base.buildings) {
			if (building.constructionComplete && building.active) {
				switch (building.type) {
				case BuildingType.MINING_FACILITY:
					// Find minerals on planet
					// Bonus based on mineral deposits
					for (const deposit of planet.resources.filter(
						(r) => Boolean(r.type === ResourceType.MINERAL && r.discovered),
					)) {
						production[ResourceType.MINERAL] +=
								Math.floor(5 * deposit.abundance * (1 - deposit.difficulty * 0.5));
					}
					break;

				case BuildingType.POWER_GENERATOR:
					production[ResourceType.ENERGY] += 10;
					break;

				case BuildingType.RESEARCH_LAB:
					production[ResourceType.EXOTIC] += 3;

					// Small chance of producing Naquadah through research
					if (Math.random() < 0.1) {
						production[ResourceType.NAQUADAH] += 1;
					}
					break;

					// Other buildings don't directly produce resources
				}
			}
		}

		// Production affected by base level
		Object.keys(production).forEach(resource => {
			production[resource as ResourceType] *= (1 + (base.level - 1) * 0.2);
		});

		return production;
	}

	// Get empty resource production object
	private emptyResourceProduction(): Record<ResourceType, number> {
		return {
			[ResourceType.MINERAL]: 0,
			[ResourceType.ORGANIC]: 0,
			[ResourceType.ENERGY]: 0,
			[ResourceType.EXOTIC]: 0,
			[ResourceType.NAQUADAH]: 0,
		};
	}

	// Process resource production for all bases
	public processResourceProduction(): void {
		const state = this.gameStateManager.getState();
		const totalProduction = this.emptyResourceProduction();

		// For each planet
		Object.keys(state.player.planets).forEach(planetId => {
			const planet = state.player.planets[planetId];

			// For each base on the planet
			planet.bases.forEach(base => {
				if (base.constructionComplete) {
					const baseProduction = this.getBaseResourceProduction(base.id, planetId);

					// Add to total production
					Object.keys(baseProduction).forEach(resource => {
						totalProduction[resource as ResourceType] += baseProduction[resource as ResourceType];
					});
				}
			});
		});

		// Apply production to player resources
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };

			Object.keys(totalProduction).forEach(resource => {
				updatedResources[resource as ResourceType] += totalProduction[resource as ResourceType];
			});

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
				},
			};
		});
	}

	// Upgrade a base
	public upgradeBase(planetId: string, baseId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the planet and base
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		const base = planet.bases.find(b => b.id === baseId);
		if (!base) {
			console.error(`Base ${baseId} not found on planet ${planetId}`);
			return false;
		}

		// Check if base is complete
		if (!base.constructionComplete) {
			console.error('Base construction must be complete before upgrading');
			return false;
		}

		// Calculate upgrade costs (2x initial cost)
		const baseType = base.type;
		const costs = { ...this.baseCosts[baseType] };
		Object.keys(costs).forEach(resource => {
			costs[resource as ResourceType] = Math.floor(costs[resource as ResourceType] * 2);
		});

		// Check resource requirements
		for (const resourceType of Object.values(ResourceType)) {
			if (state.player.resources[resourceType] < costs[resourceType]) {
				console.error(`Insufficient ${resourceType} resources for upgrade`);
				return false;
			}
		}

		// Deduct resources and update base
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };
			for (const resourceType of Object.values(ResourceType)) {
				updatedResources[resourceType] -= costs[resourceType];
			}

			// Update base level
			const updatedBases = state.player.planets[planetId].bases.map(b => {
				if (b.id === baseId) {
					return {
						...b,
						level: b.level + 1,
					};
				}
				return b;
			});

			// Update planet
			const updatedPlanet = {
				...state.player.planets[planetId],
				bases: updatedBases,
			};

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Base Upgraded',
			`${base.name} on ${planet.name} has been upgraded to level ${base.level + 1}.`,
			NotificationType.SUCCESS,
		);

		return true;
	}

	// Upgrade a building
	public upgradeBuilding(planetId: string, baseId: string, buildingId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the planet and base
		const planet = state.player.planets[planetId];
		if (!planet) {
			console.error(`Planet ${planetId} not found`);
			return false;
		}

		const base = planet.bases.find(b => b.id === baseId);
		if (!base) {
			console.error(`Base ${baseId} not found on planet ${planetId}`);
			return false;
		}

		// Find the building
		const building = base.buildings.find(b => b.id === buildingId);
		if (!building) {
			console.error(`Building ${buildingId} not found in base ${baseId}`);
			return false;
		}

		// Check if building is complete
		if (!building.constructionComplete) {
			console.error('Building construction must be complete before upgrading');
			return false;
		}

		// Calculate upgrade costs (1.5x initial cost)
		const buildingType = building.type;
		const costs = { ...this.buildingCosts[buildingType] };
		Object.keys(costs).forEach(resource => {
			if (resource !== 'constructionTime' && resource !== 'personnelRequirements') {
				costs[resource as ResourceType] = Math.floor(costs[resource as ResourceType] * 1.5);
			}
		});

		// Check resource requirements
		for (const resourceType of Object.values(ResourceType)) {
			if (state.player.resources[resourceType] < costs[resourceType]) {
				console.error(`Insufficient ${resourceType} resources for upgrade`);
				return false;
			}
		}

		// Deduct resources and update building
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };
			for (const resourceType of Object.values(ResourceType)) {
				updatedResources[resourceType] -= costs[resourceType];
			}

			// Update building level and set to under construction
			const updatedBuildings = base.buildings.map(b => {
				if (b.id === buildingId) {
					return {
						...b,
						level: b.level + 1,
						constructionProgress: 0,
						constructionComplete: false,
						active: false,
					};
				}
				return b;
			});

			// Update base
			const updatedBases = state.player.planets[planetId].bases.map(b => {
				if (b.id === baseId) {
					return {
						...b,
						buildings: updatedBuildings,
					};
				}
				return b;
			});

			// Update planet
			const updatedPlanet = {
				...state.player.planets[planetId],
				bases: updatedBases,
			};

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
					planets: {
						...state.player.planets,
						[planetId]: updatedPlanet,
					},
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Building Upgrade Started',
			`Upgrade of ${building.type} at ${base.name} on ${planet.name} has begun.`,
			NotificationType.INFO,
		);

		return true;
	}
}

export default BaseBuildingSystem;
