# Roadmap: SGU-Inspired TypeScript Web Game (PixiJS & Cloudflare Workers)

## Project Overview

This project is a browser-based game inspired by *Stargate Universe (SGU)*, blending dark sci-fi survival with occasional humor and high-stakes decision-making. The player commands the Ancient starship **Destiny**, navigating procedurally generated galaxies via Stargates, managing a crew in dire circumstances, and interacting with Destiny’s AI as a persistent companion. Key features include a **PixiJS**-powered 2D front-end for high-performance graphics (chosen because “PixiJS’ strength is speed” for 2D rendering), and a **Cloudflare Workers** back-end to handle game state, heavy computations, and OpenAI API calls. The game will be structured as a **TypeScript mono-repo**, combining front-end and back-end for shared code and a streamlined development workflow.

**Primary Objectives:**

* **Exploration & Survival Gameplay:** Guide the Destiny through seeded procedural galaxies. Use Stargates to explore planets, gather resources, and confront challenges. The environment and encounters adapt based on player decisions, ensuring each playthrough is unique.
* **Ship and Crew Management:** Upgrade Destiny’s systems (life support, shields, FTL, etc.), make repairs, and allocate resources. Manage crew morale and health under survival conditions; decisions (e.g. who to send on away missions) can have lasting consequences.
* **Persistent AI Companion:** The ship’s AI is a character in itself – with **persistent memory** of player actions, capable of dynamic world-building, mission scripting, and technology generation via the OpenAI API. The AI provides narrative feedback, hints, and can evolve based on the player's choices.
* **Dark Sci-Fi Narrative:** Emulate SGU’s gritty tone – desperate survival, moral dilemmas, and mysterious discoveries – while injecting moments of levity through crew interactions and the AI’s personality. Player choices influence story outcomes and the game’s world state.

## Tools and Setup

To bootstrap the project, we will use a modern TypeScript-centric stack with tools for both front-end game development and back-end serverless functions:

* **Node.js (LTS)** and **Package Manager** – Install Node.js 18+ for modern ES module support. Use **Yarn** (or `pnpm`) workspaces to manage the mono-repo and shared dependencies, ensuring front-end and back-end stay in sync in one repository.
* **TypeScript** – Common language for both client and server. Configure a strict TypeScript setup for reliability. This allows sharing of types (e.g. game state interfaces) between front-end and back-end packages.
* **PixiJS** – 2D rendering engine for the browser. Chosen for its **fast WebGL rendering** and focus on 2D games (PixiJS is “the fastest there is” for 2D rendering). Include via npm (`pixi.js` package).
* **Bundler/Dev Server** – Use **Vite** (or a similar bundler) for the front-end. Vite provides quick startup and HMR for development. Initialize the front-end with a template (e.g. `npm create vite@latest` with a vanilla TS setup) and integrate PixiJS.
* **Cloudflare Workers & Wrangler** – Use Cloudflare Workers for the server-side. Install Cloudflare’s CLI **Wrangler** (`npm install -g wrangler`) to scaffold and deploy Workers. Workers will run our TypeScript code at the edge. We’ll use Cloudflare **KV storage** or **Durable Objects** for persistent game state on the backend (Workers are by nature stateless, requiring external storage for persistence). Durable Objects can manage stateful coordination (e.g. one per game session), while KV is useful for simple key-value persistence of save games, world data, or AI memory logs.
* **OpenAI API** – The backend will call OpenAI’s APIs (e.g. ChatGPT models) to power the Destiny AI’s dialogue and content generation. Store the API key as a secure secret in Worker environment. The heavy lifting of AI computations and any large language model calls are done server-side for security and performance.
* **Development Utilities** – Set up linters (ESLint) and formatters (Prettier) across the mono-repo for code quality. Use Git hooks or CI to enforce standards. Include a testing framework (Jest or Vitest) for critical game logic (procedural generation, AI decision functions, etc.).

**Bootstrapping Commands:**

1. **Initialize Monorepo:** Create the project directory and run `npm init -y` (or `pnpm init -y`). In the root `package.json`, add a workspaces field:

   ```js
   {
     "name": "sgu-game",
     "private": true,
     "workspaces": ["packages/*"]
   }
   ```

   This enables Yarn to manage packages for front-end and back-end in one repo.
2. **Scaffold Front-end:** Use Vite to create a TypeScript + vanilla project for PixiJS:

   ```bash
   npx degit vitejs/vite#template-vanilla-ts packages/frontend
   ```

   This creates a `packages/frontend` with a basic TS setup. Install PixiJS:

   ```bash
   cd packages/frontend
   pnpm add pixi.js
   ```

   Create an entry file (e.g. `src/main.ts`) and import PixiJS to verify everything works (render a simple Pixi Application to `document.body`). Run the dev server with `pnpm dev` (which runs Vite).
3. **Scaffold Back-end (Cloudflare Worker):** In the root, use Wrangler to init a Worker project:

   ```bash
   npx wrangler init packages/backend --typescript
   ```

   This will create `packages/backend` with a template Cloudflare Worker (in TypeScript) and a `wrangler.toml` config. Inside `packages/backend`, run `pnpm add @cloudflare/workers-types @types/node -D` to add Workers type definitions. Adjust the `wrangler.toml` to set a name (e.g. "destiny-backend"), and add any KV/Durable Object bindings as needed.
4. **Configure Build Scripts:** In the root package.json, add scripts to build both packages. For example:

   ```json
   "scripts": {
     "build:frontend": "cd packages/frontend && pnpm build",
     "dev:frontend": "cd packages/frontend && pnpm dev",
     "dev:backend": "cd packages/backend && pnpm run wrangler dev"
   }
   ```

   This allows running the front-end dev server and Cloudflare Worker dev server concurrently. During development, you might run `pnpm dev:frontend` (which opens the game in a local browser) and in another terminal `pnpm dev:backend` (which runs the Worker on a localhost or tunnel for API calls).
5. **Verify Integration:** Ensure the front-end can reach the back-end. For example, in development Wrangler might default to `127.0.0.1:8787` for the Worker. Update front-end config to use this URL for API requests (e.g. base URL for game API). Test a simple API call: have the Worker respond to a GET request at `/hello` with “Hello from Destiny”, and from the front-end use `fetch('http://127.0.0.1:8787/hello')` to confirm connectivity.

With the project scaffolded, we have a mono-repo containing two main packages (frontend game and backend worker). The unified repo allows sharing TypeScript code, such as data models or utility functions, between client and server (for example, define a `GameState` interface in `packages/common` and use it in both). This approach avoids context switching and keeps all code in one place.

## Baseline Monorepo Structure

Once bootstrapped, the repository structure will look like this (simplified):

```plaintext
sgu-game/
├── package.json            # Root package with workspaces, scripts, dev deps
├── tsconfig.json           # Root TS config (base config for shared settings)
├── packages/
│   ├── frontend/
│   │   ├── package.json    # Front-end specific deps (PixiJS, Vite)
│   │   ├── vite.config.ts  # Vite configuration for bundling
│   │   ├── index.html      # Game canvas container, includes output bundle
│   │   └── src/
│   │       ├── main.ts     # Entry point that initializes PixiJS Application
│   │       ├── Game.ts     # Core game class (game loop, update logic)
│   │       ├── DestinyUI.ts# Module for UI elements (menus, HUD, dialogs)
│   │       ├── systems/    # Modules for ship systems (navigation, life support, etc.)
│   │       └── ... (other game-specific code)
│   └── backend/
│       ├── package.json    # Back-end specific deps (Workers, OpenAI SDK if any)
│       ├── wrangler.toml   # Cloudflare Worker configuration (name, env, bindings)
│       └── src/
│           ├── index.ts    # Worker entry (fetch event handler)
│           ├── api/
│           │    ├── state.ts      # Module to handle game state load/save
│           │    ├── ai.ts         # Module to handle AI (OpenAI API calls, memory)
│           │    └── procedural.ts # Module for procedural generation logic
│           └── lib/               # Any shared library code (e.g. RNG, utilities)
└── packages/common/ (optional)
    ├── package.json (could be just a folder without its own package.json too)
    └── types.d.ts      # Shared TypeScript type definitions (GameState, ShipStatus, etc.)
```

* The **frontend** contains all game rendering and interaction logic. We’ll keep it organized by features: e.g., a `systems/` directory for ship systems and a separate module for managing the **game loop** (handling PixiJS `update()` and player input).
* The **backend** is an API-like Worker. The `index.ts` listens for requests (e.g., using `fetch(request, env)` handler). We define routes or patterns: for example, `POST /api/save` to save game state, `GET /api/state` to load state, `POST /api/ai` to send a message to the AI, etc. The code is split into modules:

  * `state.ts` for reading/writing game state to KV or Durable Object,
  * `ai.ts` for interacting with OpenAI (managing prompts, memory, and API calls),
  * `procedural.ts` for generating world content (galaxies, planets, events) in a reproducible way.
* **Common** (optional): If many structures are shared (like `GameState` definitions, or a random number generator utility), a common folder or package can hold those. This could also be where we keep constants (like seed values, game balance parameters) used by both front and back.

The mono-repo approach makes it easy to share code and types between front-end and back-end, ensuring consistency (for example, the shape of a `CrewMember` object or `ShipSystemsStatus` can be defined once). This unified codebase aligns with the trend of full-stack TypeScript projects where frontend and backend reside together for a seamless developer experience.

## Implementation Plan and Task Breakdown

Below is a breakdown of implementation tasks as “tickets” an AI developer agent (or team) could tackle. These tasks are grouped by functionality and roughly in a logical development sequence. Each ticket is described with the work involved and acceptance criteria.

1. **Setup Monorepo & Development Environment**
   *Task:* Initialize the repository structure and tools as described above. Set up Yarn workspaces, front-end Vite app, and Cloudflare Worker template. Configure TypeScript project references if needed (so that e.g. `frontend` can import types from `common`). Ensure dev and build scripts work for both sub-projects.
   *Details:*

   * Initialize git repository, add basic README documenting how to run the game.
   * Install baseline dependencies (PixiJS, Wrangler, etc.).
   * Verify that `pnpm dev:frontend` serves a blank PixiJS canvas page at `http://localhost:3000` (default Vite port), and `pnpm dev:backend` starts a Worker at `http://127.0.0.1:8787`.
   * Acceptance: The front-end can call a trivial backend API and display the result (e.g., a text or console log) to prove connectivity.

2. **Core Game Loop & Rendering (PixiJS)**
   *Task:* Implement the fundamental game loop on the front-end using PixiJS. This includes initializing the Pixi Application, managing the canvas, and creating a basic update/render cycle.
   *Details:*

   * Create a Pixi `Application` in `main.ts` with an appropriate screen resolution (e.g., 800x600 to start, or full-screen canvas). Append the view to the DOM.
   * Implement a `Game` class with an `update(delta)` method. Hook this into Pixi’s ticker or use `app.ticker.add(game.update)`.
   * Within the `Game` class, manage high-level state (e.g., which “scene” or mode the game is in: splash, exploration, dialog, etc.). For now, stub out a simple state (e.g., start with an "Exploration" mode).
   * Render a placeholder graphic: for example, a simple rectangle or sprite representing the Destiny ship in the center of the screen. This confirms PixiJS rendering works.
   * Acceptance: On loading the game page, the Pixi canvas appears and a basic object (ship placeholder) is visible. The game loop runs (you can log or animate something small to verify delta timing).

3. **Ship Controls & Camera**
   *Task:* Allow the player to control the Destiny ship on screen and implement a simple camera or viewport.
   *Details:*

   * Add user input handling (e.g., listen for keyboard events or on-screen UI buttons). For example, WASD or arrow keys to apply thrust to the ship or move it. Since the game is 2D top-down, movement might be constrained or perhaps the ship always remains centered and the background moves (depending on design).
   * Implement a starfield background or a simple scrolling background to give illusion of movement. This could be a tiled sprite or generated star background.
   * The camera could simply follow the ship sprite if the world is larger than the view. Use PixiJS `Container` such that moving the container’s position simulates camera movement.
   * Acceptance: The player can press keys and see the ship move (or the background move relative to the ship). The movement should be smooth and tied to the game loop delta for frame-independence.

4. **Galaxy Procedural Generation Module**
   *Task:* Create the logic to generate a procedural galaxy or star system layout. This will run on the **backend** to ensure consistency and to offload heavy computations.
   *Details:*

   * Decide on the structure: e.g., the “world” could be divided into sectors or star systems connected by Stargates. A simple approach is to generate a graph: each node is a star system with certain planets, and edges represent known Stargate routes.
   * Use a **seeded random generator** (to allow reproducibility). The seed could be derived from game or user ID, or a random seed stored in the save. Given the seed, the generation algorithm should always produce the same initial galaxy structure.
   * The generation should incorporate dynamic elements based on player state. For example, while the base layout is seeded, certain details (like types of encounters or resources) can be influenced by how the player has progressed. (E.g., if the player has been aggressive, perhaps more hostile encounters spawn). This adaptivity can be guided by AI or simple rules. *In future, AI could be used to generate quest details dynamically per system.*
   * Implement `procedural.ts` in the Worker to generate: a list of star systems (with coordinates or just IDs), each with properties (planet types, resource availability, a short description). Possibly generate a few “encounters” or events in each system (e.g., a derelict ship, an alien outpost, etc.).
   * **OpenAI integration (optional):** As a later enhancement, you might send prompts to OpenAI to *flavor* the procedural output. For example, after generating raw data (like “Planet X is desert, has alien ruins”), call GPT to produce a short description or name for Planet X. This can enrich the world with thematic text. (This would be done in the `ai.ts` module, triggered during generation.)
   * Acceptance: When hitting an endpoint like `GET /api/generateGalaxy?seed=123`, the backend returns a JSON structure describing the galaxy (list of systems with details). Two runs with the same seed should return identical structure. Changing the seed yields a different layout.

5. **Game State Management (Backend)**
   *Task:* Implement persistent game state storage on the backend. This includes saving/loading the player’s progress (ship status, crew info, current location in galaxy, etc.) to Cloudflare KV or Durable Objects.
   *Details:*

   * Define a `GameState` TypeScript interface representing all necessary state (position in galaxy, visited systems, resource inventories, crew status, mission progress, AI memory, etc.). Share this type with the front-end via the common package.
   * In the Worker (`state.ts`), write functions `saveState(playerId, state)` and `loadState(playerId)` that interact with storage. Cloudflare KV can store small JSON strings keyed by player ID or session ID. (For multi-session persistence, use a stable ID; for simplicity assume single player for now.)
   * Ensure the Worker can parse JSON request bodies. Implement an API route `POST /api/state` to accept a game state save (the front-end will call this maybe on major events or periodically). Implement `GET /api/state` to retrieve the saved state (for loading on page refresh or continuing a session).
   * Because Workers are stateless per request, ensure any in-memory caching is minimal or use Durable Objects if real-time coordination is needed. For now, KV is eventual consistent but sufficient for a mostly single-player experience (if multiplayer or real-time, Durable Object would ensure immediate consistency).
   * Acceptance: The player’s game state can be saved and loaded. For instance, if the player refreshes the page (and the front-end calls load), their last known position, ship status, etc., are restored correctly from the back-end store.

6. **Backend API: Ship Actions & Systems**
   *Task:* Expand the back-end API to handle specific game actions that require server logic or heavy compute. For example: engaging FTL travel to a new galaxy, resolving a Stargate dial-out to a planet (which might trigger procedural generation or AI narrative), or upgrading a system which might involve some randomness or validation.
   *Details:*

   * Implement routes like `POST /api/ftlJump` (to initiate jump to next galaxy or sector). This could update the game state (e.g., increment a “galaxy counter” and trigger generating the next galaxy chunk using the procedural module).
   * Implement `POST /api/dialGate` with a target planet/system. The Worker can decide outcome: maybe a simple success or failure, or check if an encounter is present. If the Stargate leads to an unexplored planet, the backend might call the AI module to generate a quick scenario (“Planet has poisonous atmosphere, requires suits. There is an abandoned facility...”). It could return details to the front-end, which then presents them to the player.
   * Implement `POST /api/upgradeSystem` for ship upgrades. The back-end can verify resource availability and apply the upgrade to the stored state. Possibly also call OpenAI to generate a short tech description or name for the upgrade (e.g. “ZPM-based power core” generated by AI if appropriate).
   * Each of these endpoints updates game state and returns the relevant result to the front-end (for the UI to update). Keep the heavy logic here (like random chance of gate malfunction, or computing new resource values after upgrade).
   * Acceptance: The game can invoke these backend APIs and get appropriate responses. For instance, calling `ftlJump` returns data for the new location (maybe the new galaxy index and a description). The logic properly updates the saved state on backend.

7. **Integrate Frontend with Backend**
   *Task:* Connect the front-end game logic with the backend API routes to create a seamless gameplay loop.
   *Details:*

   * Use the Fetch API (or a library) on the front-end to call backend endpoints. For example, when the player clicks “Engage FTL”, call `/api/ftlJump`; when the player selects a Stargate destination, call `/api/dialGate`.
   * Manage asynchronous responses: show loading indicators or disable controls while waiting for reply if needed (especially if an OpenAI call is involved, which could have a noticeable delay).
   * Upon receiving data from backend, update the PixiJS game state/UI. For example, if `dialGate` returns an encounter event (like “Aliens attack!”), the front-end should spawn the appropriate game event (maybe trigger a battle mode or dialogue). If `upgradeSystem` succeeds, update the UI to show new system levels.
   * Ensure error handling: e.g., if the network or server fails, handle gracefully (maybe pause the game and show a message).
   * Acceptance: End-to-end actions work. E.g., the player can trigger a Stargate travel from the UI, the game calls backend, and the result (like a mission or resource discovery) is reflected in the game without needing a page reload or manual intervention.

8. **Persistent AI Companion (Destiny AI) Implementation**
   *Task:* Design and implement the Destiny AI character that interacts with the player. This involves prompt design for OpenAI, a memory system to make the AI persistent, and integration points in gameplay where the AI provides input or narrative.
   *Details:*

   * **AI Personality & Tone:** Define the AI’s persona in a system prompt. For example: “You are the sentient AI of the starship Destiny, an ancient and wise but sometimes sarcastic personality. You have detailed knowledge of the ship and mission, and you prioritize crew survival. Tone: helpful, somber humor, analytical.” Include context about the game’s dark survival setting so the AI’s outputs remain consistent in style.
   * **Dialog Interface:** On the front-end, create a UI for communicating with the AI. This could be as simple as a text console or chat window where the player can “consult” the AI (ask questions or get narrative commentary). Alternatively, the AI might proactively speak (via text) during events (like a narrator/guide). For MVP, implementing a basic chat box where the player selects from some dialogue options or free-types a question to the AI would showcase the feature.
   * **Backend AI API:** In `ai.ts`, create a function `queryAI(playerId, message)` which orchestrates an OpenAI ChatCompletion call. It should compile a prompt consisting of: a system message (AI persona and important game state facts), plus the conversation history or relevant memory. Use the OpenAI **chat API** with a model like GPT-4 (for better quality) or GPT-3.5.

     * **Persistent Memory:** Maintain a memory of important events. Since context length is limited, implement a strategy to persist and retrieve memories. For example, keep a running summary of the game’s story so far and store it in KV (or a Durable Object) keyed by `playerId`. Each time `queryAI` is called, prepend a short summary of past critical events, and possibly a few recent exchanges. The memory can be updated: if the conversation is long, summarize older messages to free context window.
     * Optionally, use a vector store (if available via an API or library) to embed and recall long-term memories. But a simpler approach: store key\:value facts (e.g. “CrewX died at planet Y”, “Destiny’s power very low after galaxy 3”) in a JSON and include that in the system prompt each time so the AI never forgets these pivotal facts.
   * **Function Calling for Actions:** For advanced integration, define a set of “game functions” that the AI can call using OpenAI’s function calling feature. For instance, functions like `setCourse(destination)`, `deployProbe(target)`, or `triggerAlarm(message)`. The AI, in its responses, could decide to invoke these, which the backend can intercept and execute (e.g., change game state or send a direct command to the front-end). This way, the AI agent can *act* within the game world, not just narrate. *Example:* The AI might detect a solar flare and call a `shieldBoost()` function, resulting in the game increasing shield power if possible – effectively the AI making a decision to protect the ship.
   * **Adapting to Player:** Ensure the AI’s responses use the stored memory of player choices. If the player previously made a morally tough decision (e.g. left someone behind on a planet), the AI might later refer to it or change tone (perhaps becoming more solemn or questioning the player). This adaptation makes the narrative feel responsive to the player's actions.
   * *Story and World Integration:* Use the AI to generate content: when entering a new star system, the game can call `queryAI` with a prompt like “Describe this star system and suggest a mission for the crew here.” The AI might return a rich description (“This system has a dim red dwarf… I detect a derelict ship orbiting the second planet. It could have supplies.”) which the game can then present as part of the story. This leverages GPT for **world building** and **mission scripting** on the fly. Similarly, for **technology generation**, if the player researches an alien device, ask the AI to output a tech report or even the specs of an upgrade (which can then become a new item in game).
   * Acceptance: The player can interact with the Destiny AI in-game. For example, the player asks “What is our status?” and the AI responds with a context-aware summary (pulling from game state: “Power at 40%, hull integrity 95%, but we are critically low on food after the last planet.”). The AI should remain consistent across interactions – if you ask later, it should “remember” prior facts or at least not contradict them. Also, during an event, the AI can proactively provide a generated description or advice. The AI’s integration should feel like a natural part of the game’s narrative, not just a chatbot bolted on.

9. **Crew Management System**
   *Task:* Implement crew as game entities with stats or statuses, and allow the player to manage or interact with them. This adds depth to the survival aspect and provides hooks for story events.
   *Details:*

   * Create a data structure for crew members (name, role, health, morale, skills, etc.). Initialize a few crew members at game start (could be pre-defined characters or randomly generated with certain traits).
   * Display crew info in a UI panel (e.g., a PixiJS UI overlay listing crew and key stats).
   * Crew interactions: e.g., assign crew to tasks (repair, research, away missions). This could be a simple text choice or dragging crew to tasks. Their skills could influence success chances of events (a scientist crew yields better results when researching alien tech, etc.).
   * Crew risk: crew can be injured or die during missions or if systems fail. This ties into narrative (AI might comment on a death, morale might drop, etc.). If a crew member dies, possibly log it into the “bones” system (see future task) for persistence.
   * This system primarily affects front-end (UI and game logic), but also needs back-end support: update game state with crew changes, and possibly incorporate crew info into AI prompt (AI might mention crew by name in dialogue).
   * Acceptance: The player can view crew status and perform at least one management action (for example, assign a crew member to man the weapons during a hostile encounter, boosting combat effectiveness). The outcome of that action is reflected in the game (e.g., higher success chance computed, or a narrative difference if a particular crew is present).

10. **Opening Sequence & Tutorial**
    *Task:* Develop the opening sequence of the game, serving as both introduction and tutorial. This should establish the story context, teach basic mechanics, and set the tone.
    *Details:*

    * See **Opening Sequence Story** section below for a narrative outline. The implementation involves scripting a series of events and dialogues that play out when the player first starts a new game. This likely will be a combination of **scripted triggers** (hard-coded sequence) and **dynamic AI narration**.
    * Example structure: Start with a black screen and some text (or simple intro) explaining the situation (e.g., “You awake disoriented on the Ancient vessel Destiny…”). Then fade into the game view where systems are failing. The AI greets the player and walks them through urgent tasks.
    * Implement this by having a state machine or sequence in the `Game` class that runs the intro: e.g., Stage 0: Intro dialog, Stage 1: tutorial task 1, etc. Each stage could wait for player input (like the player must click a button to seal a leaking section or navigate a menu) before proceeding.
    * Use the AI for flavor: e.g., the AI’s dialogue lines during the tutorial come from either a scripted set or actual OpenAI calls with a carefully crafted prompt (to ensure important info is conveyed). Given this is critical path, a hybrid approach might be best: script the exact lines for the tutorial to guarantee clarity, but *present* them as AI dialogue. Later free-form parts of the game can rely on AI more heavily.
    * Ensure the tutorial teaches: moving the ship or camera, checking crew status, using an interface to dial the Stargate, and using the AI console. Each step should be minimal and intuitive.
    * Tone: Emphasize the dark survival aspect – e.g., life support is failing (like SGU’s pilot episodes “Air” and “Darkness” where power and air were major issues). The player must act or the crew will die, creating immediate stakes. The AI is urgent but not panicked, providing instructions. Possibly include a bit of humor once crisis is averted (“Not bad for a human – I’ve updated your survival odds from 2% to 5%,” the AI quips).
    * Acceptance: A new player can start the game and be guided from a cold start to basic mastery of controls and understanding of the story within a few minutes. By the end of the opening sequence, the player knows how to interact with the ship (e.g., do an FTL jump or dial a gate) and is emotionally invested in the crew’s survival. Also, the initial story hook is set (for example, the next galaxy has a potential salvation or mystery to pursue).

11. **Mission & Event System**
    *Task:* Implement a system to handle missions (quests) and random events during gameplay. Missions can be story-driven (some pre-scripted critical missions) or dynamically generated side-quests. Events are unplanned occurrences (e.g., “meteor shower damaging the hull”).
    *Details:*

    * Create a structure to represent a mission: objectives, status (ongoing/completed), rewards or consequences. Some missions can be tied to the main storyline (e.g., “Reach a habitable planet before food runs out”) while others are side missions (e.g., “Explore a derelict ship for technology”).
    * Hard-code a few key storyline missions that guide the player across major arcs (these ensure the game has a coherent plot arc). For example, Mission 1: “Restore Life Support (tutorial)”, Mission 2: “Investigate the Ancient Signal in Galaxy 2”, etc. Use these to pace the game.
    * Integrate the **AI** for dynamic missions: Using the procedural generation and AI, create optional missions on the fly. As found in research, AI can generate *dynamic quests adjusting to player progress and choices*. For instance, if the player is low on fuel, the AI might generate a quest like “Scan the current system for usable stellar energy or mineral deposits.” This quest text can be AI-generated for flavor, but the game logic will implement the scanning mechanics and outcome.
    * Random events: Set up a timer or trigger conditions for events. E.g., every FTL jump has a small chance to trigger an event (system malfunction, encounter with aliens, etc.). Use weighted randomness or depend on player state (if hull is already weak, maybe avoid spawning a meteor event that would be unfair; or contrarily, do it to force a tough choice). For each event type, create a handler: update relevant game state and present the scenario to the player (via UI and possibly AI narration).
    * Logging and persistence: When missions are completed or events occur, log them (could append to a text log that is part of game state). This log can feed into the AI memory, so the AI recalls what has happened (“Yesterday we survived a radiation burst by hiding behind a moon”).
    * Acceptance: The game experiences occasional events and offers missions to the player. The player can check a “Mission Log” UI to see current objectives. On completing or failing missions, the game state updates and possibly the AI responds (celebrating success or lamenting failure). The inclusion of dynamic content means repeat playthroughs present different side missions or events, enhancing replayability.

12. **‘Bones Files’ Persistence Hook**
    *Task:* Design a system akin to Nethack’s *bones files* for future use, where remnants of past playthroughs can appear in new games. This is a forward-looking feature to increase long-term engagement and a sense of shared world or roguelike continuity.
    *Details:*

    * Define what data from a playthrough should persist. Examples: If a playthrough ends in failure (the crew dies), record the state of that ship at demise – location, cause of death, maybe some log entries or an “AI last words” message. If a playthrough ends in success or abandonment, maybe record a cache of supplies or a personal log left behind.
    * Use Cloudflare KV or Durable Objects to store these records globally (not just per player). Essentially, these are the *bones files*. Each entry could have a unique ID or be keyed by the galaxy or planet where it occurred (e.g., “bones\_galaxy7\_planet3” containing the data of a player who died there).
    * Plan how to surface these in new games: When a new player (or new run) enters a galaxy or planet, there’s a chance to load an existing bones file for that location. For example, if a previous run’s Destiny was lost in Galaxy 5, then in a new run when the player reaches Galaxy 5, the game might spawn an event: discovering the derelict wreck of the *previous Destiny*. The player could salvage resources from it or encounter the “ghost” of the old crew (in a sci-fi way). This can be incredibly compelling if implemented.
    * Initially, implement the hooks: e.g., when a game ends, save a bones entry. When generating content for a location, check for an existing bones entry and, if found, incorporate it (trigger an event or add an AI dialogue “I’m picking up familiar signals... it seems another Destiny expedition met their end here.”).
    * Careful with size and sensitive info: Only store what’s relevant for storytelling (no personal data, just game narrative data).
    * *Future expansion:* Eventually, allow players to share or opt-in to making their bones files public, so one player’s death can appear in another’s game (like in Nethack on public servers). This could be an opt-in online feature.
    * Acceptance: The system is in place (even if there’s no large pool of bones files yet). If a test is done where a bones file is manually inserted, a new game will detect it and create a corresponding in-game encounter. Essentially, the foundation is laid for this roguelike feature, to be expanded as more games are played.

13. **Testing, Tuning, and Deployment**
    *Task:* Finalize the game for an MVP release on Cloudflare and iterate with testing.
    *Details:*

    * Write unit tests for critical functions: procedural generation (given a seed, outputs expected structure), AI prompt assembly (ensures no prompt tokens exceed limits and memory insertion works), etc. Use a test runner in Node for backend logic and possibly PixiJS headless tests for some front-end logic.
    * Playtest the game internally or with a small group. Gather feedback on game balance (resource scarcity, event frequency), clarity of UI (is the tutorial effective?), and the AI’s helpfulness vs. unpredictability. Tweak parameters: e.g., adjust how often the AI speaks unprompted, or how difficult events are in early galaxies.
    * Performance check: PixiJS should handle the 2D graphics smoothly on modern browsers; ensure any heavy rendering (particle effects, etc.) are tuned down for lower-end devices. The Cloudflare Worker has CPU time limits per request – make sure generation or AI calls fit within those (e.g., if an AI call might be slow, stream the response or use `fetch` with streaming if needed to gradually process it).
    * **Deployment:** Use `wrangler publish` to deploy the Cloudflare Worker backend. Host the front-end build on a static host (could be Cloudflare Pages or even included in the Worker using [`--site` in wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/) to serve the static files from KV). Since it’s a mono-repo, a CI/CD pipeline can be set up: when pushing to main, run tests, then build front-end and deploy to Pages, and deploy Worker via Wrangler.
    * Monitor and logging: Utilize Cloudflare Worker’s logs (and add some logging in code for critical events) to catch runtime errors or unusual behavior. Particularly monitor OpenAI API usage/cost and handle rate limits or errors (the AI should fail gracefully if the API is down – perhaps the Destiny AI says it needs to “recalibrate” and give a pre-canned response).
    * Acceptance: The game is accessible via a URL, and multiple test players can start new sessions. The core loop (explore, gather, survive, story) is functional end-to-end. The AI adds meaningful flavor and does not produce obviously inappropriate content (use OpenAI settings to avoid that). All major bugs from testing are resolved or documented for future fixes.

With these tickets tackled, the MVP version of the game should be complete and rich in features. The roadmap ensures a clear path from initial setup to advanced AI integration, aligning with the project’s ambitious vision.

## Opening Sequence Story Outline

To set the stage, the opening sequence will unfold as a guided narrative and tutorial. Below is the structured sequence of events and story beats that introduce the player to the *Destiny* and its perilous situation:

1. **Prologue – “Awakening on Destiny”:** The screen fades in from black. A brief text crawl or narration explains that the crew has been forced through a Stargate to an unknown ship (Destiny) far from home, echoing the *SGU* pilot setup. The player’s character (e.g. the highest-ranking survivor or a specialist) gains consciousness after an emergency transit. The Destiny’s lights flicker, emergency alarms blare. *(In gameplay, show a dimly lit ship interior background on the Pixi canvas. Perhaps play a muffled alarm sound.)* Soon, the ship’s **AI** activates: a calm voice/text greets, “**Destiny AI**: *Systems coming online. Crew life signs detected.* …” This introduces the AI companion. It briefly explains the dire situation: The ship is in **critical condition** (life support failing, power reserves low).

2. **Tutorial Part 1 – “Critical Systems Failing”:** The AI guides the player to address immediate emergencies. For instance, the AI might say, “Life support is at 5%. We have a few minutes of air. The CO2 scrubbers need replacement minerals.” This directly nods to SGU’s *Air* episode crisis. The player is prompted to perform a simple action: e.g., click a flashing **Life Support** panel in the UI. When clicked, a prompt might show “Scrubber material depleted. Solution: find lime on a nearby planet.” The AI then instructs how to use the Stargate: “We must dial an unknown world for resources.” *(Gameplay: highlight the “Stargate” button or map, and allow the player to choose a planet to gate to.)* This step teaches clicking UI elements and following AI instructions.

3. **Tutorial Part 2 – “Through the First Stargate”:** Upon confirming the mission, the front-end triggers a backend call to generate a planet via the Stargate. The first planet is scripted to be relatively safe but inhospitable (e.g., a desert planet rich in lime, referencing *SGU\:Air*). The Destiny AI (with either a pre-written message or an OpenAI-generated description) narrates the planet on arrival: e.g., “**Destiny AI**: *The gate opens to a barren desert. Scans show deposits of calcium carbonate in the sands – exactly what we need.*” The player “sends” a team (some crew members) through. This could be abstracted (no need to show them physically; assume they go and come back via text updates), or a minigame if time permits. After a short success timer or mini-interaction, the required mineral is obtained. The AI reports life support is stabilizing. *(Gameplay: this teaches the player about gating and resource missions. The backend procedural gen can be rigged to guarantee the needed resource on the first try.)*

4. **Story Beat – “A Moment of Relief”:** With life support repaired, the immediate threat is over. The lights on Destiny stabilize. The crew is breathing easier. The AI thanks the player for swift action, perhaps with a touch of dry humor: “*Crisis averted. Breathing is back in style. Well done.*” This provides a small emotional high after the tension, also showcasing the AI’s personality.

5. **Tutorial Part 3 – “Ship Systems & FTL Jump”:** Now that survival is secured for the moment, the AI introduces other systems and the larger goal: continuing Destiny’s journey. It might highlight that the ship’s FTL engines are charging for an automatic jump (in SGU, Destiny periodically jumps to the next star system). The player is shown the **Ship Status** screen (with systems like Engines, Shields, etc.). The AI explains each briefly, e.g., “*Our FTL drive will engage soon, carrying us to the next galaxy. We cannot control the destination – it’s on autopilot – but we can prepare. Check the ship’s power levels...*” The player learns to navigate the UI, maybe toggling a system or acknowledging a warning.

6. **Initiate FTL – “Into Darkness”:** The countdown to FTL jump reaches zero. The AI signals all crew to brace. *(Gameplay: perhaps a simple animation of stars streaking, or just a screen shake to simulate the jump.)* This marks the transition out of the tutorial to the open gameplay. The screen could fade out or display “Jumping to next galaxy…”. During this, a short dialogue: the AI says something foreshadowing: “*I’ve charted the next region. Scanning for Stargates and threats... We’re truly in the unknown now.*” A crew member might crack a joke to lighten mood (“At least there’s no angry aliens *yet*.”) to echo SGU’s occasional humor under stress.

7. **Post-Jump – “New Galaxy, New Dangers”:** The ship exits FTL in a new star system. This is now procedurally generated content. The player regains control in full game mode. Perhaps immediately an event happens (for excitement): e.g., an automated Ancient defense drone attacks Destiny, or a power failure in one sector. The AI alerts the player, and now the player must apply what they learned (manage a combat or another system fix). The safety wheels are off, but the tutorial has built confidence. The *Destiny AI* continues as a guide and narrative voice, but the player is now free to explore, manage, and survive.

Throughout the opening, the story should emphasize the **key themes**: isolation (they are far from Earth), stakes (basic survival is challenged), and the unknown (each jump could bring new wonders or terrors). By the end of the opening sequence, the player is emotionally invested in keeping the crew alive and curious about what lies ahead, with the Destiny AI established as both a helper and a character with its own flavor.

## Persistent AI Companion Design & Integration

Designing the Destiny AI to be a persistent, evolving companion is a centerpiece of this game. The AI bridges the gap between a traditional game narrator and a dynamic storytelling agent. Below is the strategy for integrating this AI into the game world:

* **AI Role and Personality:** The AI functions as the ship’s computer with a sentient twist. It addresses the player and crew, providing analysis, advice, and sometimes opinions. Drawing from SGU’s theme, the AI is generally serious (matching the dark tone) but can exhibit dry wit or curiosity reminiscent of an Ancient entity observing humans. We craft the AI’s dialogue style through a combination of prompt engineering and content guidelines given to the OpenAI model.
* **Technical Implementation:** The AI’s brain is powered by OpenAI’s GPT model via the Chat Completion API. Every time the AI needs to speak or decide something complex, the game backend calls this API. The call includes a **system message** that establishes context (the AI’s persona, current game state summary, and any important lore). We also include a **conversation history** of recent exchanges so the AI has continuity. By storing previous dialogues and key events, we achieve persistent memory – the AI remembers or refers to past situations appropriately. Because context length is finite, older events are summarized or stored as facts.
* **Memory Management:** We implement a memory module that captures game events in a form the AI can use. There are two kinds of memory:

  * **Declarative memory (facts & events):** This includes world facts (e.g., “We are in Galaxy 3, planet X has alien ruins discovered” or “Crew member Y died in an accident”) and history of what happened. This is akin to the AI’s long-term knowledge. We maintain this as a running log or structured data. When calling the AI, we inject the most relevant facts from this memory into the prompt (e.g., always include recent major events and any key character dynamics that have formed).
  * **Procedural memory (skills & functions):** This includes the AI’s ability to perform actions. Using OpenAI function calling, we give the AI “tools” (functions representing in-game actions or queries it can make). For example, a function `checkDatabase(topic)` could allow the AI to retrieve a stored piece of lore (if we have an internal knowledge base of Destiny’s library or something). Or a function `generateMission()` that the AI can call to propose a new quest (the backend would then use procedural generation to actualize it). By exposing controlled APIs to the AI, we keep it grounded and enable it to influence game state safely. The AI’s **procedural memory** is basically these abilities – it “knows” it can do certain things beyond just talking, because we describe those in the function definitions.
* **AI in Gameplay Loop:** The AI will be invoked in various scenarios:

  * **Dialogue:** When the player asks the AI a question or chooses a dialogue option, we call the AI for a response. The UI might present the AI’s answer as text or voice (text for now). The content will reference current circumstances: e.g., if the player asks “What are our chances?”, the AI might compute and respond with a percentage and a sardonic remark based on memory of recent crises.
  * **Narration & Alerts:** The AI proactively provides narration for discoveries or alerts for dangers. For instance, upon entering a new system, we might prompt the AI: “Describe this system and any notable readings.” The returned description is shown to the player as the scanner/AIs report. In case of an emergency event (say a reactor overload), we might prompt: “React in an urgent tone to the reactor overload and suggest a solution.” The AI’s answer becomes the in-game alert text.
  * **Dynamic Content Generation:** The AI can fill in details that are too tedious to script by hand. Missions, as mentioned, can be AI-suggested. Similarly, minor flavor text like crew interactions or data logs found on planets can be AI-generated on the fly, making the world feel larger. We always frame the prompt to keep outputs in line with game lore and tone (using the system message to remind it of the atmosphere).
  * **Adapting to Player Choices:** The AI analyzes what the player does. If the player tends to take risky actions, the AI might change how it advises (perhaps warning more sternly, or eventually showing admiration for bravery). This is done by updating a “player profile” in memory that the AI sees. For example, store a trait like `playerDisposition = reckless` vs `cautious`, and include in the prompt “The Commander has shown a reckless approach to danger in the past.” The AI will likely factor that into responses (maybe scolding gently or adjusting difficulty suggestions). This ensures the game narrative dynamically aligns with the player’s playstyle.
* **World-Building with AI:** The combination of procedural generation and AI means the lore can be deep. If a new alien species is encountered (determined by procedural logic), the AI can generate a name and a brief culture/background for them, making each encounter more story-rich. For technology, if the player researches an artifact, the AI can generate a small tech report or hypothesize its use, essentially creating *in-universe documentation*. Because the AI has memory, it can reference these created lore bits later (e.g., remembering that “the crystalline aliens on planet XYZ shared their water filtration tech with us” in future dialogue).
* **Human Oversight & Safety:** We apply some constraints to the AI. In system prompts, we instruct it to avoid breaking immersion or introducing content that violates the game’s intended rating (keep it PG-13 for example). We also set up fallback text for critical interactions in case the AI fails or outputs something unusable (the game should never stall because the AI didn’t respond meaningfully; in such cases, have a generic line ready or retry the API).
* **Testing AI Behavior:** We will simulate various conversation flows with the AI offline to refine the prompts. For instance, ensure that if the player insults the AI or asks something off-topic, the AI stays in character (maybe a witty retort or a redirection to mission). Use OpenAI’s tools or a test harness with representative prompts from our game to see output and iteratively improve prompt wording.

In summary, the AI is woven into the game as a narrator, quest-giver, and character. It leverages persistent memory and OpenAI’s generative abilities to make the game world **reactive and personalized** to the player. This design aims to fulfill the vision of an AI that **remembers, adapts, and collaborates** with the player, providing an experience where no two sessions are exactly the same and the story naturally evolves from the interplay of player actions and AI responses.

**Sources:**

* Baiye, D. *Top 3 JS Game Development Libraries.* *Medium.* (PixiJS performance)
* Knops, Z. *Using OpenAI ChatGPT to create a Cloudflare worker-based chess game backend.* *Medium.* (Workers KV for game state; stateless Workers)
* Cloudflare Blog. *Building real-time games using Workers, Durable Objects, and Unity.* (Workers + Durable Objects for game state)
* Koerselman, T. *TypeScript all-in-one: Monorepo with its pains and gains.* *Dev.to.* (Monorepo rationale)
* Wanderer, J. *Gaming with GPTs – Building a GPT-driven game.* *Medium.* (GPT NPCs with function calling)
* Whimsy Games Blog. *Mastering AI-Powered Procedural Content Generation for Games.* (Dynamic quests adapting to player)
* Ali, *AI’s Favorite Human*. *How Video Games Are About To Get A Lot More Real...* *Medium.* (Persistent memory for unique player journeys)
* NetHack Wiki. *Bones files.* (Persistence of past runs in new games)
* **Stargate Universe** references – SGU’s darker tone and survival scenario, which inspire the game’s narrative style.
