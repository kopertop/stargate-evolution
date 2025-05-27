-- Seed ship layout templates extracted from game-service.ts
-- This contains the complete Destiny ship layout with room positions and connections

INSERT INTO ship_layouts (
  id, name, description, layout_data
) VALUES (
  'destiny_layout',
  'Destiny Ship Layout',
  'Complete room layout for the Ancient ship Destiny with all floors, connections, and door requirements.',
  '{
    "rooms": [
      {
        "template_id": "gate_room_large",
        "position": { "x": -1, "y": -1, "floor": 0 },
        "initial_state": { "found": true, "locked": false, "explored": false },
        "connections": ["corridor_north", "corridor_south", "corridor_east", "corridor_west"]
      },
      {
        "template_id": "corridor_basic",
        "id": "corridor_north",
        "position": { "x": 0, "y": 2, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["gate_room", "bridge"]
      },
      {
        "template_id": "corridor_basic",
        "id": "corridor_south",
        "position": { "x": 0, "y": -2, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["gate_room", "damaged_corridor", "elevator_main"]
      },
      {
        "template_id": "corridor_basic",
        "id": "corridor_east",
        "position": { "x": 2, "y": 0, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["gate_room", "medical_bay", "quarters_a"]
      },
      {
        "template_id": "corridor_basic",
        "id": "corridor_west",
        "position": { "x": -2, "y": 0, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["gate_room", "mess_hall", "quarters_b"]
      },
      {
        "template_id": "bridge_command",
        "id": "bridge",
        "position": { "x": -1, "y": 3, "floor": 0 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["corridor_north"]
      },
      {
        "template_id": "corridor_emergency",
        "id": "damaged_corridor",
        "position": { "x": -1, "y": -4, "floor": 0 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["corridor_south", "destroyed_storage"]
      },
      {
        "template_id": "storage_destroyed",
        "id": "destroyed_storage",
        "position": { "x": 0, "y": -4, "floor": 0 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["damaged_corridor"]
      },
      {
        "template_id": "medical_bay_standard",
        "id": "medical_bay",
        "position": { "x": 3, "y": -1, "floor": 0 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["corridor_east"]
      },
      {
        "template_id": "mess_hall_standard",
        "id": "mess_hall",
        "position": { "x": -3, "y": -1, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["corridor_west"]
      },
      {
        "template_id": "quarters_standard",
        "id": "quarters_a",
        "position": { "x": 2, "y": 1, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["corridor_east"]
      },
      {
        "template_id": "quarters_standard",
        "id": "quarters_b",
        "position": { "x": -2, "y": -1, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["corridor_west"]
      },
      {
        "template_id": "elevator_main",
        "id": "elevator_main",
        "position": { "x": 1, "y": -2, "floor": 0 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["corridor_south", "upper_corridor", "lower_corridor"]
      },
      {
        "template_id": "corridor_basic",
        "id": "upper_corridor",
        "position": { "x": 0, "y": 0, "floor": 1 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["elevator_main", "engineering"]
      },
      {
        "template_id": "engineering_main",
        "id": "engineering",
        "position": { "x": -1, "y": -1, "floor": 1 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["upper_corridor"]
      },
      {
        "template_id": "corridor_basic",
        "id": "lower_corridor",
        "position": { "x": 1, "y": -2, "floor": -1 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["elevator_main", "hydroponics", "storage_bay", "shuttle_bay"]
      },
      {
        "template_id": "hydroponics_bay",
        "id": "hydroponics",
        "position": { "x": -1, "y": -2, "floor": -1 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["lower_corridor"]
      },
      {
        "template_id": "storage_bay_standard",
        "id": "storage_bay",
        "position": { "x": 2, "y": -3, "floor": -1 },
        "initial_state": { "found": false, "locked": false, "explored": false },
        "connections": ["lower_corridor"]
      },
      {
        "template_id": "shuttle_bay_main",
        "id": "shuttle_bay",
        "position": { "x": 3, "y": -3, "floor": -1 },
        "initial_state": { "found": false, "locked": true, "explored": false },
        "connections": ["lower_corridor"]
      }
    ],
    "doors": [
      {
        "from": "gate_room",
        "to": "corridor_north",
        "template_id": "basic_door",
        "initial_state": "closed",
        "description": "Northern corridor access"
      },
      {
        "from": "gate_room",
        "to": "corridor_south",
        "template_id": "basic_door",
        "initial_state": "closed",
        "description": "Southern corridor access"
      },
      {
        "from": "gate_room",
        "to": "corridor_east",
        "template_id": "basic_door",
        "initial_state": "closed",
        "description": "Eastern corridor access"
      },
      {
        "from": "gate_room",
        "to": "corridor_west",
        "template_id": "basic_door",
        "initial_state": "closed",
        "description": "Western corridor access"
      },
      {
        "from": "corridor_north",
        "to": "bridge",
        "template_id": "code_locked_door",
        "initial_state": "locked",
        "description": "Bridge command center - Code required",
        "requirements": [
          {
            "type": "code",
            "value": "bridge_access_code",
            "description": "Bridge requires an access code found in the ship command protocols",
            "met": false
          }
        ]
      },
      {
        "from": "corridor_south",
        "to": "damaged_corridor",
        "template_id": "emergency_door",
        "initial_state": "locked",
        "description": "Damaged corridor - DANGER: Atmospheric breach detected"
      },
      {
        "from": "corridor_east",
        "to": "medical_bay",
        "template_id": "biometric_door",
        "initial_state": "locked",
        "description": "Medical bay - Biometric lock",
        "requirements": [
          {
            "type": "technology",
            "value": "medical_scanner",
            "description": "Medical bay requires functional scanner systems",
            "met": false
          }
        ]
      },
      {
        "from": "elevator_main",
        "to": "upper_corridor",
        "template_id": "power_door",
        "initial_state": "locked",
        "description": "Upper levels - Full power required",
        "requirements": [
          {
            "type": "power_level",
            "value": "100",
            "description": "Elevator to upper levels requires full power",
            "met": false
          },
          {
            "type": "technology",
            "value": "elevator_controls",
            "description": "Elevator systems must be operational",
            "met": false
          }
        ]
      },
      {
        "from": "elevator_main",
        "to": "lower_corridor",
        "template_id": "power_door",
        "initial_state": "locked",
        "description": "Lower levels - Power required",
        "requirements": [
          {
            "type": "power_level",
            "value": "75",
            "description": "Elevator to lower levels requires significant power",
            "met": false
          },
          {
            "type": "technology",
            "value": "elevator_controls",
            "description": "Elevator systems must be operational",
            "met": false
          }
        ]
      },
      {
        "from": "lower_corridor",
        "to": "hydroponics",
        "template_id": "environmental_door",
        "initial_state": "locked",
        "description": "Hydroponics bay - Environmental lock",
        "requirements": [
          {
            "type": "story_progress",
            "value": "food_shortage",
            "description": "Access to hydroponics is critical during food shortages",
            "met": false
          },
          {
            "type": "technology",
            "value": "air_recycling",
            "description": "Hydroponics requires functioning life support systems",
            "met": false
          }
        ]
      },
      {
        "from": "lower_corridor",
        "to": "shuttle_bay",
        "template_id": "damaged_door",
        "initial_state": "locked",
        "description": "Shuttle bay - Damaged door",
        "requirements": [
          {
            "type": "item",
            "value": "shuttle_repair_kit",
            "description": "Shuttle bay door is damaged and requires repair",
            "met": false
          },
          {
            "type": "crew_skill",
            "value": "pilot_certification",
            "description": "Shuttle bay requires qualified pilot access",
            "met": false
          }
        ]
      }
    ]
  }'
);
