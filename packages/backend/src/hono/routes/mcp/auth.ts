import { Context } from 'hono';
import * as jose from 'jose';
import { validateUser } from '../../../auth-types';
import type { Env } from '../../../types';
import { MCPSession, MCP_ERROR_CODES } from './types';

const JWT_ISSUER = 'stargate-evolution';

// Session storage for active MCP connections
const activeSessions = new Map<string, MCPSession>();

export async function verifyJwt(token: string, jwtSecret: string) {
  const secret = new TextEncoder().encode(jwtSecret);
  return await jose.jwtVerify(token, secret, { issuer: JWT_ISSUER });
}

export async function authenticateMCPRequest(c: Context<{ Bindings: Env }>): Promise<{
  success: boolean;
  user?: any;
  session?: MCPSession;
  error?: { code: number; message: string };
}> {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: {
          code: MCP_ERROR_CODES.UNAUTHORIZED,
          message: 'Missing or invalid authorization header'
        }
      };
    }

    const token = authHeader.substring(7);
    const { payload } = await verifyJwt(token, c.env.JWT_SECRET);
    
    const userResult = validateUser(payload.user);
    if (!userResult.success) {
      return {
        success: false,
        error: {
          code: MCP_ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid user token'
        }
      };
    }

    const user = userResult.data!;
    
    // Check admin access - MCP tools require admin permissions
    if (!user.is_admin) {
      return {
        success: false,
        error: {
          code: MCP_ERROR_CODES.FORBIDDEN,
          message: 'Admin access required for MCP operations'
        }
      };
    }

    // Create or update MCP session
    const sessionId = `mcp_${user.id}_${Date.now()}`;
    const session: MCPSession = {
      id: sessionId,
      userId: user.id,
      isAdmin: user.is_admin,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    activeSessions.set(sessionId, session);

    console.log(`[MCP-AUTH] User ${user.email} (${user.id}) authenticated for MCP access`);

    return {
      success: true,
      user,
      session,
    };

  } catch (error) {
    console.error('[MCP-AUTH] Authentication failed:', error);
    return {
      success: false,
      error: {
        code: MCP_ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid or expired token'
      }
    };
  }
}

export function updateSessionActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    activeSessions.set(sessionId, session);
  }
}

export function getActiveSession(sessionId: string): MCPSession | undefined {
  return activeSessions.get(sessionId);
}

export function removeSession(sessionId: string): void {
  activeSessions.delete(sessionId);
  console.log(`[MCP-AUTH] Session ${sessionId} removed`);
}

// Cleanup inactive sessions (older than 30 minutes)
export function cleanupInactiveSessions(): void {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > thirtyMinutes) {
      activeSessions.delete(sessionId);
      console.log(`[MCP-AUTH] Cleaned up inactive session ${sessionId}`);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupInactiveSessions, 5 * 60 * 1000);