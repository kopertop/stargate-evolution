# Linting Guidelines for Stargate Universe

This document provides guidance on resolving common linting issues in the project.

## Common Linting Issues

### 1. Lexical Declarations in Case Blocks

Error: `Unexpected lexical declaration in case block`

Fix: Wrap case content in curly braces to create a block scope:

```typescript
switch (value) {
	case 'SOME_VALUE': {
		const localVar = 'example';
		// rest of case
		break;
	}
	default:
		// handle default
}
```

### 2. Missing Return Types

Warning: `Missing return type on function`

Fix: Add explicit return types to functions:

```typescript
// Before
const myFunction = () => {
	return 'value';
};

// After
const myFunction = (): string => {
	return 'value';
};
```

For React components, use `React.FC` or `React.FunctionComponent`:

```typescript
const MyComponent: React.FC<MyProps> = ({ prop1, prop2 }) => {
	return <View>...</View>;
};
```

### 3. Unused Variables

Warning: `is assigned a value but never used`

Fix: Remove or use the variable, or prefix with underscore to indicate intentional non-use:

```typescript
// Before
const { value, unusedValue } = props;

// After (if intentionally unused)
const { value, _unusedValue } = props;

// Or simply
const { value } = props;
```

### 4. Any Types

Warning: `Unexpected any. Specify a different type`

Fix: Replace `any` with a more specific type:

```typescript
// Before
function processData(data: any): any {
	return data;
}

// After
interface DataType {
	id: string;
	value: number;
}

function processData(data: DataType): DataType {
	return data;
}
```

### 5. Import Order

Error: `There should be no empty line within import group`

Fix: Group imports and remove empty lines between imports of the same group:

```typescript
// External imports
import React from 'react';
import { View, Text } from 'react-native';

// Internal imports (no empty lines between same group)
import { GameState } from '../types/game-types';
import { generateId } from '../utils/id-generator';
```

## Running the Linter

```bash
# Check for linting issues
npm run lint

# Fix automatically fixable issues
npm run lint:fix
```

## ESLint Configuration

Our project uses ESLint with TypeScript support. Key configurations:

- Tab-based indentation
- TypeScript type checking
- React and React Native best practices
- Import order management
- Banning of the `uuid` library (use our custom ID generator instead) 
