# Stargate Universe: Exploration & Discovery

A mobile game based on the Stargate universe, focusing on exploration, resource management, and base building.

## Game Features

- **Planetary Exploration**: Discover new planets through the Stargate network
- **Base Building**: Establish and upgrade bases on colonized planets
- **Resource Management**: Collect and manage various resources
- **Trade System**: Create trade routes between planets with stargates
- **Combat**: Defend against enemy factions like the Goa'uld
- **Research**: Discover new technologies to advance your capabilities

## Running Locally

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd stargate-universe
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npx expo start
```

4. Run on your preferred platform:
   - Press `a` to run on Android emulator
   - Press `i` to run on iOS simulator
   - Scan the QR code with the Expo Go app on your physical device
   - Press `w` to run in a web browser

## Linting

The project uses ESLint with TypeScript support to maintain code quality. Key features of our ESLint configuration:

- Tab-based indentation
- TypeScript type checking
- React and React Native best practices enforcement
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
- `src/components/`: React Native UI components
- `src/screens/`: Game screens
- `src/types/`: TypeScript type definitions
- `src/utils/`: Utility functions 
