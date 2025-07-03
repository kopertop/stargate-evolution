import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env, User } from '../../types';
import { 
  MCPMessage, 
  MCPCapabilities, 
  MCPTool, 
  MCPToolResult,
  MCP_ERROR_CODES,
  MCP_METHODS 
} from './mcp/types';
import { authenticateMCPRequest, updateSessionActivity } from './mcp/auth';
import { 
  createSSEStream, 
  createSSEHeaders, 
  sendSSEMessage, 
  broadcastToSession,
  getActiveConnectionCount 
} from './mcp/sse';

// Import tool definitions and handlers
import { 
  ROOM_TOOLS,
  handleCreateRoom,
  handleUpdateRoom,
  handleListRooms,
  handleGetRoomDetails,
  handleDeleteRoom
} from './mcp/tools/room-tools';

const mcp = new Hono<{ Bindings: Env; Variables: { user: User; sessionId: string } }>();

// Apply CORS middleware
mcp.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// MCP Server capabilities
const SERVER_CAPABILITIES: MCPCapabilities = {
  tools: {
    listChanged: false,
  },
  resources: {
    subscribe: false,
    listChanged: false,
  },
  prompts: {
    listChanged: false,
  },
  logging: {},
};

// All available tools
const ALL_TOOLS: MCPTool[] = [
  ...ROOM_TOOLS,
  // Future tool categories will be added here
];

// Health check endpoint
mcp.get('/health', (c) => {
  return c.json({ 
    ok: true, 
    message: 'MCP server is healthy',
    activeConnections: getActiveConnectionCount(),
    availableTools: ALL_TOOLS.length,
  });
});

// SSE endpoint for MCP communication
mcp.get('/connect', async (c) => {
  console.log('[MCP] New connection attempt');
  
  // Authenticate the request
  const authResult = await authenticateMCPRequest(c);
  if (!authResult.success) {
    return c.json({
      error: authResult.error
    }, authResult.error?.code === MCP_ERROR_CODES.FORBIDDEN ? 403 : 401);
  }

  const { user, session } = authResult;
  c.set('user', user!);
  c.set('sessionId', session!.id);

  console.log(`[MCP] Authenticated connection for user ${user!.email}`);

  // Create SSE stream
  const stream = createSSEStream(session!);
  
  return new Response(stream, {
    headers: createSSEHeaders(),
  });
});

// Handle MCP protocol messages via POST
mcp.post('/message', async (c) => {
  try {
    // Authenticate the request
    const authResult = await authenticateMCPRequest(c);
    if (!authResult.success) {
      return c.json({
        error: authResult.error
      }, authResult.error?.code === MCP_ERROR_CODES.FORBIDDEN ? 403 : 401);
    }

    const { user, session } = authResult;
    updateSessionActivity(session!.id);

    // Parse the MCP message
    const message: MCPMessage = await c.req.json();
    console.log(`[MCP] Received message:`, message);

    // Handle the message based on method
    const response = await handleMCPMessage(c, message);
    
    // Send response via SSE if it's a notification, otherwise return JSON
    if (message.type === 'request') {
      return c.json(response);
    } else {
      // For notifications, just acknowledge
      return c.json({ success: true });
    }

  } catch (error) {
    console.error('[MCP] Message handling failed:', error);
    return c.json({
      error: {
        code: MCP_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to process message',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

async function handleMCPMessage(
  c: Context<{ Bindings: Env; Variables: { user: User; sessionId: string } }>,
  message: MCPMessage
): Promise<MCPMessage> {
  try {
    switch (message.method) {
      case MCP_METHODS.INITIALIZE:
        return {
          id: message.id,
          type: 'response',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: SERVER_CAPABILITIES,
            serverInfo: {
              name: 'Stargate Evolution MCP Server',
              version: '1.0.0',
            },
          },
        };

      case MCP_METHODS.TOOLS_LIST:
        return {
          id: message.id,
          type: 'response',
          result: {
            tools: ALL_TOOLS,
          },
        };

      case MCP_METHODS.TOOLS_CALL:
        const toolResult = await handleToolCall(c, message.params);
        return {
          id: message.id,
          type: 'response',
          result: toolResult,
        };

      default:
        return {
          id: message.id,
          type: 'response',
          error: {
            code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
            message: `Method not found: ${message.method}`,
          },
        };
    }
  } catch (error) {
    console.error(`[MCP] Error handling method ${message.method}:`, error);
    return {
      id: message.id,
      type: 'response',
      error: {
        code: MCP_ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

async function handleToolCall(
  c: Context<{ Bindings: Env; Variables: { user: User; sessionId: string } }>,
  params: any
): Promise<MCPToolResult> {
  const { name, arguments: args } = params;
  
  console.log(`[MCP] Tool call: ${name} with args:`, args);

  try {
    switch (name) {
      // Room management tools
      case 'create_room':
        return await handleCreateRoom(c, args);
      case 'update_room':
        return await handleUpdateRoom(c, args);
      case 'list_rooms':
        return await handleListRooms(c, args);
      case 'get_room_details':
        return await handleGetRoomDetails(c, args);
      case 'delete_room':
        return await handleDeleteRoom(c, args);

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`[MCP] Tool ${name} execution failed:`, error);
    return {
      content: [{
        type: 'text',
        text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export default mcp;