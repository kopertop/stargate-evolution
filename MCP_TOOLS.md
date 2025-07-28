# Stargate Evolution MCP Database Tools

I've enhanced the Stargate Evolution MCP server with powerful database querying tools to help debug the door/room hypothesis and other game data issues.

## New Tools Added

### 1. `execute-sql-query`
Execute raw SQL queries on the database (read-only for safety).

**Parameters:**
- `query` (required): The SQL SELECT statement to execute
- `limit` (optional): Maximum rows to return (default: 50, max: 1000)

**Safety Features:**
- Only SELECT statements allowed
- Blocks dangerous keywords (DROP, DELETE, INSERT, etc.)
- Automatic LIMIT clause if not specified
- Results formatted as readable tables

**Example Usage:**
```sql
SELECT * FROM room_templates WHERE floor = 1
```

### 2. `list-all-rooms`
List all rooms with their floor assignments and coordinates.

**Parameters:**
- `layout_id` (optional): Filter by layout (default: "destiny_ship")
- `floor` (optional): Filter by specific floor number

**Output:** Rooms grouped by floor with coordinates and types.

### 3. `list-all-doors`
List all doors with their room connections and floor information.

**Parameters:**
- `layout_id` (optional): Filter by layout (default: "destiny_ship") 
- `floor` (optional): Show doors connecting to specific floor

**Output:** 
- Same-floor doors grouped by floor
- Inter-floor doors (like elevators/stairs)
- Connection details with room names and floors

### 4. `inspect-database-schema`
Show database table schemas and relationships.

**Parameters:**
- `table_name` (optional): Specific table to inspect (shows all if not specified)

**Output:** Table schemas with column types, constraints, and defaults.

## Verifying the Door Hypothesis

To test the hypothesis that Floor 1 has no doors, you can now use:

1. **Check rooms on Floor 1:**
   ```
   list-all-rooms with floor=1
   ```

2. **Check doors connecting to Floor 1:**
   ```
   list-all-doors with floor=1
   ```

3. **Raw query for detailed door analysis:**
   ```
   execute-sql-query with query="SELECT d.*, r1.name as from_room, r1.floor as from_floor, r2.name as to_room, r2.floor as to_floor FROM doors d LEFT JOIN room_templates r1 ON d.from_room_id = r1.id LEFT JOIN room_templates r2 ON d.to_room_id = r2.id WHERE r1.floor = 1 OR r2.floor = 1"
   ```

4. **Check if any doors exist at all:**
   ```
   execute-sql-query with query="SELECT COUNT(*) as total_doors FROM doors"
   ```

## Access Requirements

- **Admin authentication required** for all MCP tools
- Backend server must be running on localhost:8787
- Valid JWT token needed (obtained through game login)

## Technical Implementation

The tools are implemented in `packages/backend/src/hono/routes/mcp.ts` with:
- Type-safe parameter handling using Zod schemas
- SQL injection prevention through parameterized queries
- Formatted table output for readability
- Comprehensive error handling
- Safety restrictions for database modifications

These tools should definitively answer whether the door rendering issue is due to missing door data in the database or a filtering bug in the frontend code.
