import { NextRequest, NextResponse } from 'next/server';
import { SupportAccessService } from '@/lib/supportAccessService';

const supportAccessService = SupportAccessService.getInstance();

export interface AuditLogMiddlewareOptions {
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
}

/**
 * Middleware to automatically log audit events for support access actions
 */
export function createAuditLogMiddleware(options: AuditLogMiddlewareOptions) {
  return async (req: NextRequest, res: NextResponse, next: () => void) => {
    const startTime = Date.now();
    
    try {
      // Extract session information from headers or token
      const authHeader = req.headers.get('authorization');
      let sessionId: string | undefined;
      let adminUserId: string | undefined;
      let targetUserId: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Check if this is a scoped token
        const validation = await supportAccessService.validateScopedToken(token);
        if (validation.is_valid) {
          sessionId = validation.session_id;
          adminUserId = validation.admin_user_id;
          targetUserId = validation.target_user_id;
        }
      }

      // Execute the original request
      await next();

      // Log audit event after successful request
      if (sessionId && adminUserId) {
        await supportAccessService.logAuditEvent({
          session_id: sessionId,
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          action_type: options.actionType,
          resource_type: options.resourceType,
          resource_id: options.resourceId,
          details: {
            ...options.details,
            request_duration_ms: Date.now() - startTime,
            method: req.method,
            url: req.url,
            user_agent: req.headers.get('user-agent'),
          },
          ip_address: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent'),
        });
      }
    } catch (error) {
      console.error('Audit logging middleware error:', error);
      // Don't fail the request if audit logging fails
    }
  };
}

/**
 * Higher-order function to wrap API routes with audit logging
 */
export function withAuditLogging(
  handler: (req: NextRequest, res: NextResponse) => Promise<NextResponse>,
  options: AuditLogMiddlewareOptions
) {
  return async (req: NextRequest, res: NextResponse) => {
    const auditMiddleware = createAuditLogMiddleware(options);
    
    return new Promise((resolve, reject) => {
      auditMiddleware(req, res, () => {
        handler(req, res)
          .then(resolve)
          .catch(reject);
      });
    });
  };
}

/**
 * Express middleware for audit logging
 */
export function expressAuditLogMiddleware(options: AuditLogMiddlewareOptions) {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    try {
      // Extract session information from headers
      const authHeader = req.headers.authorization;
      let sessionId: string | undefined;
      let adminUserId: string | undefined;
      let targetUserId: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Check if this is a scoped token
        const validation = await supportAccessService.validateScopedToken(token);
        if (validation.is_valid) {
          sessionId = validation.session_id;
          adminUserId = validation.admin_user_id;
          targetUserId = validation.target_user_id;
        }
      }

      // Store session info in request for later use
      req.supportAccessSession = {
        sessionId,
        adminUserId,
        targetUserId,
      };

      // Execute the original request
      await next();

      // Log audit event after successful request
      if (sessionId && adminUserId) {
        await supportAccessService.logAuditEvent({
          session_id: sessionId,
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          action_type: options.actionType,
          resource_type: options.resourceType,
          resource_id: options.resourceId,
          details: {
            ...options.details,
            request_duration_ms: Date.now() - startTime,
            method: req.method,
            url: req.url,
            user_agent: req.headers['user-agent'],
          },
          ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          user_agent: req.headers['user-agent'],
        });
      }
    } catch (error) {
      console.error('Audit logging middleware error:', error);
      // Don't fail the request if audit logging fails
    }
  };
}

/**
 * Utility function to log custom audit events
 */
export async function logCustomAuditEvent(
  sessionId: string,
  adminUserId: string,
  actionType: string,
  details?: any,
  targetUserId?: string,
  resourceType?: string,
  resourceId?: string
) {
  try {
    await supportAccessService.logAuditEvent({
      session_id: sessionId,
      admin_user_id: adminUserId,
      target_user_id: targetUserId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
  } catch (error) {
    console.error('Error logging custom audit event:', error);
  }
}

/**
 * Token revocation service
 */
export class TokenRevocationService {
  private static instance: TokenRevocationService;
  private revokedTokens: Set<string> = new Set();

  public static getInstance(): TokenRevocationService {
    if (!TokenRevocationService.instance) {
      TokenRevocationService.instance = new TokenRevocationService();
    }
    return TokenRevocationService.instance;
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const validation = await supportAccessService.validateScopedToken(token);
      if (!validation.is_valid || !validation.session_id) {
        return false;
      }

      // Revoke the token in the database
      const { error } = await supportAccessService.supabase
        .from('scoped_tokens')
        .update({ is_revoked: true })
        .eq('session_id', validation.session_id);

      if (error) {
        console.error('Error revoking token:', error);
        return false;
      }

      // Add to local cache for immediate effect
      this.revokedTokens.add(token);
      
      return true;
    } catch (error) {
      console.error('Error in revokeToken:', error);
      return false;
    }
  }

  /**
   * Revoke all tokens for a session
   */
  async revokeSessionTokens(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supportAccessService.supabase
        .from('scoped_tokens')
        .update({ is_revoked: true })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error revoking session tokens:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in revokeSessionTokens:', error);
      return false;
    }
  }

  /**
   * Check if a token is revoked
   */
  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  /**
   * Clean up expired tokens from memory
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const cleanedCount = await supportAccessService.cleanupExpiredSessions();
      
      // Clear local cache periodically
      this.revokedTokens.clear();
      
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}

/**
 * Scheduled cleanup job for expired sessions and tokens
 */
export class SupportAccessCleanupJob {
  private static instance: SupportAccessCleanupJob;
  private intervalId: NodeJS.Timeout | null = null;

  public static getInstance(): SupportAccessCleanupJob {
    if (!SupportAccessCleanupJob.instance) {
      SupportAccessCleanupJob.instance = new SupportAccessCleanupJob();
    }
    return SupportAccessCleanupJob.instance;
  }

  /**
   * Start the cleanup job
   */
  start(intervalMinutes: number = 5) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        const tokenService = TokenRevocationService.getInstance();
        const cleanedCount = await tokenService.cleanupExpiredTokens();
        
        if (cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${cleanedCount} expired support access sessions`);
        }
      } catch (error) {
        console.error('Error in support access cleanup job:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Support access cleanup job started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop the cleanup job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Support access cleanup job stopped');
    }
  }
}
