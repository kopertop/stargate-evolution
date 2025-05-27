# Database Template Migration Plan

## Overview
Migrate from hardcoded game initialization data to template-based data storage in the backend (Cloudflare D1). Templates will be stored in the backend database and fetched via API when creating new games.

## Current State Analysis

### Frontend (WatermelonDB)
- Game-specific data with `game_id` foreign keys
- Hardcoded initialization in `game-service.ts` (~1300 lines)
- Models: Game, Room, Person, Ship, Technology, Race, etc.

### Backend (Cloudflare D1)
- Currently only has `users` table for authentication
- No game data storage yet
- Uses wrangler D1 with migrations

## Template Architecture Plan

### 1. Template Tables (Backend D1)
Create template tables without `game_id` - these are the "definitions":

#### Core Template Tables
- `room_templates` - Room types, layouts, technology
- `person_templates` - Crew member archetypes 
- `ship_templates` - Ship configurations
- `technology_templates` - Technology definitions
- `race_templates` - Race characteristics
- `galaxy_templates` - Galaxy layouts
- `star_system_templates` - Star system configurations
- `planet_templates` - Planet types
- `stargate_templates` - Stargate configurations

#### Layout & Relationship Templates
- `ship_layouts` - Complete ship room layouts with connections
- `door_templates` - Door types and requirements
- `crew_assignments` - Default crew-to-room assignments

### 2. Template Schema Design

#### room_templates
```sql
CREATE TABLE room_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'corridor', 'bridge', 'quarters', etc.
  name TEXT NOT NULL,
  description TEXT,
  grid_width INTEGER NOT NULL,
  grid_height INTEGER NOT NULL,
  technology TEXT, -- JSON array of tech IDs
  image TEXT,
  base_exploration_time INTEGER DEFAULT 2,
  default_status TEXT DEFAULT 'ok', -- 'ok', 'damaged', 'destroyed'
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);
```

#### person_templates
```sql
CREATE TABLE person_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  race_template_id TEXT,
  skills TEXT, -- JSON array
  description TEXT,
  image TEXT,
  default_location TEXT, -- JSON for initial location
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (race_template_id) REFERENCES race_templates(id)
);
```

#### ship_layouts
```sql
CREATE TABLE ship_layouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 'destiny_layout', 'atlantis_layout'
  description TEXT,
  layout_data TEXT, -- JSON with complete room layout and connections
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);
```

#### door_templates
```sql
CREATE TABLE door_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  requirements TEXT, -- JSON array of requirement objects
  default_state TEXT DEFAULT 'closed', -- 'closed', 'opened', 'locked'
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);
```

### 3. Migration Tasks

#### Phase 1: Backend Infrastructure
- [x] **Task 1.1**: Create migration system for backend
  - Set up `migrations/` directory
  - Create initial migration scripts
  - Add migration runner to package.json

- [x] **Task 1.2**: Create template table schemas
  - Design and create all template tables
  - Add proper indexes and foreign keys
  - Include audit fields (created_at, updated_at)

#### Phase 2: Data Extraction & Seeding
- [x] **Task 2.1**: Extract hardcoded data from game-service.ts
  - Extract room definitions → room_templates
  - Extract crew data → person_templates  
  - Extract ship layout → ship_layouts
  - Extract door requirements → door_templates

- [x] **Task 2.2**: Create seed migration files
  - `003_seed_room_templates.sql`
  - `004_seed_person_templates.sql`
  - `005_seed_ship_layouts.sql`
  - `006_seed_door_templates.sql`
  - Race templates included in person templates migration

#### Phase 3: Backend API Development
- [ ] **Task 3.1**: Create template API endpoints
  - `GET /api/templates/rooms` - Get all room templates
  - `GET /api/templates/people` - Get all person templates
  - `GET /api/templates/ship-layouts` - Get ship layout templates
  - `GET /api/templates/ship-layouts/:id` - Get specific layout
  - `GET /api/templates/doors` - Get door templates

- [ ] **Task 3.2**: Create game initialization endpoint
  - `POST /api/games/initialize` - Create new game from templates
  - Accept template IDs and customization parameters
  - Return complete game data structure

#### Phase 4: Frontend Integration
- [ ] **Task 4.1**: Create template service in frontend
  - Add API client for template endpoints
  - Cache template data locally
  - Handle template fetching errors

- [ ] **Task 4.2**: Refactor game-service.ts
  - Replace hardcoded data with template API calls
  - Maintain same interface for game creation
  - Add template-based room/crew generation

#### Phase 5: Advanced Features
- [ ] **Task 5.1**: Template customization
  - Allow multiple ship layouts
  - Support custom crew configurations
  - Enable difficulty-based variations

- [ ] **Task 5.2**: Template versioning
  - Add version field to templates
  - Support template updates without breaking existing games
  - Migration path for template changes

## Data Migration Strategy

### Current Hardcoded Data → Templates

#### Room Data Extraction
From game-service.ts lines 200-600, extract:
```typescript
// Current hardcoded room creation
const corridorNorth = await this.database.get<Room>('rooms').create((room) => {
  room.type = 'corridor';
  room.gridWidth = 1;
  room.gridHeight = 1;
  room.technology = JSON.stringify(['lighting', 'atmosphere_sensors']);
  // ... more properties
});

// Becomes template:
{
  id: 'corridor_basic',
  type: 'corridor', 
  name: 'Basic Corridor',
  grid_width: 1,
  grid_height: 1,
  technology: ['lighting', 'atmosphere_sensors'],
  image: 'corridor.png'
}
```

#### Ship Layout Extraction
Extract the complete Destiny layout with:
- Room positions and connections
- Door states and requirements  
- Floor layouts
- Technology assignments

#### Crew Template Extraction
From defaultCrew array, create person_templates:
```typescript
// Current hardcoded crew
{
  name: 'Colonel Young',
  role: 'commanding_officer', 
  skills: ['leadership', 'military_tactics', 'weapons'],
  description: '...',
  image: 'colonel-young.png'
}

// Becomes template (same structure, different table)
```

## API Design

### Template Endpoints

#### GET /api/templates/ship-layouts/destiny
```json
{
  "id": "destiny_layout",
  "name": "Destiny Ship Layout",
  "description": "Ancient ship Destiny complete room layout",
  "layout_data": {
    "rooms": [
      {
        "template_id": "gate_room_large",
        "position": { "x": -1, "y": -1, "floor": 0 },
        "connections": ["corridor_north", "corridor_south"],
        "initial_state": { "found": true, "locked": false }
      }
    ],
    "doors": [
      {
        "from": "gate_room",
        "to": "corridor_north", 
        "template_id": "basic_door",
        "initial_state": "closed"
      }
    ]
  }
}
```

#### GET /api/templates/people/crew
```json
[
  {
    "id": "colonel_young",
    "name": "Colonel Young",
    "role": "commanding_officer",
    "race_template_id": "human",
    "skills": ["leadership", "military_tactics", "weapons"],
    "description": "Commanding officer...",
    "image": "colonel-young.png",
    "default_location": { "shipId": "destiny" }
  }
]
```

### Game Initialization API

#### POST /api/games/initialize
```json
{
  "ship_layout_id": "destiny_layout",
  "crew_template_ids": ["colonel_young", "eli_wallace", "dr_rush"],
  "difficulty": "normal",
  "customizations": {
    "starting_power": 800,
    "crew_modifications": {
      "colonel_young": { "skills": ["leadership", "military_tactics"] }
    }
  }
}
```

Response:
```json
{
  "game_id": "generated_game_id",
  "rooms": [...],
  "people": [...], 
  "ship_status": {...},
  "initial_state": {...}
}
```

## Implementation Priority

### High Priority (Phase 1-2)
1. Backend migration system setup
2. Template table creation
3. Room template extraction and seeding
4. Basic template API endpoints

### Medium Priority (Phase 3-4)  
1. Complete API development
2. Frontend template service
3. Game service refactoring
4. Ship layout templates

### Low Priority (Phase 5)
1. Advanced customization features
2. Template versioning
3. Multiple ship layouts
4. Difficulty variations

## Success Criteria

### Phase 1 Complete
- [ ] Backend has migration system
- [ ] All template tables created
- [ ] Basic seed data loaded

### Phase 2 Complete  
- [ ] All hardcoded data extracted to templates
- [ ] Seed migrations populate all templates
- [ ] Template data matches current game generation

### Phase 3 Complete
- [ ] Template API endpoints functional
- [ ] Game initialization API working
- [ ] Frontend can fetch templates

### Phase 4 Complete
- [ ] Game service uses templates instead of hardcoded data
- [ ] New games generate identically to current system
- [ ] No breaking changes to existing functionality

## Risk Mitigation

### Data Consistency
- Validate template data matches current hardcoded values
- Add comprehensive tests for template → game conversion
- Maintain backward compatibility during transition

### Performance
- Cache templates in frontend
- Optimize template queries with proper indexes
- Consider template bundling for initial game creation

### Complexity Management
- Start with simple room templates
- Gradually migrate more complex data (ship layouts, door requirements)
- Maintain clear separation between templates and game instances

## File Structure Changes

### Backend (packages/backend)
```
src/
├── index.ts (existing)
├── auth-types.ts (existing)  
├── types.ts (existing)
├── templates/
│   ├── room-templates.ts
│   ├── person-templates.ts
│   ├── ship-layouts.ts
│   └── game-initialization.ts
└── migrations/
    ├── 001_create_users.sql
    ├── 002_create_template_tables.sql
    ├── 003_seed_room_templates.sql
    ├── 004_seed_person_templates.sql
    ├── 005_seed_ship_layouts.sql
    └── 006_seed_door_templates.sql
```

### Frontend (packages/db)
```
src/
├── services/
│   ├── game-service.ts (refactored)
│   └── template-service.ts (new)
└── models/ (unchanged)
```

## Next Steps

1. **Start with Task 1.1**: Set up backend migration system
2. **Create initial template tables** (Task 1.2)
3. **Extract room data first** as it's the most straightforward (Task 2.1)
4. **Build basic template API** for rooms (Task 3.1)
5. **Test template → game conversion** with rooms only

This phased approach allows for incremental development and testing while maintaining system stability. 
