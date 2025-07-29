# Stargate Evolution API Documentation

## Base URL
- **Development**: `http://localhost:8787`
- **Production**: `https://api.stargate-evolution.com`

## Authentication

The API supports multiple authentication methods:

### 1. JWT Bearer Token
```
Authorization: Bearer <jwt_token>
```

### 2. API Keys
```
Authorization: Bearer sk-<api_key>
```

### 3. Google OAuth
OAuth 2.0 authentication with Google is available for user login.

## API Structure

All API endpoints are prefixed with `/api`. The API is organized into the following main sections:

- `/api/auth` - Authentication and user management
- `/api/data` - Public game data (rooms, furniture, templates, etc.)
- `/api/games` - Saved game management (requires authentication)
- `/api/admin` - Administrative operations (requires admin privileges)
- `/api/status` - Health checks and system status
- `/api/upload` - File upload operations (requires authentication)
- `/api/mcp` - Model Context Protocol server integration (requires admin)

---

## Authentication Endpoints (`/api/auth`)

### POST `/api/auth/login`
User login with email/password or Google OAuth.

**Request Body (Email/Password):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Request Body (Google OAuth):**
```json
{
  "googleToken": "<google_oauth_token>"
}
```

**Response:**
```json
{
  "token": "<jwt_token>",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "user@example.com",
    "is_admin": false,
    "created_at": 1672531200
  }
}
```

### POST `/api/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "<jwt_token>",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "user@example.com",
    "is_admin": false,
    "created_at": 1672531200
  }
}
```

### GET `/api/auth/me`
Get current user information (requires authentication).

**Response:**
```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "user@example.com",
  "is_admin": false,
  "created_at": 1672531200
}
```

### POST `/api/auth/api-keys`
Generate a new API key (requires authentication).

**Request Body:**
```json
{
  "name": "My API Key",
  "description": "For mobile app access"
}
```

**Response:**
```json
{
  "key": "sk-1234567890abcdef",
  "name": "My API Key",
  "description": "For mobile app access",
  "created_at": 1672531200
}
```

### GET `/api/auth/api-keys`
List user's API keys (requires authentication).

**Response:**
```json
[
  {
    "id": "key123",
    "name": "My API Key",
    "description": "For mobile app access",
    "key_preview": "sk-123...def",
    "created_at": 1672531200,
    "last_used": null
  }
]
```

### DELETE `/api/auth/api-keys/:id`
Delete an API key (requires authentication).

**Response:**
```json
{
  "success": true
}
```

---

## Data Endpoints (`/api/data`)

Public endpoints for game data that don't require authentication.

### GET `/api/data/health`
Health check for data service.

**Response:**
```json
{
  "ok": true,
  "message": "Templates route is healthy"
}
```

### GET `/api/data/rooms`
Get all room instances.

**Response:**
```json
[
  {
    "id": "destiny_gate_room",
    "layout_id": "destiny",
    "template_id": "gate-room-template",
    "name": "Gate Room",
    "type": "gate_room",
    "description": "Central chamber housing Stargate facilities",
    "startX": 384,
    "endX": 1216,
    "startY": 608,
    "endY": 1152,
    "floor": 15,
    "found": true,
    "locked": false,
    "explored": true,
    "created_at": 1672531200,
    "updated_at": 1672531200
  }
]
```

### GET `/api/data/room-templates`
Get all room templates.

**Response:**
```json
[
  {
    "id": "gate-room-template",
    "layout_id": "destiny",
    "type": "gate_room",
    "name": "Gate Room Template",
    "description": "Central chamber template for housing Stargate facilities",
    "default_width": 800,
    "default_height": 400,
    "image": "stargate-room.png",
    "category": "command",
    "placement_requirements": "{\"requires_central_location\":true,\"needs_large_clearance\":true}",
    "compatible_layouts": "[\"destiny\",\"atlantis\",\"earth\"]",
    "tags": "[\"stargate\",\"central\",\"transport\",\"command\"]",
    "version": "1.0",
    "is_active": true,
    "created_at": 1672531200,
    "updated_at": 1672531200
  }
]
```

### GET `/api/data/doors`
Get all doors.

**Response:**
```json
[
  {
    "id": "gate_room_to_corridor_1",
    "from_room_id": "destiny_gate_room",
    "to_room_id": "destiny_corridor_1",
    "x": 800,
    "y": 1152,
    "state": "open",
    "created_at": 1672531200,
    "updated_at": 1672531200
  }
]
```

### GET `/api/data/doors/room/:id`
Get doors connected to a specific room.

**Parameters:**
- `id` - Room ID

**Response:**
```json
[
  {
    "id": "gate_room_to_corridor_1",
    "from_room_id": "destiny_gate_room",
    "to_room_id": "destiny_corridor_1",
    "x": 800,
    "y": 1152,
    "state": "open"
  }
]
```

### GET `/api/data/furniture`
Get all furniture instances.

**Response:**
```json
[
  {
    "id": "stargate_gate_room_1",
    "template_id": "stargate",
    "room_id": "destiny_gate_room",
    "name": "Stargate",
    "x": 800,
    "y": 880,
    "width": 400,
    "height": 400,
    "interactive": true,
    "blocks_movement": true,
    "state": "active"
  }
]
```

### GET `/api/data/furniture/:id`
Get specific furniture by ID.

### GET `/api/data/furniture-templates`
Get all furniture templates.

**Response:**
```json
[
  {
    "id": "stargate",
    "name": "Stargate",
    "furniture_type": "stargate",
    "description": "Ancient ring-shaped portal device",
    "category": "ancient_technology",
    "default_width": 400,
    "default_height": 400,
    "default_interactive": true,
    "default_blocks_movement": true,
    "image": "/images/furniture/stargate.png",
    "compatible_room_types": "gate_room",
    "created_at": 1672531200,
    "updated_at": 1672531200
  }
]
```

### GET `/api/data/furniture-templates/:id`
Get specific furniture template.

### GET `/api/data/furniture-templates/category/:category`
Get furniture templates by category.

### GET `/api/data/furniture-templates/type/:type`
Get furniture templates by type.

### POST `/api/data/furniture-templates`
Create new furniture template.

### PUT `/api/data/furniture-templates/:id`
Update furniture template.

### DELETE `/api/data/furniture-templates/:id`
Delete furniture template.

### GET `/api/data/furniture-templates/search/:query`
Search furniture templates.

### GET `/api/data/characters`
Get all character templates.

### GET `/api/data/characters/:id`
Get specific character template.

### GET `/api/data/technologies`
Get all technology templates.

### GET `/api/data/technologies/:id`
Get specific technology template.

### GET `/api/data/races`
Get all race templates.

### GET `/api/data/persons` / `/api/data/people`
Get all person templates.

### GET `/api/data/galaxies`
Get all galaxy templates.

### GET `/api/data/galaxies/:id`
Get specific galaxy template.

### GET `/api/data/star-systems`
Get all star system templates.

### GET `/api/data/starting-inventory`
Get default starting inventory items.

**Response:**
```json
[
  {
    "id": "radio",
    "name": "Tactical Radio",
    "type": "communication",
    "description": "Basic team communication device",
    "quantity": 1
  }
]
```

---

## Games Endpoints (`/api/games`)

All endpoints require authentication.

### GET `/api/games`
Get all saved games for the authenticated user.

**Response:**
```json
[
  {
    "id": "game123",
    "user_id": "user123",
    "name": "My Destiny Mission",
    "description": "First mission on Destiny",
    "game_data": "{\"currentRoom\":\"destiny_gate_room\",\"inventory\":[]}",
    "created_at": 1672531200,
    "updated_at": 1672531200
  }
]
```

### POST `/api/games`
Create a new saved game.

**Request Body:**
```json
{
  "name": "My New Game",
  "description": "Starting a new adventure",
  "game_data": "{\"currentRoom\":\"destiny_gate_room\",\"inventory\":[]}"
}
```

### GET `/api/games/:id`
Get specific saved game.

### PUT `/api/games/:id`
Update saved game.

**Request Body:**
```json
{
  "name": "Updated Game Name",
  "description": "Updated description",
  "game_data": "{\"currentRoom\":\"destiny_corridor_1\",\"inventory\":[\"radio\"]}"
}
```

### DELETE `/api/games/:id`
Delete saved game.

**Response:**
```json
{
  "success": true
}
```

---

## Admin Endpoints (`/api/admin`)

All endpoints require admin authentication.

### GET `/api/admin/users`
Get all users.

**Response:**
```json
[
  {
    "id": "user123",
    "name": "John Doe",
    "email": "user@example.com",
    "is_admin": false,
    "created_at": 1672531200
  }
]
```

### DELETE `/api/admin/users/:id`
Delete a user.

### GET `/api/admin/doors`
Get all doors (admin view with additional metadata).

### POST `/api/admin/doors`
Create a new door.

**Request Body:**
```json
{
  "id": "new_door_1",
  "from_room_id": "destiny_gate_room",
  "to_room_id": "destiny_corridor_2",
  "x": 900,
  "y": 1000,
  "state": "closed"
}
```

### PUT `/api/admin/doors/:id`
Update door.

### DELETE `/api/admin/doors/:id`
Delete door.

### GET `/api/admin/room-templates`
Get all room templates (admin view).

### POST `/api/admin/room-templates`
Create room template.

### PUT `/api/admin/room-templates/:id`
Update room template.

### DELETE `/api/admin/room-templates/:id`
Delete room template.

### GET `/api/admin/characters`
Get all character templates (admin view).

### POST `/api/admin/characters`
Create character template.

### PUT `/api/admin/characters/:id`
Update character template.

### DELETE `/api/admin/characters/:id`
Delete character template.

### POST `/api/admin/sql/debug`
Execute SQL query for debugging (admin only, SELECT statements only).

**Request Body:**
```json
{
  "query": "SELECT * FROM rooms LIMIT 10",
  "limit": 50
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "destiny_gate_room",
      "name": "Gate Room",
      "floor": 15
    }
  ],
  "rowCount": 1,
  "query": "SELECT * FROM rooms LIMIT 10"
}
```

---

## Upload Endpoints (`/api/upload`)

All endpoints require authentication.

### POST `/api/upload/image`
Upload an image to CloudFlare R2 storage.

**Request:**
- Content-Type: `multipart/form-data`
- Form Fields:
  - `file`: Image file (required)
  - `folder`: Target folder (optional, default: "general")
  - `bucket`: Target bucket (optional, default: "stargate-universe")

**Response:**
```json
{
  "success": true,
  "url": "https://pub-abc123.r2.dev/general/1672531200-xyz789.jpg",
  "filename": "1672531200-xyz789.jpg",
  "key": "general/1672531200-xyz789.jpg"
}
```

**Validation:**
- File must be an image (MIME type starts with `image/`)
- Maximum file size: 10MB
- Generates unique filename with timestamp and random suffix

### DELETE `/api/upload/image/:key`
Delete an image from storage.

**Parameters:**
- `key`: URL-encoded file key

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### GET `/api/upload/files`
List uploaded files.

**Query Parameters:**
- `folder`: Filter by folder (optional)
- `limit`: Maximum results (optional, default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "key": "general/1672531200-xyz789.jpg",
      "url": "https://pub-abc123.r2.dev/general/1672531200-xyz789.jpg",
      "filename": "1672531200-xyz789.jpg",
      "size": 245760,
      "lastModified": "2023-01-01T00:00:00.000Z",
      "contentType": "image/jpeg",
      "originalName": "screenshot.jpg"
    }
  ],
  "total": 1,
  "truncated": false
}
```

---

## Status Endpoints (`/api/status`)

### GET `/api/status`
Get system status and health information.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "name": "@stargate-evolution/backend",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

## MCP Endpoints (`/api/mcp`)

Model Context Protocol integration for AI agents. Requires admin authentication.

### ALL `/api/mcp/*`
MCP server endpoints for AI integration.

**Available MCP Tools:**
- `greet`: Test MCP connection
- `get-game-sessions`: List active game sessions
- `get-templates`: Query game templates by type
- `system-status`: Get system status and database health
- `execute-sql-query`: Execute read-only SQL queries
- `list-all-rooms`: List rooms by floor with coordinates
- `list-all-doors`: List doors with floor connections
- `inspect-database-schema`: Show table schemas
- `create-technology-template`: Create new technology template
- `create-furniture-template`: Create new furniture template
- `create-room-template`: Create new room template
- `list-furniture-templates`: List all furniture templates

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE", // Optional
  "details": {} // Optional additional details
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Database Schema

The API operates on the following main tables:

### Core Tables
- `users`: User accounts and authentication
- `saved_games`: User's saved game sessions
- `api_keys`: User API keys for authentication

### Room & Spatial Data
- `rooms`: Room instances (formerly room_templates)
- `room_templates`: Room templates for creating new rooms
- `doors`: Connections between rooms
- `furniture`: Furniture instances in rooms
- `furniture_templates`: Templates for creating furniture

### Game Content
- `character_templates`: Character definitions
- `person_templates`: Person/NPC definitions
- `technology_templates`: Technology and research items
- `race_templates`: Species and race definitions
- `galaxy_templates`: Galaxy-wide settings
- `star_system_templates`: Star system definitions

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended for production use.

## CORS Policy

CORS is enabled for all origins with the following configuration:
- Allowed Methods: All HTTP methods
- Allowed Headers: All headers
- Credentials: Supported

## Authentication Flow

1. **Registration/Login**: POST to `/api/auth/register` or `/api/auth/login`
2. **Receive JWT**: Store the returned JWT token
3. **API Requests**: Include JWT in Authorization header: `Bearer <token>`
4. **API Keys**: Alternative to JWT, generate via `/api/auth/api-keys`

## WebSocket Support

Currently not implemented, but room for future real-time features.