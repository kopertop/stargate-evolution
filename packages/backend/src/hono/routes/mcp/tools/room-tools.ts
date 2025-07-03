import { Context } from 'hono';
import type { Env } from '../../../../types';
import { MCPTool, MCPToolResult, MCP_ERROR_CODES } from '../types';

// Room management tool definitions
export const ROOM_TOOLS: MCPTool[] = [
  {
    name: 'create_room',
    description: 'Create a new room template in the Stargate game',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier for the room',
        },
        layout_id: {
          type: 'string',
          description: 'Layout ID this room belongs to',
        },
        type: {
          type: 'string',
          description: 'Type of room (e.g., "corridor", "quarters", "bridge")',
        },
        name: {
          type: 'string',
          description: 'Human-readable name for the room',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the room',
        },
        startX: { type: 'number', description: 'Starting X coordinate' },
        endX: { type: 'number', description: 'Ending X coordinate' },
        startY: { type: 'number', description: 'Starting Y coordinate' },
        endY: { type: 'number', description: 'Ending Y coordinate' },
        floor: { type: 'number', description: 'Floor number' },
        width: { type: 'number', description: 'Room width' },
        height: { type: 'number', description: 'Room height' },
        image: {
          type: 'string',
          description: 'Image filename for the room background',
        },
      },
      required: ['id', 'layout_id', 'type', 'name', 'startX', 'endX', 'startY', 'endY', 'floor', 'width', 'height'],
    },
  },
  {
    name: 'update_room',
    description: 'Update an existing room template',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the room to update',
        },
        layout_id: { type: 'string' },
        type: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        startX: { type: 'number' },
        endX: { type: 'number' },
        startY: { type: 'number' },
        endY: { type: 'number' },
        floor: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        image: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_rooms',
    description: 'List all room templates with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        layout_id: {
          type: 'string',
          description: 'Filter by layout ID',
        },
        type: {
          type: 'string',
          description: 'Filter by room type',
        },
        floor: {
          type: 'number',
          description: 'Filter by floor number',
        },
      },
    },
  },
  {
    name: 'get_room_details',
    description: 'Get detailed information about a specific room',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the room to retrieve',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_room',
    description: 'Delete a room template',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the room to delete',
        },
      },
      required: ['id'],
    },
  },
];

// Room tool handlers
export async function handleCreateRoom(
  c: Context<{ Bindings: Env }>,
  params: any
): Promise<MCPToolResult> {
  try {
    // Validate required parameters
    const requiredFields = ['id', 'layout_id', 'type', 'name', 'startX', 'endX', 'startY', 'endY', 'floor', 'width', 'height'];
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        return {
          content: [{
            type: 'text',
            text: `Missing required field: ${field}`,
          }],
          isError: true,
        };
      }
    }

    // Create room using existing admin endpoint logic
    await c.env.DB.prepare(
      'INSERT INTO room_templates (id, layout_id, type, name, description, startX, endX, startY, endY, floor, width, height, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      params.id,
      params.layout_id,
      params.type,
      params.name,
      params.description || null,
      params.startX,
      params.endX,
      params.startY,
      params.endY,
      params.floor,
      params.width,
      params.height,
      params.image || null,
      Date.now(),
      Date.now()
    ).run();

    console.log(`[MCP-ROOM] Created room: ${params.id} (${params.name})`);

    return {
      content: [{
        type: 'text',
        text: `Successfully created room "${params.name}" with ID: ${params.id}`,
      }],
    };

  } catch (error) {
    console.error('[MCP-ROOM] Create room failed:', error);
    return {
      content: [{
        type: 'text',
        text: `Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleUpdateRoom(
  c: Context<{ Bindings: Env }>,
  params: any
): Promise<MCPToolResult> {
  try {
    if (!params.id) {
      return {
        content: [{
          type: 'text',
          text: 'Missing required field: id',
        }],
        isError: true,
      };
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    const updateableFields = ['layout_id', 'type', 'name', 'description', 'startX', 'endX', 'startY', 'endY', 'floor', 'width', 'height', 'image'];
    
    for (const field of updateableFields) {
      if (params[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(params[field]);
      }
    }

    if (updates.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No fields provided to update',
        }],
        isError: true,
      };
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(params.id);

    const query = `UPDATE room_templates SET ${updates.join(', ')} WHERE id = ?`;
    const result = await c.env.DB.prepare(query).bind(...values).run();

    if (result.meta.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: `Room with ID ${params.id} not found`,
        }],
        isError: true,
      };
    }

    console.log(`[MCP-ROOM] Updated room: ${params.id}`);

    return {
      content: [{
        type: 'text',
        text: `Successfully updated room with ID: ${params.id}`,
      }],
    };

  } catch (error) {
    console.error('[MCP-ROOM] Update room failed:', error);
    return {
      content: [{
        type: 'text',
        text: `Failed to update room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleListRooms(
  c: Context<{ Bindings: Env }>,
  params: any
): Promise<MCPToolResult> {
  try {
    let query = 'SELECT * FROM room_templates';
    const conditions: string[] = [];
    const values: any[] = [];

    // Add filters
    if (params.layout_id) {
      conditions.push('layout_id = ?');
      values.push(params.layout_id);
    }
    if (params.type) {
      conditions.push('type = ?');
      values.push(params.type);
    }
    if (params.floor !== undefined) {
      conditions.push('floor = ?');
      values.push(params.floor);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...values).all();
    const rooms = result.results || [];

    console.log(`[MCP-ROOM] Listed ${rooms.length} rooms`);

    return {
      content: [{
        type: 'text',
        text: `Found ${rooms.length} rooms:\n\n${rooms.map((room: any) => 
          `• ${room.name} (${room.id}) - Type: ${room.type}, Floor: ${room.floor}`
        ).join('\n')}`,
      }],
    };

  } catch (error) {
    console.error('[MCP-ROOM] List rooms failed:', error);
    return {
      content: [{
        type: 'text',
        text: `Failed to list rooms: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleGetRoomDetails(
  c: Context<{ Bindings: Env }>,
  params: any
): Promise<MCPToolResult> {
  try {
    if (!params.id) {
      return {
        content: [{
          type: 'text',
          text: 'Missing required field: id',
        }],
        isError: true,
      };
    }

    const result = await c.env.DB.prepare('SELECT * FROM room_templates WHERE id = ?').bind(params.id).first();

    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Room with ID ${params.id} not found`,
        }],
        isError: true,
      };
    }

    console.log(`[MCP-ROOM] Retrieved room details: ${params.id}`);

    return {
      content: [{
        type: 'text',
        text: `Room Details:\n\n` +
          `ID: ${result.id}\n` +
          `Name: ${result.name}\n` +
          `Type: ${result.type}\n` +
          `Layout ID: ${result.layout_id}\n` +
          `Description: ${result.description || 'None'}\n` +
          `Coordinates: (${result.startX}, ${result.startY}) to (${result.endX}, ${result.endY})\n` +
          `Floor: ${result.floor}\n` +
          `Size: ${result.width} x ${result.height}\n` +
          `Image: ${result.image || 'None'}\n` +
          `Created: ${new Date(result.created_at).toLocaleString()}`,
      }],
    };

  } catch (error) {
    console.error('[MCP-ROOM] Get room details failed:', error);
    return {
      content: [{
        type: 'text',
        text: `Failed to get room details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleDeleteRoom(
  c: Context<{ Bindings: Env }>,
  params: any
): Promise<MCPToolResult> {
  try {
    if (!params.id) {
      return {
        content: [{
          type: 'text',
          text: 'Missing required field: id',
        }],
        isError: true,
      };
    }

    // Delete room technology first
    await c.env.DB.prepare('DELETE FROM room_technology WHERE room_id = ?').bind(params.id).run();

    // Delete the room
    const result = await c.env.DB.prepare('DELETE FROM room_templates WHERE id = ?').bind(params.id).run();

    if (result.meta.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: `Room with ID ${params.id} not found`,
        }],
        isError: true,
      };
    }

    console.log(`[MCP-ROOM] Deleted room: ${params.id}`);

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted room with ID: ${params.id}`,
      }],
    };

  } catch (error) {
    console.error('[MCP-ROOM] Delete room failed:', error);
    return {
      content: [{
        type: 'text',
        text: `Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}