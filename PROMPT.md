# Comprehensive Prompt for Stargate Game Development
Create a complete React Native & Three.js mobile game called "Stargate Evolution: Exploration &
Discovery" with the following specifications:

## Game Concept
Build a base-building, exploration, and combat game where players start on Earth with access to the Stargate network. Players explore procedurally generated planets, establish bases and mining operations, combat alien threats (primarily Goa'uld initially), research discovered technologies, create trade routes, and build a network of bases. The game features an ever-evolving universe with emergent gameplay and no fixed ending.

## Technical Stack
* React Native for mobile interface
* TypeScript for type safety
* Three.js for 3D visualization
* Expo for development tools
* Use functional programming patterns and immutable state updates

## Current Project Structure
The project currently follows this structure:

```
stargate-evolution/
├── src/
│   ├── components/         # React Native UI components
│   ├── systems/            # Game systems and logic
│   │   ├── game-state-manager.ts
│   │   ├── ai-generation-service.ts
│   │   ├── planet-exploration-system.ts
│   │   ├── base-building-system.ts
│   │   ├── mission-system.ts
│   │   ├── enemy-faction-system.ts
│   │   ├── trade-system.ts
│   │   ├── game-loop.ts
│   │   └── index.ts
│   ├── types/              # TypeScript type definitions
│   │   └── game-types.ts   # Contains all game type definitions
│   ├── screens/            # App screens (currently only trade-screen.tsx)
│   ├── utils/              # Utility functions
│   ├── assets/             # Game assets
│   └── rendering/          # Three.js visualization (empty)
├── app.tsx                 # Entry point
├── index.ts                # Expo entry point
└── package.json
```

## Core Game State Structure
Implement a central game state with this structure:
```typescript
interface GameState {
  currentPhase: GamePhase; // EXPLORATION initially
  gameTime: { day: number; year: number; }; // Start at 1997
  player: {
    planets: Record<string, Planet>; // Earth as starting planet
    currentPlanetId: string;
    homeBasePlanetId: string;
    discoveredTechnologies: Technology[];
    resources: Record<string, number>; // mineral, organic, energy, exotic, naquadah
    personnel: Record<string, number>; // scientists, military, engineers, diplomats
    stargateProgram: {
      level: number;
      maxTeams: number;
      teams: Team[]; // SG-1 as default starting team
      expeditionLimit: number;
      baseLimit: number;
    };
    discoveredGateAddresses: string[];
    missions: Mission[];
    tradeRoutes: TradeRoute[];
    notifications: GameNotification[];
  };
  enemies: {
    goauldPresence: number; // 0.0-1.0, start at 1.0
    goauldWorlds: string[];
    oriPresence: number; // 0.0-1.0, start at 0
    oriWorlds: string[];
    wraithPresence: number; // 0.0-1.0, start at 0
    wraithWorlds: string[];
  };
  allies: Ally[];
  knownGalaxies: string[]; // "Milky Way" to start
  aiGenerationQueue: AIGenerationRequest[];
  gameSettings: GameSettings;
}
```

## Key System Implementations
1. GameStateManager
	* Implement central state store with subscription model
	* Use immutable state updates
	* Store/load game state functionality

2. AI Generation Service
	* Queue-based asynchronous generation system
	* Generate planets with unique characteristics:
		* Climate types: desert, forest, ice, volcanic, etc.
		* Resources with abundance and difficulty values
		* Terrain features and visualization data
		* Potential alien threats or civilizations
* Generate technologies:
    * Categorized by type: weapon, defense, medical, power, etc.
    * Variable research requirements
    * Faction-based origin (Goa'uld, Ancient, etc.)
    * Progressive benefit scaling

3. Planet Exploration System
	* Team-based exploration mechanics
	* Focus areas: resources, technology, threats, general
	* Discovery of resources, gate addresses, technologies, threats
	* Planet travel via Stargate network
	* Exploration status tracking (unexplored to fully-explored)

4. Base Building System
	* Base types: mining, research, military, diplomatic
	* Building construction with resources and time requirements
	* Building types: mining_facility, research_lab, power_generator, defense_system, barracks, stargate_shield
	* Resource production from bases and buildings
	* Construction progress tracking and completion events

5. Mission System
	* Dynamic mission generation
	* Types: exploration, combat, diplomacy, research, rescue
	* Team assignment and completion calculation
	* Success probability based on team skills versus mission requirements
	* Reward distribution (resources, technology, allies)

6. Enemy Faction System
	* Faction behaviors for Goa'uld (primary enemy)
	* Planet attacks and occupation mechanics
	* Threat scaling and reinforcement
	* Combat resolution against player teams
	* Later expansion to Ori and Wraith factions

7. Trade System
	* Create trade routes between controlled planets
	* Resource transfer on intervals
	* Route efficiency and attack vulnerability
	* Repair and management options

8. Mining Operations System
	* Resource extraction from planets
	* Operation efficiency and scaling
	* Resource yield calculation based on abundance and difficulty
	* Regular production interval processing

## UI Implementation
### Main Screens
* Starmap: Displays known planets with stargates
* Planet View: Details, resources, and exploration options
* Base Management: Construction and building management
* Team Management: Personnel assignment and skills
* Research: Technology discovery and development
* Mission: Assignment and tracking

### UI Components
* Resource display bar
* Navigation system between screens
* Modal dialogs for actions (base building, exploration, etc.)
* Team and personnel management interfaces
* 3D visualization using Three.js for planets and bases

## Three.js Rendering
  * Implement ThreeJSRenderer component that:
    * Renders planets with appropriate climate visualization
    * Shows bases and structures on planets
    * Provides interactive elements for selection
    * Handles camera controls and positioning

## Starting Configuration
* Earth as starting planet with operational Stargate
* Initial resources: mineral (100), organic (50), energy (75), exotic (10), naquadah (5)
* SG-1 as starting team with Jack O'Neill and Samantha Carter
* Initial personnel: scientists (5), military (10), engineers (5), diplomats (2)
* Starting year: 1997
* First mission to Abydos with Goa'uld presence

## Game Loop and Time Progression
* Implement interval-based processing for:
    * Resource production (10 seconds)
    * Trade route transfers (30 seconds)
    * Mining operations (45 seconds)
    * Enemy activities (60 seconds)
    * Game time advancement (60 seconds = 1 game day)
Special Features
* Procedurally generated gate addresses
* Dynamic threat generation from enemy factions
* Resource network management across planets
* Technology research progression and benefits
* Team skill advancement through missions
* Notification system for important events

## Goals
Create a complete, playable implementation of this game with thoughtful UI design,
engaging gameplay mechanics, and clear documentation. Use tabs for indentation in all code files.
