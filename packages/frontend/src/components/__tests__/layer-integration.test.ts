import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { DoorsLayer } from '../doors-layer';
import { RoomsLayer } from '../rooms-layer';
import { FurnitureLayer } from '../furniture-layer';
import type { DoorTemplate, RoomTemplate, RoomFurniture } from '@stargate/common';

// Mock PIXI for testing
vi.mock('pixi.js', () => ({
  Container: class MockContainer {
    children: any[] = [];
    addChild = vi.fn();
    removeChildren = vi.fn();
    constructor() {}
  },
  Graphics: class MockGraphics {
    beginFill = vi.fn().mockReturnThis();
    drawRect = vi.fn().mockReturnThis();
    endFill = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
  },
  Sprite: class MockSprite {
    anchor = { set: vi.fn() };
    x = 0;
    y = 0;
    rotation = 0;
    constructor() {}
  },
  Text: class MockText {
    anchor = { set: vi.fn() };
    x = 0;
    y = 0;
    constructor() {}
  },
  Texture: {
    from: vi.fn().mockReturnValue({})
  },
  Assets: {
    load: vi.fn().mockResolvedValue({})
  }
}));

describe('Layer Integration Tests', () => {
  let mockRooms: RoomTemplate[];
  let mockDoors: DoorTemplate[];
  let mockFurniture: RoomFurniture[];

  beforeEach(() => {
    // Mock room data
    mockRooms = [
      {
        id: 'room1',
        name: 'Test Room 1',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
        layout_id: 'layout1',
        type: 'room',
        image: null,
        floor: 1,
        found: true,
        locked: false,
        explored: true,
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'room2',
        name: 'Test Room 2',
        startX: 150,
        startY: 0,
        endX: 250,
        endY: 100,
        layout_id: 'layout1',
        type: 'room',
        image: null,
        floor: 1,
        found: true,
        locked: false,
        explored: true,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    // Mock door data
    mockDoors = [
      {
        id: 'door1',
        name: 'Test Door',
        x: 100,
        y: 50,
        width: 10,
        height: 30,
        rotation: 0,
        state: 'closed',
        from_room_id: 'room1',
        to_room_id: 'room2',
        layout_id: 'layout1',
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    // Mock furniture data
    mockFurniture = [
      {
        id: 'furniture1',
        name: 'Test Table',
        width: 40,
        height: 20,
        x: 25,
        y: 25,
        rotation: 0,
        power_required: 0,
        room_id: 'room1',
        furniture_type: 'table',
        interactive: true,
        active: false,
        blocks_movement: true,
        image: {
          default: '/test-table.png',
          active: '/test-table-active.png'
        },
        z: 0,
        discovered: true,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];
  });

  describe('DoorsLayer', () => {
    let doorsLayer: DoorsLayer;

    beforeEach(() => {
      doorsLayer = new DoorsLayer();
    });

    it('should initialize with empty doors array', () => {
      expect(doorsLayer.getDoors()).toEqual([]);
    });

    it('should set and get doors correctly', () => {
      doorsLayer.setDoors(mockDoors);
      expect(doorsLayer.getDoors()).toHaveLength(1);
      expect(doorsLayer.getDoors()[0].id).toBe('door1');
    });

    it('should find door by ID', () => {
      doorsLayer.setDoors(mockDoors);
      const door = doorsLayer.findDoor('door1');
      expect(door).toBeDefined();
      expect(door?.name).toBe('Test Door');
    });

    it('should activate doors correctly', () => {
      doorsLayer.setDoors(mockDoors);
      doorsLayer.setRooms(mockRooms);
      
      const result = doorsLayer.activateDoor('door1');
      expect(result).toBe(true);
      
      const door = doorsLayer.findDoor('door1');
      expect(door?.state).toBe('opened');
    });

    it('should handle door collision detection', () => {
      doorsLayer.setDoors(mockDoors);
      doorsLayer.setRooms(mockRooms);
      
      // Test collision at door position
      const collidingDoor = doorsLayer.findCollidingDoor(100, 50, 10);
      expect(collidingDoor).toBeDefined();
      expect(collidingDoor?.id).toBe('door1');
      
      // Test no collision far from door
      const noCollision = doorsLayer.findCollidingDoor(200, 200, 10);
      expect(noCollision).toBeNull();
    });
  });

  describe('RoomsLayer', () => {
    let roomsLayer: RoomsLayer;

    beforeEach(() => {
      roomsLayer = new RoomsLayer();
    });

    it('should initialize with empty rooms array', () => {
      expect(roomsLayer.getRooms()).toEqual([]);
    });

    it('should set and get rooms correctly', () => {
      roomsLayer.setRooms(mockRooms);
      expect(roomsLayer.getRooms()).toHaveLength(2);
    });

    it('should find room containing point', () => {
      roomsLayer.setRooms(mockRooms);
      
      // Point inside room1
      const room1 = roomsLayer.findRoomContainingPoint(50, 50);
      expect(room1?.id).toBe('room1');
      
      // Point inside room2
      const room2 = roomsLayer.findRoomContainingPoint(200, 50);
      expect(room2?.id).toBe('room2');
      
      // Point outside any room
      const noRoom = roomsLayer.findRoomContainingPoint(300, 300);
      expect(noRoom).toBeNull();
    });

    it('should find room with threshold correctly', () => {
      roomsLayer.setRooms(mockRooms);
      
      // Point near edge but within threshold
      const roomWithThreshold = roomsLayer.findRoomContainingPointWithThreshold(10, 10, 5);
      expect(roomWithThreshold?.id).toBe('room1');
      
      // Point too close to edge with threshold
      const noRoomWithThreshold = roomsLayer.findRoomContainingPointWithThreshold(5, 5, 10);
      expect(noRoomWithThreshold).toBeNull();
    });

    it('should calculate camera center point', () => {
      roomsLayer.setRooms(mockRooms);
      
      const center = roomsLayer.getCameraCenterPoint();
      expect(center).toBeDefined();
      expect(center?.x).toBe(125); // Center between rooms
      expect(center?.y).toBe(50);
    });

    it('should find safe positions in room', () => {
      roomsLayer.setRooms(mockRooms);
      
      const safePositions = roomsLayer.findSafePositionInRoom(50, 50, 10, 15);
      expect(safePositions.length).toBeGreaterThan(0);
      
      // All positions should be within room bounds minus threshold
      safePositions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(15);
        expect(pos.x).toBeLessThanOrEqual(85);
        expect(pos.y).toBeGreaterThanOrEqual(15);
        expect(pos.y).toBeLessThanOrEqual(85);
      });
    });
  });

  describe('FurnitureLayer', () => {
    let furnitureLayer: FurnitureLayer;
    let stateChangeCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      stateChangeCallback = vi.fn();
      furnitureLayer = new FurnitureLayer({
        onFurnitureStateChange: stateChangeCallback
      });
    });

    it('should initialize with empty furniture array', () => {
      expect(furnitureLayer.getFurniture()).toEqual([]);
    });

    it('should set furniture and rooms correctly', () => {
      furnitureLayer.setFurniture(mockFurniture);
      furnitureLayer.setRooms(mockRooms);
      
      expect(furnitureLayer.getFurniture()).toHaveLength(1);
      expect(furnitureLayer.getFurniture()[0].id).toBe('furniture1');
    });

    it('should handle furniture collision detection', () => {
      furnitureLayer.setFurniture(mockFurniture);
      furnitureLayer.setRooms(mockRooms);
      
      // Test collision at furniture position (room center + furniture offset)
      const collidingFurniture = furnitureLayer.findCollidingFurniture(75, 75, 10);
      expect(collidingFurniture).toBeDefined();
      expect(collidingFurniture?.id).toBe('furniture1');
      
      // Test no collision far from furniture
      const noCollision = furnitureLayer.findCollidingFurniture(200, 200, 10);
      expect(noCollision).toBeNull();
    });

    it('should handle furniture activation', () => {
      furnitureLayer.setFurniture(mockFurniture);
      furnitureLayer.setRooms(mockRooms);
      
      // Activate furniture near its position
      furnitureLayer.handleFurnitureActivation(75, 75);
      
      // Check that furniture state changed
      const furniture = furnitureLayer.getFurniture()[0];
      expect(furniture.active).toBe(true);
      
      // Check that callback was called
      expect(stateChangeCallback).toHaveBeenCalledWith('furniture1', 'active');
    });

    it('should not activate non-interactive furniture', () => {
      // Make furniture non-interactive
      const nonInteractiveFurniture = { ...mockFurniture[0], interactive: false };
      furnitureLayer.setFurniture([nonInteractiveFurniture]);
      furnitureLayer.setRooms(mockRooms);
      
      furnitureLayer.handleFurnitureActivation(75, 75);
      
      // State should not change
      const furniture = furnitureLayer.getFurniture()[0];
      expect(furniture.active).toBe(false);
      expect(stateChangeCallback).not.toHaveBeenCalled();
    });
  });

  describe('Layer Integration', () => {
    let roomsLayer: RoomsLayer;
    let doorsLayer: DoorsLayer;
    let furnitureLayer: FurnitureLayer;

    beforeEach(() => {
      roomsLayer = new RoomsLayer();
      doorsLayer = new DoorsLayer();
      furnitureLayer = new FurnitureLayer();
      
      // Initialize all layers with test data
      roomsLayer.setRooms(mockRooms);
      doorsLayer.setDoors(mockDoors);
      doorsLayer.setRooms(mockRooms);
      furnitureLayer.setFurniture(mockFurniture);
      furnitureLayer.setRooms(mockRooms);
    });

    it('should maintain consistent room references across layers', () => {
      const roomFromRoomsLayer = roomsLayer.findRoom('room1');
      // DoorsLayer doesn't have findRoom method, it gets rooms via setRooms
      const door = doorsLayer.findDoor('door1');
      const doorExists = door !== undefined;
      
      expect(roomFromRoomsLayer).toBeDefined();
      expect(doorExists).toBe(true);
      expect(roomFromRoomsLayer?.id).toBe('room1');
    });

    it('should handle coordinate system consistently', () => {
      // All layers should use the same coordinate system
      const roomCenter = { x: 50, y: 50 }; // Center of room1
      
      // Room should contain this point
      const containingRoom = roomsLayer.findRoomContainingPoint(roomCenter.x, roomCenter.y);
      expect(containingRoom?.id).toBe('room1');
      
      // Door should be at edge between rooms
      const door = doorsLayer.findDoor('door1');
      expect(door?.x).toBe(100); // At room boundary
      
      // Furniture should be positioned relative to room
      const furniture = furnitureLayer.getFurniture()[0];
      expect(furniture.room_id).toBe('room1');
    });

    it('should handle complex collision scenarios', () => {
      // Test point that might collide with multiple objects
      const testX = 85; // Near furniture and room edge
      const testY = 75;
      const playerRadius = 10;
      
      // Check room containment
      const room = roomsLayer.findRoomContainingPoint(testX, testY);
      expect(room?.id).toBe('room1');
      
      // Check furniture collision
      const collidingFurniture = furnitureLayer.findCollidingFurniture(testX, testY, playerRadius);
      expect(collidingFurniture?.id).toBe('furniture1');
      
      // Check door collision (should be null at this position)
      const collidingDoor = doorsLayer.findCollidingDoor(testX, testY, playerRadius);
      expect(collidingDoor).toBeNull();
    });
  });
});