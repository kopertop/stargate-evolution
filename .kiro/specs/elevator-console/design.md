# Design Document

## Overview

The elevator console system will extend the existing furniture interaction framework to provide floor navigation functionality. When players interact with elevator console furniture, a modal-based floor selection interface will appear, allowing them to choose their destination floor. The system will integrate with the existing floor filtering system used in the room builder and leverage existing UI patterns from the game's pause menu system.

## Architecture

### Core Components

1. **ElevatorConsole Component** - React modal component reusing existing game menu patterns
2. **Enhanced FurnitureLayer** - Extended to handle elevator-specific interactions
3. **Game Class Floor Management** - Extends existing floor handling to support player transitions

### Integration Points

- **Game Class**: Manages current floor state and handles elevator activation
- **FurnitureLayer**: Detects elevator console interactions and triggers UI (reuses existing `handleFurnitureActivation`)
- **Room Builder Floor System**: Leverages existing `selectedFloor` and floor filtering logic
- **Existing Modal Patterns**: Reuses pause menu navigation and input handling

## Components and Interfaces

### ElevatorConsole Component

Reuses existing modal patterns from pause menu and room details modal:

```typescript
interface ElevatorConsoleProps {
  show: boolean;
  onHide: () => void;
  currentFloor: number;
  availableFloors: number[];
  onFloorSelect: (floor: number) => void;
  focusedMenuItem: number; // Reuse existing menu navigation
  setFocusedMenuItem: (index: number) => void;
}
```

**Features:**
- Extends existing `Modal` component patterns from `room-details-modal.tsx`
- Reuses existing gamepad navigation from `game-page.tsx` pause menu
- Leverages existing `focusedMenuItem` state management
- Uses existing button styling and focus highlighting patterns

### Game Class Floor Management

Extends existing Game class without creating new services:

```typescript
// Add to existing Game class
interface GameOptions {
  // ... existing options
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
}

class Game {
  private currentFloor: number = 0;
  
  // Extend existing methods
  public getCurrentFloor(): number
  public setCurrentFloor(floor: number): void
  public getAvailableFloors(): number[]
  
  // Extend existing renderRooms to filter by floor
  private renderRooms(): void // Modified to filter by currentFloor
}
```

### Enhanced Furniture System

Reuses existing `RoomFurniture` schema without modifications:

```typescript
// Use existing description field for elevator configuration
furniture: {
  furniture_type: "elevator_console",
  interactive: true,
  description: JSON.stringify({
    accessible_floors: [0, 1, 2, 3],
    elevator_group: "main"
  })
}
```

## Data Models

### Floor State Management

Leverages existing room filtering patterns from room builder:

```typescript
// Reuse existing room filtering logic
const floorRooms = rooms.filter(room => room.floor === currentFloor);
const floorDoors = doors.filter(door => {
  const fromRoom = rooms.find(r => r.id === door.from_room_id);
  const toRoom = rooms.find(r => r.id === door.to_room_id);
  return fromRoom?.floor === currentFloor && toRoom?.floor === currentFloor;
});
const floorFurniture = furniture.filter(f => {
  const room = rooms.find(r => r.id === f.room_id);
  return room?.floor === currentFloor;
});
```

### Player Position Management

Extends existing player positioning system:

```typescript
// Add to existing Game class
private findElevatorPosition(floor: number, elevatorGroup?: string): { x: number; y: number } {
  // Find elevator console on target floor
  const targetFloorRooms = this.rooms.filter(r => r.floor === floor);
  const elevatorFurniture = this.furniture.find(f => {
    const room = this.rooms.find(r => r.id === f.room_id);
    return room && targetFloorRooms.includes(room) && 
           f.furniture_type === 'elevator_console';
  });
  
  if (elevatorFurniture) {
    const room = this.rooms.find(r => r.id === elevatorFurniture.room_id)!;
    return roomToWorldCoordinates(elevatorFurniture, room);
  }
  
  // Fallback to room center if no elevator found
  return { x: 0, y: 0 };
}
```

## Error Handling

### Validation Rules

1. **Floor Accessibility**: Reuse existing room filtering logic to validate floors exist
2. **Elevator Connectivity**: Use existing furniture lookup patterns to find elevators
3. **Player State**: Leverage existing menu state management (`menuOpen` flag)
4. **Layout Consistency**: Use existing room-floor relationships

### Error States

- **No Corresponding Elevator**: Use existing `positionPlayerInStartingRoom()` fallback pattern
- **Inaccessible Floor**: Reuse existing disabled button patterns from settings modal
- **Invalid Configuration**: Use existing console logging and error handling patterns

## Testing Strategy

### Unit Tests

1. **Floor Filtering Logic**
   - Test existing `rooms.filter(room => room.floor === currentFloor)` patterns
   - Validate elevator furniture detection
   - Test position calculation using existing `roomToWorldCoordinates`

2. **ElevatorConsole Component Tests**
   - Reuse existing modal component test patterns
   - Test gamepad navigation using existing `focusedMenuItem` logic
   - Validate keyboard handling similar to pause menu tests

3. **Integration Tests**
   - Test furniture interaction using existing `handleFurnitureActivation` flow
   - Validate floor transition using existing `renderRooms()` method
   - Test with existing game state management patterns

### User Experience Tests

1. **Navigation Flow**
   - Reuse existing interaction patterns (spacebar, A button, touch)
   - Test menu navigation using existing D-pad/arrow key handling
   - Validate cancel behavior using existing ESC/B button patterns

2. **Input Method Coverage**
   - Leverage existing input handling from `game-page.tsx`
   - Test gamepad navigation using existing controller subscription patterns
   - Validate touch interaction using existing touch control system

## Implementation Phases

### Phase 1: Core Infrastructure
- Extend existing `Game` class with floor management
- Add elevator console furniture type to existing admin furniture system
- Modify existing `renderRooms()` to filter by current floor

### Phase 2: UI Components
- Create ElevatorConsole modal extending existing modal patterns
- Integrate with existing gamepad navigation system
- Reuse existing button styling and focus management

### Phase 3: Game Integration
- Extend existing `handleFurnitureActivation` for elevator detection
- Integrate with existing player positioning system
- Use existing menu state management for elevator UI

### Phase 4: Polish and Testing
- Add transition feedback using existing UI patterns
- Implement error handling using existing logging patterns
- Create tests following existing test structure

## Technical Considerations

### Performance
- Reuse existing room filtering logic (already optimized with `useMemo`)
- Leverage existing furniture lookup patterns
- Use existing rendering optimization in `renderRooms()`

### Accessibility
- Extend existing keyboard navigation patterns
- Reuse existing focus management from pause menu
- Leverage existing mobile-friendly button patterns

### Mobile Optimization
- Use existing touch control integration
- Reuse existing responsive modal patterns
- Leverage existing PWA optimizations

### Backward Compatibility
- No changes to existing furniture schema (use `description` field)
- Existing furniture interaction system remains unchanged
- Existing floor filtering system works without modification
