import { Store, SessionData } from 'express-session';
import { db } from './db';
import { sessions } from '@shared/schema';
import { eq, lt, and, ne, sql } from 'drizzle-orm';

export interface SecureSessionData extends SessionData {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  lastActivity?: Date;
}

export interface SessionStoreOptions {
  tableName?: string;
  pruneInterval?: number; // ms, default 15 minutes
  maxAge?: number; // ms, default 24 hours
  enableSessionRevocation?: boolean;
  enableActivityTracking?: boolean;
  enableSecurityLogging?: boolean;
}

export class DatabaseSessionStore extends Store {
  private options: Required<SessionStoreOptions>;
  private pruneTimer?: NodeJS.Timeout;

  constructor(options: SessionStoreOptions = {}) {
    super();
    
    this.options = {
      tableName: 'sessions',
      pruneInterval: 15 * 60 * 1000, // 15 minutes
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      enableSessionRevocation: true,
      enableActivityTracking: true,
      enableSecurityLogging: true,
      ...options
    };

    // Start automatic cleanup of expired sessions
    this.startPruning();
    
    console.log('[SessionStore] Database session store initialized with security features');
  }

  // Get session by session ID
  async get(sid: string, callback: (err?: any, session?: SessionData | null) => void): Promise<void> {
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.sid, sid),
            eq(sessions.isRevoked, false) // Ensure session isn't revoked
          )
        )
        .limit(1);

      if (result.length === 0) {
        callback(null, null);
        return;
      }

      const sessionRecord = result[0];
      
      // Check if session is expired
      if (sessionRecord.expire && new Date() > sessionRecord.expire) {
        // Clean up expired session
        await this.destroy(sid, () => {});
        callback(null, null);
        return;
      }

      // Update last activity if tracking is enabled
      if (this.options.enableActivityTracking) {
        await db
          .update(sessions)
          .set({ lastActivity: new Date() })
          .where(eq(sessions.sid, sid));
      }

      const sessionData = sessionRecord.sess as SessionData;
      callback(null, sessionData);

    } catch (error) {
      console.error('[SessionStore] Error getting session:', error);
      callback(error);
    }
  }

  // Set/update session
  async set(sid: string, session: SessionData, callback?: (err?: any) => void): Promise<void> {
    try {
      const expire = this.getExpiryDate(session);
      const now = new Date();
      
      // Extract security metadata from session
      const secureSession = session as SecureSessionData;
      const userId = secureSession.userId || null;
      const ipAddress = secureSession.ipAddress || null;
      const userAgent = secureSession.userAgent || null;

      // Check if session already exists
      const existing = await db
        .select({ sid: sessions.sid })
        .from(sessions)
        .where(eq(sessions.sid, sid))
        .limit(1);

      if (existing.length > 0) {
        // Update existing session
        await db
          .update(sessions)
          .set({
            sess: session,
            expire,
            userId,
            ipAddress,
            userAgent,
            lastActivity: now,
            isRevoked: false // Reset revocation on update
          })
          .where(eq(sessions.sid, sid));
      } else {
        // Create new session
        await db
          .insert(sessions)
          .values({
            sid,
            sess: session,
            expire,
            userId,
            ipAddress,
            userAgent,
            isRevoked: false,
            lastActivity: now,
            createdAt: now
          });
      }

      if (this.options.enableSecurityLogging) {
        console.log(`[SessionStore] Session ${existing.length > 0 ? 'updated' : 'created'}: ${sid} for user: ${userId}`);
      }

      callback?.();
    } catch (error) {
      console.error('[SessionStore] Error setting session:', error);
      callback?.(error);
    }
  }

  // Destroy session
  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      const result = await db
        .delete(sessions)
        .where(eq(sessions.sid, sid));

      if (this.options.enableSecurityLogging) {
        console.log(`[SessionStore] Session destroyed: ${sid}`);
      }

      callback?.();
    } catch (error) {
      console.error('[SessionStore] Error destroying session:', error);
      callback?.(error);
    }
  }

  // Touch session (update expiry)
  async touch(sid: string, session: SessionData, callback?: (err?: any) => void): Promise<void> {
    try {
      const expire = this.getExpiryDate(session);
      
      await db
        .update(sessions)
        .set({ 
          expire,
          lastActivity: new Date()
        })
        .where(eq(sessions.sid, sid));

      callback?.();
    } catch (error) {
      console.error('[SessionStore] Error touching session:', error);
      callback?.(error);
    }
  }

  // Get all session IDs
  async all(callback: (err?: any, sessions?: { [sid: string]: SessionData } | null) => void): Promise<void> {
    try {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.isRevoked, false));

      const sessionMap: { [sid: string]: SessionData } = {};
      
      for (const record of result) {
        // Skip expired sessions
        if (record.expire && new Date() > record.expire) {
          continue;
        }
        sessionMap[record.sid] = record.sess as SessionData;
      }

      callback(null, sessionMap);
    } catch (error) {
      console.error('[SessionStore] Error getting all sessions:', error);
      callback(error);
    }
  }

  // Get session count
  async length(callback: (err?: any, length?: number) => void): Promise<void> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(
          and(
            eq(sessions.isRevoked, false),
            // Only count non-expired sessions
            lt(sql`now()`, sessions.expire) 
          )
        );

      callback(null, result[0]?.count || 0);
    } catch (error) {
      console.error('[SessionStore] Error getting session count:', error);
      callback(error);
    }
  }

  // Clear all sessions
  async clear(callback?: (err?: any) => void): Promise<void> {
    try {
      await db.delete(sessions);
      
      if (this.options.enableSecurityLogging) {
        console.log('[SessionStore] All sessions cleared');
      }

      callback?.();
    } catch (error) {
      console.error('[SessionStore] Error clearing sessions:', error);
      callback?.(error);
    }
  }

  // ==================== SECURITY METHODS ====================

  // Revoke session (security feature)
  async revokeSession(sid: string, reason: string = 'Manual revocation'): Promise<boolean> {
    try {
      const result = await db
        .update(sessions)
        .set({ 
          isRevoked: true,
          lastActivity: new Date()
        })
        .where(eq(sessions.sid, sid));

      if (this.options.enableSecurityLogging) {
        console.log(`[SessionStore] Session revoked: ${sid} - Reason: ${reason}`);
      }

      return true;
    } catch (error) {
      console.error('[SessionStore] Error revoking session:', error);
      return false;
    }
  }

  // Revoke all sessions for a user (security feature)  
  async revokeUserSessions(userId: number, excludeSessionId?: string): Promise<number> {
    try {
      if (excludeSessionId) {
        await db
          .update(sessions)
          .set({ 
            isRevoked: true,
            lastActivity: new Date()
          })
          .where(
            and(
              eq(sessions.userId, userId),
              ne(sessions.sid, excludeSessionId)
            )
          );
      } else {
        await db
          .update(sessions)
          .set({ 
            isRevoked: true,
            lastActivity: new Date()
          })
          .where(eq(sessions.userId, userId));
      }

      if (this.options.enableSecurityLogging) {
        console.log(`[SessionStore] Revoked sessions for user ${userId}, excluded: ${excludeSessionId}`);
      }

      return 1; // Return count of affected sessions
    } catch (error) {
      console.error('[SessionStore] Error revoking user sessions:', error);
      return 0;
    }
  }

  // Get active sessions for a user
  async getUserSessions(userId: number): Promise<Array<{
    sid: string;
    ipAddress: string | null;
    userAgent: string | null;
    lastActivity: Date | null;
    createdAt: Date | null;
  }>> {
    try {
      const result = await db
        .select({
          sid: sessions.sid,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          lastActivity: sessions.lastActivity,
          createdAt: sessions.createdAt
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.isRevoked, false)
          )
        );

      return result.filter(session => {
        // Filter out expired sessions
        return session.lastActivity && new Date().getTime() - session.lastActivity.getTime() < this.options.maxAge;
      });
    } catch (error) {
      console.error('[SessionStore] Error getting user sessions:', error);
      return [];
    }
  }

  // ==================== CLEANUP METHODS ====================

  private startPruning(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
    }

    this.pruneTimer = setInterval(async () => {
      await this.pruneExpiredSessions();
    }, this.options.pruneInterval);
  }

  private async pruneExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      const result = await db
        .delete(sessions)
        .where(
          // Delete expired sessions or old revoked sessions
          lt(sessions.expire, sql`${now}`)
        );

      if (this.options.enableSecurityLogging) {
        console.log(`[SessionStore] Pruned expired sessions at ${now.toISOString()}`);
      }
    } catch (error) {
      console.error('[SessionStore] Error pruning sessions:', error);
    }
  }

  private getExpiryDate(session: SessionData): Date {
    const now = new Date();
    const maxAge = session.cookie?.maxAge || this.options.maxAge;
    return new Date(now.getTime() + maxAge);
  }

  // Cleanup on shutdown
  cleanup(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
  }
}

// Export singleton instance
export const databaseSessionStore = new DatabaseSessionStore({
  enableSessionRevocation: true,
  enableActivityTracking: true,
  enableSecurityLogging: process.env.NODE_ENV !== 'production', // Only log in dev
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  pruneInterval: 15 * 60 * 1000 // Clean up every 15 minutes
});

console.log('[SessionStore] Production-grade database session store loaded');