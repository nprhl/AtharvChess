import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import { storage } from './storage';
import type { User } from '@shared/schema';
import type { Express, RequestHandler, Request } from 'express';
import { databaseSessionStore, type SecureSessionData } from './session-store';

// Configure secure session with database store
export function configureSession() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    store: databaseSessionStore,
    secret: process.env.SESSION_SECRET || 'chess-learning-app-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    },
    // Session regeneration security
    genid: () => {
      // Generate cryptographically secure session ID
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    },
  });
}

export function configurePassport() {
  // Local strategy for email/password login with enhanced security
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true, // Pass request object for security context
      },
      async (req, email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if user has password hash
          if (!user.passwordHash) {
            return done(null, false, { message: 'Invalid account - no password set.' });
          }

          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Store security context in session
          const secureSessionData = {
            userId: user.id,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            createdAt: new Date(),
            lastActivity: new Date()
          };

          // Add security data to request for session storage
          (req as any).secureSessionData = secureSessionData;

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialization for form-based auth only
  passport.serializeUser((user: any, done) => {
    // Form-based user - store only the ID
    done(null, user.id);
  });

  // Deserialization for form-based auth only
  passport.deserializeUser(async (userId: any, done) => {
    try {
      // Handle different session data formats
      let actualUserId: number;
      
      if (typeof userId === 'object' && userId.type === 'form') {
        // Legacy format: {type: 'form', data: userId}
        actualUserId = userId.data;
      } else if (typeof userId === 'number') {
        // Direct user ID
        actualUserId = userId;
      } else if (typeof userId === 'string' && !isNaN(Number(userId))) {
        // String user ID
        actualUserId = Number(userId);
      } else {
        console.warn('Invalid session data format, clearing session');
        return done(null, false);
      }

      const user = await storage.getUser(actualUserId);
      done(null, user);
    } catch (error) {
      console.error('Session deserialization error:', error);
      done(null, false); // Clear invalid session instead of throwing error
    }
  });
}

// Session regeneration middleware for security
export const sessionRegenerationMiddleware: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.session) {
    // Regenerate session ID on login to prevent session fixation
    if ((req as any).sessionRegenerated !== true) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return next(err);
        }
        
        // Store security metadata
        const secureData = (req as any).secureSessionData;
        if (secureData) {
          Object.assign(req.session, secureData);
        }
        
        (req as any).sessionRegenerated = true;
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
};

export function setupAuth(app: Express) {
  // Configure session middleware with security settings
  app.use(configureSession());
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Add session regeneration middleware
  app.use(sessionRegenerationMiddleware);
  
  // Configure passport strategies
  configurePassport();
  
  console.log('[Auth] Enhanced authentication system initialized with database sessions');
}

// Middleware to ensure user is authenticated
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Middleware to get current user (optional auth)
export const getCurrentUser: RequestHandler = (req, res, next) => {
  (req as any).currentUser = req.user as User | undefined;
  next();
};

// Utility functions
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}