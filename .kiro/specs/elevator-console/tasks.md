# Implementation Plan

- [ ] 1. Extend Game class with floor management functionality
  - Add currentFloor property and floor filtering to existing Game class
  - Implement getCurrentFloor() and setCurrentFloor() methods
  - Modify existing renderRooms() method to filter rooms, doors, and furniture by current floor
  - Add getAvailableFloors() method to detect floors from existing room data
  - _Requirements: 1.1, 3.2, 3.3_

- [ ] 2. Create elevator console furniture detection system
  - Extend existing handleFurnitureActivation in FurnitureLayer to detect elevator_console furniture type
  - Add elevator configuration parsing from furniture description field
  - Implement findElevatorPosition() method to locate elevators on target floors using existing roomToWorldCoordinates
  - Add validation for elevator accessibility using existing room filtering patterns
  - _Requirements: 1.1, 1.2, 4.2, 4.4_

- [ ] 3. Build ElevatorConsole modal component
  - Create ElevatorConsole React component extending existing Modal patterns from room-details-modal
  - Implement floor list rendering with current floor highlighting
  - Add disabled state styling for inaccessible floors using existing button patterns
  - Integrate with existing focusedMenuItem state management for navigation
  - _Requirements: 2.1, 2.4, 5.1, 5.2_

- [ ] 4. Implement keyboard and gamepad navigation for elevator menu
  - Extend existing keyboard event handling to support elevator menu navigation
  - Integrate with existing gamepad controller subscription patterns from game-page
  - Add D-pad navigation using existing menu navigation logic (up/down arrow keys)
  - Implement Enter/A button selection and Escape/B button cancellation
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 5. Add touch interaction support for elevator console
  - Extend existing touch control system to support elevator menu interaction
  - Implement tap-to-select functionality for floor options
  - Add touch-friendly button sizing using existing mobile UI patterns
  - Integrate with existing TouchControlManager for consistent behavior
  - _Requirements: 2.1, 2.3_

- [ ] 6. Implement floor transition system
  - Create floor transition logic that updates Game class currentFloor state
  - Implement player repositioning using existing player positioning patterns
  - Add elevator position calculation using existing furniture world coordinate conversion
  - Integrate with existing renderRooms() to update displayed content after floor change
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Add elevator console furniture type to admin panel
  - Extend existing furniture type dropdown in room-builder to include "elevator_console"
  - Add elevator configuration UI for setting accessible floors in furniture modal
  - Implement elevator configuration validation in existing furniture creation workflow
  - Add elevator furniture template with default interactive and positioning settings
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8. Integrate elevator system with existing game interaction flow
  - Connect elevator console detection to existing furniture activation system
  - Add elevator menu state management to existing game menu system (showPause, showSettings pattern)
  - Implement elevator menu opening/closing using existing modal state patterns
  - Add elevator interaction to existing menu navigation state management
  - _Requirements: 1.2, 1.5, 2.5_

- [ ] 9. Add visual feedback and transition effects
  - Implement floor transition visual feedback using existing UI feedback patterns
  - Add elevator menu styling consistent with existing game modal themes
  - Create floor selection confirmation feedback using existing button interaction patterns
  - Add loading state during floor transitions using existing loading patterns
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Create comprehensive test suite for elevator functionality
  - Write unit tests for floor filtering logic using existing test patterns
  - Create component tests for ElevatorConsole modal using existing modal test structure
  - Add integration tests for elevator furniture interaction workflow
  - Test gamepad and keyboard navigation using existing input testing patterns
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 11. Add error handling and edge case management
  - Implement fallback positioning when no corresponding elevator exists on target floor
  - Add error logging for invalid elevator configurations using existing logging patterns
  - Create graceful degradation for single-floor layouts
  - Add validation for elevator furniture placement in admin panel
  - _Requirements: 3.5, 4.4, 2.5_

- [ ] 12. Optimize performance and finalize integration
  - Optimize floor filtering using existing useMemo patterns from room-builder
  - Add elevator position caching to minimize recalculation
  - Integrate elevator system with existing game state persistence
  - Ensure elevator functionality works with existing save/load game system
  - _Requirements: 3.2, 3.3, 1.1_

- [ ] 13. Run type checking and fix any issues
  - Execute `pnpm run check` to validate TypeScript types across all packages
  - Fix any type errors introduced by elevator system implementation
  - Ensure all new interfaces and types are properly exported and imported
  - Validate that existing type contracts are maintained
  - _Requirements: All requirements (code quality and maintainability)_
