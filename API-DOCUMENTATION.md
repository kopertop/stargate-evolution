# Stargate Evolution API Documentation

This document provides comprehensive information about the Stargate Evolution API, designed for AI LLMs and developers to integrate with the game's backend systems.

## Overview

The Stargate Evolution API provides access to:
- **Room Templates**: Coordinate-based room layouts for Swift SpriteKit
- **Door Systems**: Precise door positioning and connections
- **Furniture Management**: Room-relative furniture positioning
- **Technology Templates**: Available ship technologies
- **User Management**: Authentication and admin functions

## OpenAPI Specification

The complete API specification is available in:
- **YAML Format**: `openapi.yaml`
- **JSON Format**: `openapi.json` (can be generated from YAML)

### Viewing the Specification

You can view and interact with the API specification using:

1. **Swagger UI** (Online): https://editor.swagger.io/
   - Copy the contents of `openapi.yaml` into the editor

2. **Local Swagger UI**:
   ```bash
   npx swagger-ui-serve openapi.yaml
   ```

3. **Redoc** (Alternative viewer):
   ```bash
   npx redoc-cli serve openapi.yaml
   ```

## Authentication

### 🔓 Public Endpoints (No Authentication Required)

**All template endpoints are PUBLIC** - perfect for Swift clients that don't need authentication:

- `/api/templates/rooms` - All room templates
- `/api/templates/rooms/{roomId}` - Specific room template
- `/api/templates/technology` - All technology templates
- `/api/templates/ship-layouts` - All ship layouts
- `/api/templates/ship-layouts/{layoutId}` - Specific ship layout
- `/api/templates/people` - All person templates
- `/api/templates/races` - All race templates
- `/api/templates/galaxies` - All galaxy templates
- `/api/templates/star-systems` - All star system templates
- `/api/templates/destiny-status` - Destiny status template
- `/api/templates/starting-inventory` - Starting inventory template
- `/api/templates/room-technology/{roomId}` - Technology for specific room

**Authentication endpoints:**
- `/api/auth/google` - Initial Google authentication
- `/api/auth/validate` - Token validation

### 🔒 Admin Endpoints (Authentication Required)

**Only admin endpoints require JWT tokens** with admin privileges:

- `/api/admin/users` - User management
- `/api/admin/rooms` - Room template management
- `/api/admin/doors` - Door template management  
- `/api/admin/furniture` - Room furniture management
- `/api/admin/technologies` - Technology template management
- `/api/admin/room-technology` - Room technology assignments

### Getting a Token (Only for Admin Operations)

1. **Google Authentication**:
   ```bash
   curl -X POST http://localhost:8787/api/auth/google \
     -H "Content-Type: application/json" \
     -d '{"idToken": "your-google-id-token"}'
   ```

2. **Use the returned JWT token for admin operations**:
   ```bash
   curl -H "Authorization: Bearer your-jwt-token" \
     http://localhost:8787/api/admin/users
   ```

## Coordinate System

The API uses **Swift SpriteKit coordinate system**:

- **(0,0)** is at the **center** of the coordinate space
- **Positive X** goes **right**
- **Positive Y** goes **up**
- All measurements in **points** (32-point grid system recommended)

### Room Positioning
```json
{
  "startX": -128,  // Left edge
  "endX": 128,     // Right edge  
  "startY": -64,   // Bottom edge
  "endY": 64,      // Top edge
  "width": 256,    // Calculated: endX - startX
  "height": 128    // Calculated: endY - startY
}
```

### Door Positioning
```json
{
  "x": 0,          // Center X coordinate
  "y": -64,        // Center Y coordinate
  "rotation": 0,   // 0°, 90°, 180°, or 270°
  "width": 32,     // Door width
  "height": 8      // Door height
}
```

### Furniture Positioning
```json
{
  "x": -64,        // X offset from room center
  "y": 0,          // Y offset from room center
  "width": 64,     // Furniture width
  "height": 64     // Furniture height
}
```

## Common Use Cases

### 1. Getting Ship Layout (No Authentication)
```bash
# Get basic Destiny layout - PUBLIC, no auth needed
curl http://localhost:8787/api/templates/ship-layouts/destiny

# Get layout with technology data - PUBLIC, no auth needed
curl "http://localhost:8787/api/templates/ship-layouts/destiny?include_technology=true"
```

### 2. Getting All Room Templates (No Authentication)
```bash
# Get all room templates - PUBLIC, no auth needed
curl http://localhost:8787/api/templates/rooms
```

### 3. Getting Technology Data (No Authentication)
```bash
# Get all technology templates - PUBLIC, no auth needed
curl http://localhost:8787/api/templates/technology
```

### 4. Creating a Room (Admin Only - Authentication Required)
```bash
curl -X POST http://localhost:8787/api/admin/rooms \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new_room_01",
    "name": "New Laboratory",
    "layout_id": "destiny",
    "type": "laboratory",
    "startX": 200,
    "endX": 300,
    "startY": 100,
    "endY": 200,
    "floor": 1
  }'
```

### 5. Adding Furniture to Room (Admin Only - Authentication Required)
```bash
curl -X POST http://localhost:8787/api/admin/furniture \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "gate_room",
    "furniture_type": "stargate",
    "name": "Stargate",
    "x": -64,
    "y": 0,
    "width": 128,
    "height": 128,
    "interactive": true,
    "active": true
  }'
```

### 6. Creating Door Connection (Admin Only - Authentication Required)
```bash
curl -X POST http://localhost:8787/api/admin/doors \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from_room_id": "gate_room",
    "to_room_id": "corridor_01",
    "x": 128,
    "y": 0,
    "rotation": 90,
    "state": "closed",
    "is_automatic": true
  }'
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- **200**: Success
- **400**: Bad Request (validation error)
- **401**: Unauthorized (invalid/missing token) - **Only for admin endpoints**
- **403**: Forbidden (insufficient privileges) - **Only for admin endpoints**
- **404**: Not Found
- **500**: Internal Server Error

## Data Models

### Key Models

1. **RoomTemplate**: Coordinate-positioned rooms
2. **DoorTemplate**: Precise door connections
3. **RoomFurniture**: Room-relative furniture items
4. **TechnologyTemplate**: Available technologies
5. **User**: User accounts and admin status

### Validation Rules

- **Room Coordinates**: `startX < endX` and `startY < endY`
- **Door Rotation**: Must be 0, 90, 180, or 270 degrees
- **Furniture Positioning**: Relative to room center
- **Required Fields**: See OpenAPI schema for each model

## Rate Limiting

Currently no rate limiting is implemented, but consider:
- Reasonable request frequency for admin operations
- Bulk operations for large data sets
- Caching template data (it changes infrequently)

## CORS Support

The API includes CORS headers for browser-based access:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Development Tips

### For Swift Clients

1. **No authentication needed** for template data - just call the endpoints directly
2. **Use the coordinate system correctly** - (0,0) is at center, not top-left
3. **Cache template data** - it doesn't change frequently
4. **Use the 32-point grid system** for consistent positioning

### For AI LLMs

1. **Always validate coordinates** before creating rooms/doors
2. **Use the 32-point grid system** for consistent positioning
3. **Check room connections** when creating doors
4. **Handle authentication properly** for admin operations (only!)
5. **Consider the SpriteKit coordinate system** when calculating positions

### Testing the API

1. **Start the development server**:
   ```bash
   cd packages/backend
   pnpm run dev
   ```

2. **Test public template endpoints (no auth needed)**:
   ```bash
   curl http://localhost:8787/api/templates/rooms
   curl http://localhost:8787/api/templates/technology
   curl http://localhost:8787/api/templates/ship-layouts/destiny
   ```

3. **Test admin endpoints (requires authentication)**:
   ```bash
   # First get a token via Google auth, then:
   curl -H "Authorization: Bearer your-token" \
     http://localhost:8787/api/admin/users
   ```

## Support

For issues or questions:
- Check the OpenAPI specification for detailed schemas
- Review the coordinate system documentation
- Test with the provided curl examples
- **Remember: Template endpoints are public, admin endpoints require authentication**

## Version History

- **v1.0.0**: Initial API specification
  - Room template management
  - Door system with precise positioning
  - Furniture management with room-relative coordinates
  - Technology templates
  - User authentication and admin functions
  - **Public template endpoints** (no authentication required)
  - **Admin endpoints** (authentication required) 
