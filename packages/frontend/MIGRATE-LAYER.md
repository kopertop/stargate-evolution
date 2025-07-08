# Layer Migration Guide

This document outlines the exact steps for migrating rendering layers from the main `Game` class into separate, focused components. This process helps separate concerns, improve maintainability, and enable easier testing.

## Migration Strategy Overview

The goal is to extract layer-specific logic from `game.ts` into dedicated layer components that extend `PIXI.Container` while maintaining the existing API and functionality.

## Step-by-Step Migration Process

### 1. Analysis Phase

**1.1 Deep Review**
- Read and understand the current codebase structure
- Identify the target layer (e.g., `doorsLayer`, `roomsLayer`, `furnitureLayer`, `npcLayer`)

**1.2 Identify Layer-Related Code**
- Find the layer property declaration (e.g., `private doorsLayer: PIXI.Container | null = null`)
- Find the layer data arrays (e.g., `private doors: DoorTemplate[] = []`)
- Locate all methods that operate on the layer:
  - Rendering methods (e.g., `renderDoor()`, `renderRoom()`)
  - Query methods (e.g., `findDoor()`, `findCollidingDoor()`)
  - State management methods (e.g., `getDoorStates()`, `restoreDoorStates()`)
  - Interaction methods (e.g., `activateDoor()`, `handleDoorActivation()`)
  - Collision detection methods (e.g., `isPointNearDoor()`, `findNearbyOpenDoor()`)

### 2. Component Creation Phase

**2.1 Create Layer Component File**
- Create new file: `/src/components/{layer-name}-layer.ts` (use kebab-case)
- Import required types and PIXI

**2.2 Define Component Structure**
```typescript
import type { EntityTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

export interface {LayerName}LayerOptions {
	on{Entity}StateChange?: (entityId: string, newState: string) => void;
	// Add other callback options as needed
}

export class {LayerName}Layer extends PIXI.Container {
	private entities: EntityTemplate[] = [];
	private options: {LayerName}LayerOptions;

	constructor(options: {LayerName}LayerOptions = {}) {
		super();
		this.options = options;
	}
	
	// Public API methods go here
	// Private implementation methods go here
}
```

**2.3 Migrate Core Methods**
- Copy all layer-specific methods from `game.ts`
- Update method signatures to work within the component
- Replace `this.entities` access with the component's internal array
- Replace `this.{layer}Layer` references with `this` (the component itself)
- Update console log prefixes to use layer name (e.g., `[DOORS]`, `[ROOMS]`)

**2.4 Implement Public API**
- `setEntities(entities: EntityTemplate[]): void` - Set the entity data
- `getEntities(): EntityTemplate[]` - Get current entity data
- `render(): void` - Re-render the layer (private, called automatically)
- Entity-specific query methods (e.g., `findEntity()`, `findCollidingEntity()`)
- State management methods (e.g., `getEntityStates()`, `restoreEntityStates()`)
- Interaction methods (e.g., `activateEntity()`, `handleActivation()`)

### 3. Game.ts Integration Phase

**3.1 Add Import**
```typescript
import { {LayerName}Layer } from './components/{layer-name}-layer';
```

**3.2 Update Property Declaration**
```typescript
// Change from:
private {layer}Layer: PIXI.Container | null = null;
// To:
private {layer}Layer: {LayerName}Layer | null = null;
```

**3.3 Update Layer Creation**
In the `initializeRoomSystem()` method:
```typescript
// Change from:
this.{layer}Layer = new PIXI.Container();
// To:
this.{layer}Layer = new {LayerName}Layer({
	on{Entity}StateChange: (entityId: string, newState: string) => {
		// Handle state changes if needed
		console.log('[GAME] {Entity} state changed:', entityId, 'to', newState);
	}
});
```

**3.4 Update Data Loading**
In the `loadRoomData()` method, after loading data:
```typescript
// Initialize layer with data
if (this.{layer}Layer) {
	this.{layer}Layer.setEntities(this.entities);
	// Set additional data if needed (e.g., rooms for doors)
}
```

**3.5 Update Rendering Logic**
In the `renderRooms()` method:
```typescript
// Remove old manual rendering:
// this.entities.forEach(entity => {
//     this.renderEntity(entity);
// });

// Replace with:
// Update entities in {LayerName}Layer
if (this.{layer}Layer) {
	this.{layer}Layer.setEntities(this.entities);
}

// Remove manual removeChildren() call for this layer
```

**3.6 Redirect Method Calls**
For each method that was migrated to the layer component:
```typescript
// Change from:
private methodName(...): ReturnType {
	// implementation
}
// To:
private methodName(...): ReturnType {
	return this.{layer}Layer?.methodName(...) || defaultValue;
}
```

**3.7 Update State Management**
```typescript
// Update getDoorStates-style methods:
public get{Entity}States(): any[] {
	return this.{layer}Layer?.get{Entity}States() || [];
}

// Update restore methods:
public restore{Entity}States(states: any[]) {
	this.{layer}Layer?.restore{Entity}States(states);
	// Update internal array to stay in sync
	this.entities = this.{layer}Layer?.getEntities() || [];
}
```

**3.8 Remove Old Methods**
- Delete the original `render{Entity}()` method from `game.ts`
- Remove any other methods that were fully migrated to the layer component

### 4. Testing Phase

**4.1 Type Checking**
```bash
cd packages/frontend && pnpm run typecheck
```

**4.2 Full Project Check**
```bash
pnpm -w run check
```

**4.3 Verify Functionality**
- Ensure no compilation errors
- Verify no new linting warnings introduced
- Test that the layer functionality works as expected

## Common Patterns & Guidelines

### API Design
- **Public methods**: Operations that the game needs to perform on the layer
- **Private methods**: Internal implementation details
- **Consistent naming**: Use layer-specific prefixes in console logs
- **Type safety**: Maintain full TypeScript support

### State Synchronization
- Layer components manage their own entity arrays
- Game class maintains copies for compatibility
- Always sync after state restoration: `this.entities = this.{layer}Layer?.getEntities() || []`

### Error Handling
- Use optional chaining (`?.`) when calling layer methods
- Provide sensible defaults for failed operations
- Log errors appropriately with layer-specific prefixes

### Performance Considerations
- Layer components handle their own rendering lifecycle
- Avoid manual `removeChildren()` calls on layer containers
- Let the layer component manage its own children

## Example: DoorsLayer Migration

The DoorsLayer migration serves as the reference implementation:
- **File**: `/src/components/doors-layer.ts`
- **Methods migrated**: `renderDoor`, `findCollidingDoor`, `activateDoor`, etc.
- **Game integration**: Updated all door-related method calls to use DoorsLayer API
- **State management**: `getDoorStates()`, `restoreDoorStates()` delegated to layer

## Files to Modify

For each layer migration:
1. **Create**: `/src/components/{layer-name}-layer.ts`
2. **Modify**: `/src/game.ts` (imports, properties, method calls)
3. **Update**: This guide with any lessons learned

## Migration Status - COMPLETE! 🎉

### All Layers Successfully Migrated ✅

1. ✅ **DoorsLayer** - Door management and rendering
2. ✅ **RoomsLayer** - Room layout and spatial queries  
3. ✅ **FurnitureLayer** - Interactive furniture placement
4. ✅ **NPCLayer** - NPC management and AI integration
5. ✅ **BackgroundLayer** - Dynamic backgrounds and FTL effects
6. ✅ **FogLayer** - Fog of war with performance optimizations
7. ✅ **MapLayer** - Galaxy map rendering and navigation

### MapLayer Migration (Final Layer)

**Complexity**: MEDIUM
**Performance Optimizations**: Galaxy map rendering, star system visualization, zoom management

**Key Features Migrated**:
- Galaxy map rendering with star systems and ship positioning
- Interactive zoom controls (0.2x to 8x range)
- System and planet focus navigation
- Destiny ship rendering integration
- Star type color mapping and multi-star system support

**Architecture**:
- Clean separation of map rendering logic from game.ts
- Callback-based integration for system/planet focus events
- Comprehensive TypeScript interfaces for galaxy/system/ship data
- Debug utilities and map bounds calculation

### Final Result

The game.ts monolith has been **completely decomposed** into focused, reusable components following clean architecture principles. Each layer is now:

- **Self-contained**: Manages its own state and rendering
- **Well-tested**: Comprehensive test coverage for core functionality  
- **Type-safe**: Full TypeScript support with proper interfaces
- **Performance-optimized**: Critical performance features preserved
- **Maintainable**: Clear separation of concerns and consistent patterns

The migration process established patterns that can be applied to future component extractions, ensuring the codebase remains modular and maintainable as it grows.