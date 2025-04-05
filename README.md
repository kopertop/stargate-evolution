# Stargate Evolution: Exploration & Discovery

A web-based, top-down, turn-based game based on the Stargate universe, focusing on exploration, resource management, and base building, powered by React Three Fiber.

## Game Features

- **Planetary Exploration**: Discover new planets through the Stargate network
- **Base Building**: Establish and upgrade bases on colonized planets
- **Resource Management**: Collect and manage various resources
- **Trade System**: Create trade routes between planets with stargates
- **Combat**: Defend against enemy factions like the Goa'uld
- **Research**: Discover new technologies to advance your capabilities
- **Cross-Platform Support**: Play on web and iOS devices with controller, keyboard, and mouse input
- **Turn-Based Gameplay**: Engage in strategic exploration and combat with a turn-based system.
- **Top-Down Perspective**: Experience the game from a classic tabletop-style viewpoint.

## Running Locally

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- (Ensure you have a compatible browser with WebGL support)

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd stargate-evolution
```

2. Install dependencies:
```
npm install
# Also install three.js and react-three-fiber
npm install three @react-three/fiber
# Optionally, install @react-three/drei for useful helpers
npm install @react-three/drei
```

3. Start the development server:
```
# Assuming you are using Create React App or Vite
npm start 
# or
npm run dev
```

4. Run on your preferred platform:
   - Open the game in your web browser via the provided localhost URL.

## Linting

The project uses ESLint with TypeScript support to maintain code quality. Key features of our ESLint configuration:

- Tab-based indentation
- TypeScript type checking
- Best practices enforcement for web development
- Import order management
- Banning of the `uuid` library (use our custom ID generator instead)

Available npm scripts:
```
# Run linter to check for issues
npm run lint

# Fix automatically fixable issues
npm run lint:fix 

# Replace uuid usage with our custom ID generator
npm run replace-uuid
```

## Troubleshooting

If you encounter the error `crypto.getRandomValues() is not supported`, the app is now using a custom ID generator that doesn't rely on crypto APIs, so this error should be resolved.

## Project Structure

- `src/systems/`: Core game systems (trade, missions, combat, etc.)
- `src/components/`: UI components
- `src/screens/`: Game screens
- `src/types/`: TypeScript type definitions
- `src/utils/`: Utility functions
- `src/rendering/`: React Three Fiber visualization components 

## Development Guidelines

*   **Turn-Based First**: All game logic (combat, exploration events, resource updates) must adhere to the turn-based structure outlined in `PROMPT.md`. Avoid real-time updates (`useFrame`) for core mechanics.
*   **Top-Down Design**: UI, interactions, and rendering should prioritize clarity and usability from a top-down perspective (likely using an `<OrthographicCamera>`).
*   **React Components**: Leverage React functional components, hooks (`useState`, `useEffect`, `useRef`), and R3F components/hooks (`<Canvas>`, `<mesh>`, `useFrame` sparingly) for building the scene and UI.
*   **TypeScript & Modularity**: Maintain strong typing and break down systems into modular, reusable components/functions.

## Styling System

The project uses a modular SCSS system for styling, organized for better maintainability and scalability.

### Directory Structure

```
src/styles/
├── main.scss              # Main entry file that imports all other styles
├── base/                  # Basic styles, resets, typography
│   ├── _index.scss        # Forwards all files in the directory
│   └── _reset.scss        # CSS reset and base styles
├── components/            # UI component styles
│   ├── _index.scss        # Forwards all files in the directory
│   ├── _ui.scss           # Game UI element styles
│   └── _help.scss         # Help and tutorial styles
├── effects/               # Visual effects
│   ├── _index.scss        # Forwards all files in the directory
│   └── _wormhole.scss     # Wormhole travel effect styles
├── layout/                # Layout styles (currently empty)
└── variables/             # SCSS variables
    ├── _index.scss        # Forwards all files in the directory
    ├── _colors.scss       # Color variables
    └── _sizes.scss        # Size, spacing and z-index variables
```

### Using Variables

When creating a new SCSS file, import the variables at the top:

```scss
@use '../styles/variables' as *;

.my-component {
  color: $primary;
  padding: $spacing-md;
  border-radius: $border-radius-sm;
}
```

### Best Practices

- Create new component-specific styles in the appropriate directory 
- Always use the defined variables for colors, sizes, z-indices, and transitions
- Follow the naming pattern of prefixing partial files with underscore (_)
- Keep nesting to a maximum of 3 levels deep for better CSS output
- Use the `&` parent selector for modifiers and pseudo-classes
- Update the corresponding `_index.scss` file when adding new files

For more details on the styling system, see `src/README.md`.

 