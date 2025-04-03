export enum GamePhase {
	EXPLORATION = 'EXPLORATION',
	COMBAT = 'COMBAT',
	RESEARCH = 'RESEARCH',
	BUILDING = 'BUILDING',
	TRADING = 'TRADING'
}

export interface Planet {
	id: string;
	name: string;
	address: string;
	climate: ClimateType;
	resources: ResourceDeposit[];
	explorationStatus: ExplorationStatus;
	bases: Base[];
	threatLevel: number;
	civilization?: Civilization;
	description: string;
	position: {x: number, y: number, z: number}; // For visualization
	discoveryDate?: {day: number, year: number};
	hasStargate: boolean;
}

export enum ClimateType {
	DESERT = 'DESERT',
	FOREST = 'FOREST',
	ICE = 'ICE',
	VOLCANIC = 'VOLCANIC',
	TEMPERATE = 'TEMPERATE',
	OCEAN = 'OCEAN',
	TOXIC = 'TOXIC',
	MOUNTAINOUS = 'MOUNTAINOUS'
}

export interface ResourceDeposit {
	type: ResourceType;
	abundance: number; // 0.0-1.0
	difficulty: number; // 0.0-1.0
	discovered: boolean;
}

export enum ResourceType {
	MINERAL = 'MINERAL',
	ORGANIC = 'ORGANIC',
	ENERGY = 'ENERGY',
	EXOTIC = 'EXOTIC',
	NAQUADAH = 'NAQUADAH'
}

export enum ExplorationStatus {
	UNEXPLORED = 'UNEXPLORED',
	PARTIALLY_EXPLORED = 'PARTIALLY_EXPLORED',
	EXPLORED = 'EXPLORED',
	FULLY_DOCUMENTED = 'FULLY_DOCUMENTED'
}

export interface Base {
	id: string;
	name: string;
	type: BaseType;
	level: number;
	buildings: Building[];
	constructionProgress: number;
	constructionComplete: boolean;
	personnel: {[key in PersonnelType]: number};
}

export enum BaseType {
	MINING = 'MINING',
	RESEARCH = 'RESEARCH',
	MILITARY = 'MILITARY',
	DIPLOMATIC = 'DIPLOMATIC',
	MIXED = 'MIXED'
}

export interface Building {
	id: string;
	type: BuildingType;
	level: number;
	constructionProgress: number;
	constructionComplete: boolean;
	active: boolean;
}

export enum BuildingType {
	MINING_FACILITY = 'MINING_FACILITY',
	RESEARCH_LAB = 'RESEARCH_LAB',
	POWER_GENERATOR = 'POWER_GENERATOR',
	DEFENSE_SYSTEM = 'DEFENSE_SYSTEM',
	BARRACKS = 'BARRACKS',
	STARGATE_SHIELD = 'STARGATE_SHIELD'
}

export interface Technology {
	id: string;
	name: string;
	description: string;
	category: TechnologyCategory;
	origin: TechnologyOrigin;
	researchRequirement: number;
	researchProgress: number;
	discovered: boolean;
	researched: boolean;
	benefits: TechnologyBenefit[];
}

export enum TechnologyCategory {
	WEAPON = 'WEAPON',
	DEFENSE = 'DEFENSE',
	MEDICAL = 'MEDICAL',
	POWER = 'POWER',
	PROPULSION = 'PROPULSION',
	COMPUTING = 'COMPUTING',
	BIOLOGY = 'BIOLOGY'
}

export enum TechnologyOrigin {
	EARTH = 'EARTH',
	GOAULD = 'GOAULD',
	ANCIENT = 'ANCIENT',
	ASGARD = 'ASGARD',
	ORI = 'ORI',
	WRAITH = 'WRAITH',
	UNKNOWN = 'UNKNOWN'
}

export interface TechnologyBenefit {
	type: BenefitType;
	value: number;
}

export enum BenefitType {
	RESOURCE_PRODUCTION = 'RESOURCE_PRODUCTION',
	COMBAT_STRENGTH = 'COMBAT_STRENGTH',
	EXPLORATION_EFFICIENCY = 'EXPLORATION_EFFICIENCY',
	RESEARCH_SPEED = 'RESEARCH_SPEED',
	CONSTRUCTION_SPEED = 'CONSTRUCTION_SPEED',
	PERSONNEL_CAPACITY = 'PERSONNEL_CAPACITY'
}

export interface Team {
	id: string;
	name: string;
	members: TeamMember[];
	assignedMissionId?: string;
	status: TeamStatus;
	returnTime?: {day: number, year: number};
}

export interface TeamMember {
	id: string;
	name: string;
	skills: {[key in SkillType]: number};
	specialization: PersonnelType;
}

export enum TeamStatus {
	AVAILABLE = 'AVAILABLE',
	ON_MISSION = 'ON_MISSION',
	RETURNING = 'RETURNING',
	INJURED = 'INJURED'
}

export enum SkillType {
	COMBAT = 'COMBAT',
	SCIENCE = 'SCIENCE',
	ENGINEERING = 'ENGINEERING',
	DIPLOMACY = 'DIPLOMACY',
	LEADERSHIP = 'LEADERSHIP',
	MEDICINE = 'MEDICINE'
}

export enum PersonnelType {
	SCIENTIST = 'SCIENTIST',
	MILITARY = 'MILITARY',
	ENGINEER = 'ENGINEER',
	DIPLOMAT = 'DIPLOMAT'
}

export interface Mission {
	id: string;
	type: MissionType;
	planetId: string;
	description: string;
	requirements: {[key in SkillType]?: number};
	duration: number; // Days
	assignedTeamId?: string;
	progress: number;
	complete: boolean;
	rewards: MissionReward[];
}

export enum MissionType {
	EXPLORATION = 'EXPLORATION',
	COMBAT = 'COMBAT',
	DIPLOMACY = 'DIPLOMACY',
	RESEARCH = 'RESEARCH',
	RESCUE = 'RESCUE'
}

export interface MissionReward {
	type: RewardType;
	resourceType?: ResourceType;
	technologyId?: string;
	allyId?: string;
	amount?: number;
}

export enum RewardType {
	RESOURCE = 'RESOURCE',
	TECHNOLOGY = 'TECHNOLOGY',
	ALLY = 'ALLY',
	GATE_ADDRESS = 'GATE_ADDRESS'
}

export interface TradeRoute {
	id: string;
	sourcePlanetId: string;
	destinationPlanetId: string;
	resources: {[key in ResourceType]?: number};
	efficiency: number;
	active: boolean;
	underAttack: boolean;
}

export interface Civilization {
	name: string;
	friendliness: number; // -1.0 to 1.0
	technologicalLevel: number; // 0.0 to 1.0
	description: string;
}

export interface Ally {
	id: string;
	name: string;
	relationshipLevel: number; // 0.0 to 1.0
	benefits: AllyBenefit[];
}

export interface AllyBenefit {
	type: AllyBenefitType;
	value: number;
}

export enum AllyBenefitType {
	TECHNOLOGY_SHARING = 'TECHNOLOGY_SHARING',
	RESOURCE_SHARING = 'RESOURCE_SHARING',
	MILITARY_SUPPORT = 'MILITARY_SUPPORT',
	INTELLIGENCE = 'INTELLIGENCE'
}

export interface GameNotification {
	id: string;
	title: string;
	message: string;
	type: NotificationType;
	read: boolean;
	timestamp: {day: number, year: number};
}

export enum NotificationType {
	INFO = 'INFO',
	WARNING = 'WARNING',
	DANGER = 'DANGER',
	SUCCESS = 'SUCCESS'
}

export interface AIGenerationRequest {
	type: AIRequestType;
	parameters: Record<string, any>;
	status: AIRequestStatus;
	result?: any;
}

export enum AIRequestType {
	PLANET_GENERATION = 'PLANET_GENERATION',
	TECHNOLOGY_GENERATION = 'TECHNOLOGY_GENERATION',
	MISSION_GENERATION = 'MISSION_GENERATION',
	CIVILIZATION_GENERATION = 'CIVILIZATION_GENERATION'
}

export enum AIRequestStatus {
	PENDING = 'PENDING',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED'
}

export interface GameSettings {
	difficultyLevel: DifficultyLevel;
	autoSave: boolean;
	autoSaveInterval: number;
	notificationLevel: NotificationLevel;
}

export enum DifficultyLevel {
	EASY = 'EASY',
	NORMAL = 'NORMAL',
	HARD = 'HARD',
	IMPOSSIBLE = 'IMPOSSIBLE'
}

export enum NotificationLevel {
	ALL = 'ALL',
	IMPORTANT = 'IMPORTANT',
	CRITICAL = 'CRITICAL'
}

export interface GameState {
	currentPhase: GamePhase;
	gameTime: { day: number; year: number; };
	player: {
		planets: Record<string, Planet>;
		currentPlanetId: string;
		homeBasePlanetId: string;
		discoveredTechnologies: Technology[];
		resources: Record<string, number>;
		personnel: Record<string, number>;
		stargateProgram: {
			level: number;
			maxTeams: number;
			teams: Team[];
			expeditionLimit: number;
			baseLimit: number;
		};
		discoveredGateAddresses: string[];
		missions: Mission[];
		tradeRoutes: TradeRoute[];
		notifications: GameNotification[];
	};
	enemies: {
		goauldPresence: number;
		goauldWorlds: string[];
		oriPresence: number;
		oriWorlds: string[];
		wraithPresence: number;
		wraithWorlds: string[];
	};
	allies: Ally[];
	knownGalaxies: string[];
	aiGenerationQueue: AIGenerationRequest[];
	gameSettings: GameSettings;
}
