import {
	AIGenerationRequest,
	AIRequestType,
	AIRequestStatus,
	Planet,
	ClimateType,
	ResourceType,
	ExplorationStatus,
	Technology,
	TechnologyCategory,
	TechnologyOrigin,
	BenefitType,
	Mission,
	MissionType,
	SkillType,
	RewardType,
	Civilization,
} from '../types/game-types';
import { generateEntityId } from '../utils/id-generator';

import GameStateManager from './game-state-manager';

class AIGenerationService {
	private static instance: AIGenerationService;
	private gameStateManager: GameStateManager;
	private isProcessing = false;
	private processingInterval: NodeJS.Timeout | null = null;

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
		this.startProcessingQueue();
	}

	public static getInstance(): AIGenerationService {
		if (!AIGenerationService.instance) {
			AIGenerationService.instance = new AIGenerationService();
		}
		return AIGenerationService.instance;
	}

	private startProcessingQueue(): void {
		// Process queue every 2 seconds
		this.processingInterval = setInterval(() => {
			this.processNextRequest();
		}, 2000);
	}

	public stopProcessingQueue(): void {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
		}
	}

	private async processNextRequest(): Promise<void> {
		if (this.isProcessing) return;

		const state = this.gameStateManager.getState();
		const pendingRequests = state.aiGenerationQueue.filter(
			req => req.status === AIRequestStatus.PENDING,
		);

		if (pendingRequests.length === 0) return;

		// Get the first pending request
		const request = pendingRequests[0];

		// Mark request as in progress
		this.isProcessing = true;
		this.updateRequestStatus(request.type, request.parameters, AIRequestStatus.IN_PROGRESS);

		try {
			let result;
			// Process based on request type
			switch (request.type) {
			case AIRequestType.PLANET_GENERATION:
				result = await this.generatePlanet(request.parameters);
				break;
			case AIRequestType.TECHNOLOGY_GENERATION:
				result = await this.generateTechnology(request.parameters);
				break;
			case AIRequestType.MISSION_GENERATION:
				result = await this.generateMission(request.parameters);
				break;
			case AIRequestType.CIVILIZATION_GENERATION:
				result = await this.generateCivilization(request.parameters);
				break;
			default:
				throw new Error(`Unknown request type: ${request.type}`);
			}

			// Update request as completed with result
			this.updateRequestStatus(request.type, request.parameters, AIRequestStatus.COMPLETED, result);
		} catch (error) {
			console.error(`Failed to process request: ${error}`);
			this.updateRequestStatus(request.type, request.parameters, AIRequestStatus.FAILED);
		} finally {
			this.isProcessing = false;
		}
	}

	private updateRequestStatus(
		type: AIRequestType,
		parameters: Record<string, any>,
		status: AIRequestStatus,
		result?: any,
	): void {
		this.gameStateManager.updateState(state => {
			const updatedQueue = state.aiGenerationQueue.map(req => {
				if (req.type === type &&
					JSON.stringify(req.parameters) === JSON.stringify(parameters)) {
					return { ...req, status, result };
				}
				return req;
			});

			return {
				...state,
				aiGenerationQueue: updatedQueue,
			};
		});
	}

	// Queue a new generation request
	public queueRequest(type: AIRequestType, parameters: Record<string, any>): void {
		const newRequest: AIGenerationRequest = {
			type,
			parameters,
			status: AIRequestStatus.PENDING,
		};

		this.gameStateManager.updateState(state => ({
			...state,
			aiGenerationQueue: [...state.aiGenerationQueue, newRequest],
		}));
	}

	// Generate a new planet
	private async generatePlanet(parameters: Record<string, any>): Promise<Planet> {
		// Simulate async generation
		await this.delay(1000);

		const { galaxyName, distanceFromEarth } = parameters;

		// Generate planet name
		const planetNames = [
			'Abydos', 'Chulak', 'Dakara', 'Erebus', 'Heliopolis',
			'Kallana', 'Langara', 'Orilla', 'Praclarush', 'Tollan',
		];
		const randomIndex = Math.floor(Math.random() * planetNames.length);
		const planetName = `${planetNames[randomIndex]}-${Math.floor(Math.random() * 999)}`;

		// Generate a random gate address
		const gateAddress = Array.from({ length: 6 }, () =>
			Math.floor(Math.random() * 36).toString(36),
		).join('').toUpperCase();

		// Select a random climate
		const climateTypes = Object.values(ClimateType);
		const climate = climateTypes[Math.floor(Math.random() * climateTypes.length)];

		// Generate resources based on climate
		const resources = this.generateResourcesForClimate(climate);

		// Determine threat level (0.0 to 1.0)
		const threatLevel = Math.random();

		// Determine if planet has a civilization
		const hasCivilization = Math.random() > 0.7;
		let civilization;
		const planetId = generateEntityId('planet');

		if (hasCivilization) {
			// Queue a civilization generation request
			this.queueRequest(AIRequestType.CIVILIZATION_GENERATION, {
				planetId,
				climate,
			});
		}

		// Create the planet
		const newPlanet: Planet = {
			id: planetId,
			name: planetName,
			address: gateAddress,
			climate: climate,
			resources,
			explorationStatus: ExplorationStatus.UNEXPLORED,
			bases: [],
			threatLevel,
			description: `A ${climate.toLowerCase()} planet discovered in the ${galaxyName} galaxy.`,
			position: {
				x: (Math.random() - 0.5) * 100,
				y: (Math.random() - 0.5) * 100,
				z: (Math.random() - 0.5) * 100,
			},
			hasStargate: true,
			civilization,
		};

		return newPlanet;
	}

	// Generate resources based on climate
	private generateResourcesForClimate(climate: ClimateType): any[] {
		const resources = [];

		// Add 3-5 resource types
		const resourceCount = 3 + Math.floor(Math.random() * 3);
		const resourceTypes = Object.values(ResourceType);

		// Climate-specific resource abundance
		const climateResources: Record<ClimateType, ResourceType[]> = {
			[ClimateType.DESERT]: [ResourceType.MINERAL, ResourceType.NAQUADAH],
			[ClimateType.FOREST]: [ResourceType.ORGANIC, ResourceType.ENERGY],
			[ClimateType.ICE]: [ResourceType.EXOTIC, ResourceType.MINERAL],
			[ClimateType.VOLCANIC]: [ResourceType.ENERGY, ResourceType.NAQUADAH],
			[ClimateType.TEMPERATE]: [ResourceType.ORGANIC, ResourceType.MINERAL],
			[ClimateType.OCEAN]: [ResourceType.ORGANIC, ResourceType.EXOTIC],
			[ClimateType.TOXIC]: [ResourceType.EXOTIC, ResourceType.NAQUADAH],
			[ClimateType.MOUNTAINOUS]: [ResourceType.MINERAL, ResourceType.ENERGY],
		};

		// Add climate-specific resources with higher abundance
		for (const resourceType of climateResources[climate]) {
			resources.push({
				type: resourceType,
				abundance: 0.6 + Math.random() * 0.4, // 0.6-1.0
				difficulty: Math.random() * 0.7, // 0.0-0.7
				discovered: false,
			});
		}

		// Add random resources until we reach resourceCount
		while (resources.length < resourceCount) {
			const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

			// Skip if this type already exists
			if (resources.some(r => r.type === randomType)) continue;

			resources.push({
				type: randomType,
				abundance: Math.random() * 0.6, // 0.0-0.6
				difficulty: 0.3 + Math.random() * 0.7, // 0.3-1.0
				discovered: false,
			});
		}

		return resources;
	}

	// Generate a new technology
	private async generateTechnology(parameters: Record<string, any>): Promise<Technology> {
		await this.delay(800);

		const { category } = parameters;
		const origin: TechnologyOrigin = parameters.origin || TechnologyOrigin.UNKNOWN;

		// Generate names based on origin
		const originPrefixes: Record<TechnologyOrigin, string[]> = {
			[TechnologyOrigin.EARTH]: ['Tau\'ri', 'Terran', 'Earth'],
			[TechnologyOrigin.GOAULD]: ['Goa\'uld', 'Jaffa', 'System Lord'],
			[TechnologyOrigin.ANCIENT]: ['Ancient', 'Alteran', 'Lantean'],
			[TechnologyOrigin.ASGARD]: ['Asgard', 'Thor\'s', 'Vanir'],
			[TechnologyOrigin.ORI]: ['Ori', 'Prior', 'Origin'],
			[TechnologyOrigin.WRAITH]: ['Wraith', 'Hive', 'Iratus'],
			[TechnologyOrigin.UNKNOWN]: ['Unknown', 'Mysterious', 'Alien'],
		};

		const techNames: Record<TechnologyCategory, string[]> = {
			[TechnologyCategory.WEAPON]: ['Blaster', 'Cannon', 'Disruptor', 'Emitter', 'Rifle'],
			[TechnologyCategory.DEFENSE]: ['Shield', 'Barrier', 'Deflector', 'Armor', 'Force Field'],
			[TechnologyCategory.MEDICAL]: ['Healer', 'Regenerator', 'Medical Pod', 'Scanner', 'Stasis'],
			[TechnologyCategory.POWER]: ['Generator', 'Reactor', 'Power Cell', 'Energy Core', 'Conduit'],
			[TechnologyCategory.PROPULSION]: ['Drive', 'Engine', 'Thruster', 'Hyperdrive', 'Jump System'],
			[TechnologyCategory.COMPUTING]: ['Computer', 'AI', 'Interface', 'Neural Link', 'Processor'],
			[TechnologyCategory.BIOLOGY]: ['Genetic Modifier', 'Symbiote', 'Bio-enhancer', 'Serum', 'Mutagen'],
		};

		// Select or randomize category
		const techCategory: TechnologyCategory = category || Object.values(TechnologyCategory)[
			Math.floor(Math.random() * Object.values(TechnologyCategory).length)
		];

		// Generate name
		const prefix = originPrefixes[origin][Math.floor(Math.random() * originPrefixes[origin].length)];
		const namePart = techNames[techCategory][Math.floor(Math.random() * techNames[techCategory].length)];
		const name = `${prefix} ${namePart}`;

		// Generate description
		const descriptions: Record<TechnologyCategory, string[]> = {
			[TechnologyCategory.WEAPON]: [
				'A powerful weapon that can destroy enemies with precision.',
				'Advanced offensive technology capable of penetrating most shields.',
				'Highly efficient weapon system with minimal power requirements.',
			],
			[TechnologyCategory.DEFENSE]: [
				'Defensive technology that creates an impenetrable barrier.',
				'Shield system that adapts to different types of attacks.',
				'Personal defense mechanism that can be deployed instantly.',
			],
			[TechnologyCategory.MEDICAL]: [
				'Advanced healing technology that accelerates natural recovery.',
				'Medical device capable of curing most diseases and injuries.',
				'Emergency medical system for field operations.',
			],
			[TechnologyCategory.POWER]: [
				'Highly efficient power generator with minimal resource consumption.',
				'Revolutionary energy system with unprecedented output.',
				'Clean energy source with stable long-term operation.',
			],
			[TechnologyCategory.PROPULSION]: [
				'Engine technology allowing faster-than-light travel.',
				'Advanced propulsion system for interstellar exploration.',
				'Efficient drive system for both atmospheric and space travel.',
			],
			[TechnologyCategory.COMPUTING]: [
				'Advanced computing system with intuitive interface.',
				'Artificial intelligence capable of complex problem-solving.',
				'Quantum computer with unparalleled processing capabilities.',
			],
			[TechnologyCategory.BIOLOGY]: [
				'Genetic modification technology with medical applications.',
				'Biological enhancement system for augmenting human capabilities.',
				'Synthetic biology platform for creating new organisms.',
			],
		};

		const description = descriptions[techCategory][
			Math.floor(Math.random() * descriptions[techCategory].length)
		];

		// Generate research requirement (higher for more advanced origins)
		const originComplexity: Record<TechnologyOrigin, number> = {
			[TechnologyOrigin.EARTH]: 1,
			[TechnologyOrigin.GOAULD]: 1.5,
			[TechnologyOrigin.ANCIENT]: 3,
			[TechnologyOrigin.ASGARD]: 2.5,
			[TechnologyOrigin.ORI]: 2.8,
			[TechnologyOrigin.WRAITH]: 2,
			[TechnologyOrigin.UNKNOWN]: 2,
		};

		const researchRequirement = Math.floor(
			100 + Math.random() * 400 * originComplexity[origin],
		);

		// Generate benefits
		const benefits = this.generateTechnologyBenefits(techCategory);

		return {
			id: generateEntityId('technology'),
			name,
			description,
			category: techCategory,
			origin,
			researchRequirement,
			researchProgress: 0,
			discovered: true,
			researched: false,
			benefits,
		};
	}

	private generateTechnologyBenefits(category: TechnologyCategory): any[] {
		const benefits = [];
		const primaryBenefitValue = 0.1 + Math.random() * 0.3; // 0.1-0.4

		// Define primary benefit based on category
		const categoryPrimaryBenefits: Record<TechnologyCategory, BenefitType> = {
			[TechnologyCategory.WEAPON]: BenefitType.COMBAT_STRENGTH,
			[TechnologyCategory.DEFENSE]: BenefitType.COMBAT_STRENGTH,
			[TechnologyCategory.MEDICAL]: BenefitType.PERSONNEL_CAPACITY,
			[TechnologyCategory.POWER]: BenefitType.RESOURCE_PRODUCTION,
			[TechnologyCategory.PROPULSION]: BenefitType.EXPLORATION_EFFICIENCY,
			[TechnologyCategory.COMPUTING]: BenefitType.RESEARCH_SPEED,
			[TechnologyCategory.BIOLOGY]: BenefitType.PERSONNEL_CAPACITY,
		};

		// Add primary benefit
		benefits.push({
			type: categoryPrimaryBenefits[category],
			value: primaryBenefitValue,
		});

		// 50% chance of secondary benefit
		if (Math.random() > 0.5) {
			const secondaryBenefitOptions = Object.values(BenefitType).filter(
				type => type !== categoryPrimaryBenefits[category],
			);

			const secondaryType = secondaryBenefitOptions[
				Math.floor(Math.random() * secondaryBenefitOptions.length)
			];

			benefits.push({
				type: secondaryType,
				value: primaryBenefitValue * 0.5, // Secondary benefit is weaker
			});
		}

		return benefits;
	}

	// Generate a mission
	private async generateMission(parameters: Record<string, any>): Promise<Mission> {
		await this.delay(700);

		const { planetId, forcedType } = parameters;

		// Mission types with respective descriptions
		const missionTypeDescriptions: Record<MissionType, string[]> = {
			[MissionType.EXPLORATION]: [
				'Explore an uncharted region of the planet.',
				'Map the terrain around the Stargate.',
				'Search for signs of ancient civilizations.',
				'Investigate unusual energy readings.',
			],
			[MissionType.COMBAT]: [
				'Eliminate a Goa\'uld patrol threatening the area.',
				'Secure a strategic location from enemy forces.',
				'Rescue personnel under attack by hostile forces.',
				'Destroy an enemy weapons cache.',
			],
			[MissionType.DIPLOMACY]: [
				'Establish contact with the indigenous population.',
				'Negotiate a treaty with the local civilization.',
				'Mediate a conflict between rival factions.',
				'Secure permission to establish a base.',
			],
			[MissionType.RESEARCH]: [
				'Study an unusual artifact discovered on the planet.',
				'Collect samples of exotic materials for analysis.',
				'Research the planet\'s unique atmospheric conditions.',
				'Document the planet\'s flora and fauna.',
			],
			[MissionType.RESCUE]: [
				'Locate and extract a missing reconnaissance team.',
				'Evacuate civilians from a natural disaster.',
				'Rescue hostages captured by enemy forces.',
				'Provide emergency medical assistance to a settlement.',
			],
		};

		// Select mission type (or use forced type)
		const missionType: MissionType = forcedType || Object.values(MissionType)[
			Math.floor(Math.random() * Object.values(MissionType).length)
		];

		// Generate mission description
		const descriptions = missionTypeDescriptions[missionType];
		const description = descriptions[Math.floor(Math.random() * descriptions.length)];

		// Generate skill requirements based on mission type
		const requirements: {[key in SkillType]?: number} = {};

		const primarySkills: Record<MissionType, SkillType[]> = {
			[MissionType.EXPLORATION]: [SkillType.SCIENCE, SkillType.LEADERSHIP],
			[MissionType.COMBAT]: [SkillType.COMBAT, SkillType.LEADERSHIP],
			[MissionType.DIPLOMACY]: [SkillType.DIPLOMACY, SkillType.LEADERSHIP],
			[MissionType.RESEARCH]: [SkillType.SCIENCE, SkillType.ENGINEERING],
			[MissionType.RESCUE]: [SkillType.MEDICINE, SkillType.COMBAT],
		};

		// Add primary skill requirements
		for (const skill of primarySkills[missionType]) {
			requirements[skill] = 3 + Math.floor(Math.random() * 5); // 3-7
		}

		// Add random secondary skill requirement
		const secondarySkills = Object.values(SkillType).filter(
			skill => !primarySkills[missionType].includes(skill),
		);

		if (secondarySkills.length > 0 && Math.random() > 0.3) {
			const secondarySkill = secondarySkills[Math.floor(Math.random() * secondarySkills.length)];
			requirements[secondarySkill] = 1 + Math.floor(Math.random() * 3); // 1-3
		}

		// Generate duration (in days)
		const duration = 1 + Math.floor(Math.random() * 5); // 1-5 days

		// Generate rewards
		const rewards = this.generateMissionRewards(missionType);

		return {
			id: generateEntityId('mission'),
			type: missionType,
			planetId,
			description,
			requirements,
			duration,
			progress: 0,
			complete: false,
			rewards,
		};
	}

	private generateMissionRewards(missionType: MissionType): any[] {
		const rewards = [];

		// Define reward probabilities by mission type
		const rewardProbabilities: Record<MissionType, Record<RewardType, number>> = {
			[MissionType.EXPLORATION]: {
				[RewardType.RESOURCE]: 0.8,
				[RewardType.TECHNOLOGY]: 0.4,
				[RewardType.ALLY]: 0.1,
				[RewardType.GATE_ADDRESS]: 0.6,
			},
			[MissionType.COMBAT]: {
				[RewardType.RESOURCE]: 0.9,
				[RewardType.TECHNOLOGY]: 0.5,
				[RewardType.ALLY]: 0.1,
				[RewardType.GATE_ADDRESS]: 0.2,
			},
			[MissionType.DIPLOMACY]: {
				[RewardType.RESOURCE]: 0.6,
				[RewardType.TECHNOLOGY]: 0.3,
				[RewardType.ALLY]: 0.7,
				[RewardType.GATE_ADDRESS]: 0.4,
			},
			[MissionType.RESEARCH]: {
				[RewardType.RESOURCE]: 0.5,
				[RewardType.TECHNOLOGY]: 0.8,
				[RewardType.ALLY]: 0.2,
				[RewardType.GATE_ADDRESS]: 0.3,
			},
			[MissionType.RESCUE]: {
				[RewardType.RESOURCE]: 0.4,
				[RewardType.TECHNOLOGY]: 0.2,
				[RewardType.ALLY]: 0.5,
				[RewardType.GATE_ADDRESS]: 0.3,
			},
		};

		// Check each reward type and add if probability check passes
		Object.entries(rewardProbabilities[missionType]).forEach(([rewardType, probability]) => {
			if (Math.random() < probability) {
				// Create reward based on type
				switch (rewardType) {
				case RewardType.RESOURCE:
					const resourceTypes = Object.values(ResourceType);
					const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
					const amount = 10 + Math.floor(Math.random() * 40); // 10-50

					rewards.push({
						type: RewardType.RESOURCE,
						resourceType,
						amount,
					});
					break;

				case RewardType.TECHNOLOGY:
					rewards.push({
						type: RewardType.TECHNOLOGY,
						technologyId: null, // To be filled in when a technology is generated
					});
					break;

				case RewardType.ALLY:
					rewards.push({
						type: RewardType.ALLY,
						allyId: null, // To be filled in when an ally is generated
					});
					break;

				case RewardType.GATE_ADDRESS:
					rewards.push({
						type: RewardType.GATE_ADDRESS,
					});
					break;
				}
			}
		});

		// Ensure at least one reward
		if (rewards.length === 0) {
			const resourceTypes = Object.values(ResourceType);
			const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
			const amount = 10 + Math.floor(Math.random() * 20); // 10-30

			rewards.push({
				type: RewardType.RESOURCE,
				resourceType,
				amount,
			});
		}

		return rewards;
	}

	// Generate a civilization
	private async generateCivilization(parameters: Record<string, any>): Promise<Civilization> {
		await this.delay(1200);

		const climate: ClimateType = parameters.climate as ClimateType;

		// Names based on climate types
		const namesByClimate: Record<ClimateType, string[]> = {
			[ClimateType.DESERT]: ['Abydonian', 'Setesh', 'Dune', 'Arrakeen'],
			[ClimateType.FOREST]: ['Nox', 'Sylvan', 'Trevenians', 'Eloran'],
			[ClimateType.ICE]: ['Frostborne', 'Glacians', 'Cryoni', 'Boreal'],
			[ClimateType.VOLCANIC]: ['Magmaran', 'Pyronians', 'Emberites', 'Flamekeep'],
			[ClimateType.TEMPERATE]: ['Tollan', 'Terigan', 'Pangari', 'Mederian'],
			[ClimateType.OCEAN]: ['Aquarians', 'Tidelords', 'Oceanic', 'Marinus'],
			[ClimateType.TOXIC]: ['Mutageni', 'Venomite', 'Toxians', 'Shalakite'],
			[ClimateType.MOUNTAINOUS]: ['Highpeaks', 'Petran', 'Stoneheart', 'Granitefolk'],
		};

		// Fallback names if climate doesn't match
		const fallbackNames = ['Unnamed', 'Mysterious', 'Unknown', 'Isolated'];

		// Select name
		const nameOptions = namesByClimate[climate] || fallbackNames;
		const name = nameOptions[Math.floor(Math.random() * nameOptions.length)];

		// Generate friendliness (-1.0 to 1.0)
		const friendliness = Math.random() * 2 - 1;

		// Generate technological level (0.0 to 1.0)
		const technologicalLevel = Math.random();

		// Generate description
		const getMoodDescription = (friendliness: number): string => {
			if (friendliness > 0.7) return 'extremely friendly and welcoming';
			if (friendliness > 0.3) return 'generally friendly';
			if (friendliness > -0.3) return 'cautious but neutral';
			if (friendliness > -0.7) return 'suspicious and unwelcoming';
			return 'hostile and aggressive';
		};

		const getTechDescription = (techLevel: number): string => {
			if (techLevel > 0.9) return 'highly advanced, possibly rivaling Ancient technology';
			if (techLevel > 0.7) return 'significantly advanced beyond Earth technology';
			if (techLevel > 0.5) return 'roughly equivalent to current Earth technology';
			if (techLevel > 0.3) return 'industrial level technology';
			if (techLevel > 0.1) return 'pre-industrial technology';
			return 'primitive technology';
		};

		const getClimateAdaptation = (climate: ClimateType): string => {
			switch (climate) {
			case ClimateType.DESERT:
				return 'They have adapted to conserve water and survive the harsh conditions.';
			case ClimateType.FOREST:
				return 'They live in harmony with the forest, building their structures among the trees.';
			case ClimateType.ICE:
				return 'They have developed insulated shelters and special clothing to survive the cold.';
			case ClimateType.VOLCANIC:
				return 'They harness geothermal energy and have heat-resistant shelters.';
			case ClimateType.TEMPERATE:
				return 'They have built extensive cities across the habitable regions.';
			case ClimateType.OCEAN:
				return 'They have developed underwater habitats and boats for transportation.';
			case ClimateType.TOXIC:
				return 'They wear protective suits when outside and live in sealed environments.';
			case ClimateType.MOUNTAINOUS:
				return 'They have carved their settlements into the mountainsides and developed expert climbing skills.';
			default:
				return 'They have adapted to their environment in unique ways.';
			}
		};

		const description = `The ${name} civilization is ${getMoodDescription(friendliness)} toward outsiders. They possess ${getTechDescription(technologicalLevel)}. ${getClimateAdaptation(climate)}`;

		return {
			name: `${name}`,
			friendliness,
			technologicalLevel,
			description,
		};
	}

	// Utility function to simulate async delay
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

export default AIGenerationService;
