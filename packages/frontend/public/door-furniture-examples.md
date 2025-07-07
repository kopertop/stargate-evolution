# Door Furniture System - Examples

The new door furniture system allows creating interactive doors that split in the middle when opened/closed. Here are example configurations for the furniture templates admin interface:

## TOP Orientation Door (Horizontal Split)

**Furniture Template Configuration:**
- **Name**: "Horizontal Split Door"
- **Type**: `door`
- **Category**: "doors"
- **Description**: Leave empty for default or use JSON config:
  ```json
  {
    "door_config": {
      "orientation": "TOP",
      "overlap": 5,
      "split_distance": 60
    }
  }
  ```
- **Size**: Width: 80, Height: 40
- **Rotation**: 0 (for TOP orientation)
- **Interactive**: true
- **Blocks Movement**: true
- **Active by Default**: false (closed)
- **Images**:
  - **left**: `/images/doors/door-left.png`
  - **right**: `/images/doors/door-right.png`

## SIDE Orientation Door (Vertical Split)

**Furniture Template Configuration:**
- **Name**: "Vertical Split Door" 
- **Type**: `door`
- **Category**: "doors"
- **Description**: 
  ```json
  {
    "door_config": {
      "orientation": "SIDE",
      "overlap": 5,
      "split_distance": 60
    }
  }
  ```
- **Size**: Width: 40, Height: 80
- **Rotation**: 90 (for SIDE orientation)
- **Interactive**: true
- **Blocks Movement**: true
- **Active by Default**: false (closed)
- **Images**:
  - **left**: `/images/doors/door-left.png`
  - **right**: `/images/doors/door-right.png`

## How It Works

1. **Door States**: 
   - `active: false` = Door is CLOSED (sprites overlap)
   - `active: true` = Door is OPEN (sprites separated)

2. **Orientations**:
   - **TOP** (rotation 0°): Door splits horizontally (left/right movement)
   - **SIDE** (rotation 90°): Door splits vertically (up/down movement)

3. **Animation**: Smooth 300ms animation between open/closed states

4. **Interaction**: Player can activate doors with E/Enter/Space when nearby (25px radius)

5. **Configuration Options** (in description JSON):
   - `orientation`: "TOP" or "SIDE" (auto-detected from rotation)
   - `overlap`: Pixels of overlap when closed (default: 5)
   - `split_distance`: Pixels of separation when open (default: 40)

## Usage in Game

1. Create door furniture templates using the admin interface
2. Add door furniture to rooms using the room builder
3. In game mode, walk near a door and press E/Enter/Space to toggle
4. Doors animate smoothly between open/closed states
5. Door state persists in the game data

## Required Images

The system expects two door sprite images:
- `door-left.png`: Left half of the door
- `door-right.png`: Right half of the door (should be flipped version of left)

These images should be designed to overlap slightly when closed to prevent visible gaps.