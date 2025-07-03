import { Context } from 'hono';
import { MCPMessage, MCPSession } from './types';

// Connection management for SSE streams
const activeConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  session: MCPSession;
}>();

export function createSSEStream(session: MCPSession): ReadableStream {
  return new ReadableStream({
    start(controller) {
      // Store the connection
      activeConnections.set(session.id, {
        controller,
        session,
      });

      console.log(`[MCP-SSE] SSE stream started for session ${session.id}`);

      // Send initial connection confirmation
      sendSSEMessage(controller, {
        type: 'notification',
        method: 'connection/established',
        params: {
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        },
      });
    },

    cancel() {
      // Clean up when connection closes
      activeConnections.delete(session.id);
      console.log(`[MCP-SSE] SSE stream closed for session ${session.id}`);
    },
  });
}

export function sendSSEMessage(
  controller: ReadableStreamDefaultController,
  message: MCPMessage
): void {
  try {
    const data = JSON.stringify(message);
    const sseData = `data: ${data}\n\n`;
    controller.enqueue(new TextEncoder().encode(sseData));
  } catch (error) {
    console.error('[MCP-SSE] Failed to send SSE message:', error);
  }
}

export function broadcastToSession(sessionId: string, message: MCPMessage): boolean {
  const connection = activeConnections.get(sessionId);
  if (connection) {
    sendSSEMessage(connection.controller, message);
    return true;
  }
  return false;
}

export function broadcastToAllSessions(message: MCPMessage): number {
  let count = 0;
  for (const [sessionId, connection] of activeConnections.entries()) {
    try {
      sendSSEMessage(connection.controller, message);
      count++;
    } catch (error) {
      console.error(`[MCP-SSE] Failed to broadcast to session ${sessionId}:`, error);
      // Remove failed connection
      activeConnections.delete(sessionId);
    }
  }
  return count;
}

export function getActiveConnectionCount(): number {
  return activeConnections.size;
}

export function getActiveConnections(): string[] {
  return Array.from(activeConnections.keys());
}

export function closeConnection(sessionId: string): boolean {
  const connection = activeConnections.get(sessionId);
  if (connection) {
    try {
      connection.controller.close();
    } catch (error) {
      console.error(`[MCP-SSE] Error closing connection ${sessionId}:`, error);
    }
    activeConnections.delete(sessionId);
    return true;
  }
  return false;
}

// Utility function to create SSE headers
export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}