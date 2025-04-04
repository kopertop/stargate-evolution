# Comprehensive Prompt for Stargate Game Development
Create a complete web-based game called "Stargate Evolution: Exploration & Discovery" using React Three Fiber with the following specifications:

## Game Concept
Build a top-down, turn-based base-building, exploration, and combat game where players start on Earth with access to the Stargate network. Players explore procedurally generated planets, establish bases and mining operations, combat alien threats (primarily Goa'uld initially), research discovered technologies, create trade routes, and build a network of bases. The game features an ever-evolving universe with emergent gameplay and no fixed ending. Gameplay follows a hybrid model: free-form movement and actions outside of combat, transitioning to a strict turn-based system during combat encounters or after specific significant actions (like initiating planetary scans or major construction).

## Technical Stack
* React Three Fiber for 3D visualization
* React for UI components and state management
* TypeScript for type safety
* Web-based platform with support for controllers, keyboard, and mouse
* Use functional programming patterns and immutable state updates

## Current Project Structure
The project currently follows this structure:

```
stargate-evolution/
├── src/
│   ├── components/         # UI components
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
│   ├── screens/            # App screens
│   ├── utils/              # Utility functions
│   ├── assets/             # Game assets
│   └── rendering/          # React Three Fiber visualization
├── app.tsx                 # Entry point
├── index.ts                # Web entry point
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
* Starmap: Displays known planets with stargates (top-down galactic view)
* Planet View: Top-down view of the current area, details, resources, and exploration options
* Base Management: Top-down view of the base layout, construction, and building management
* Team Management: Personnel assignment and skills
* Research: Technology discovery and development
* Mission: Assignment and tracking

### UI Components
* Resource display bar
* Navigation system between screens
* Modal dialogs for actions (base building, exploration, etc.)
* Team and personnel management interfaces
* 3D visualization using React Three Fiber for planets and bases

## React Three Fiber Rendering
  * Implement R3FRenderer component using `<Canvas>` that:
    * Sets up the main Three.js scene, camera, and render loop.
    * Renders planets and environments from a top-down perspective suitable for a tabletop style using R3F components (`<mesh>`, `<ambientLight>`, etc.).
    * Shows bases and structures on planets in a clear, top-down layout.
    * Provides interactive elements for selection using R3F event handlers (`onClick`, `onPointerOver`, etc.).
    * Handles camera controls (e.g., using `@react-three/drei`'s camera controls) for panning and zooming within the top-down view.

## Starting Configuration
* Earth as starting planet with operational Stargate
* Initial resources: mineral (100), organic (50), energy (75), exotic (10), naquadah (5)
* SG-1 as starting team with Jack O'Neill and Samantha Carter
* Initial personnel: scientists (5), military (10), engineers (5), diplomats (2)
* Starting year: 1997
* First mission to Abydos with Goa'uld presence

## Game Loop and Time Progression
* Implement a turn-based game loop:
    * **Out-of-Combat/Exploration Phase:**
        * Player takes actions (move team, interact, start building, etc.).
        * After each significant player action or a set amount of 'free-form' time, the "Environment/AI" takes a turn.
        * Environment turn processes: resource generation, building progress, trade route updates, NPC movements, potential event triggers.
        * Game time (day/year) advances incrementally based on actions or environment turns.
    * **Combat Phase:**
        * Initiated when player encounters threats or triggers combat.
        * Strict turn order (e.g., Initiative-based: Player Team -> Enemy Faction -> Environment Effects).
        * Each unit (player personnel, enemy units) takes actions based on Action Points or similar turn-based mechanics.
        * Game time might pause or advance differently during combat turns.
* Interval-based processing (integrated into Environment/AI turns):
    * Resource production
    * Trade route transfers
    * Mining operations
    * Enemy faction strategic movements/decisions
    * Mission progress checks

## AI Development Guidance
* **Turn-Based Logic:** All systems (AI, exploration, combat, resource generation) must operate within the turn-based structure. Avoid real-time loops (`useFrame` should be used carefully, primarily for visual effects, not core logic timing).
* **Environment Turn:** The 'Environment/AI Turn' needs robust logic to handle background processes, time progression, and non-player character actions efficiently.
* **Top-Down View:** Ensure all visual elements and interactions are designed for and tested with a top-down camera perspective (likely an OrthographicCamera).
* **Input Handling:** Use React state and event handlers for UI interactions. Map keyboard/controller inputs to actions within the React components or a dedicated input management system.

## Goals
Create a complete, playable implementation of this game with thoughtful UI design tailored for a top-down view, engaging turn-based gameplay mechanics, and clear documentation. Use tabs for indentation in all code files.
