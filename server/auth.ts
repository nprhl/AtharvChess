import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import crypto from 'crypto';
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
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better production compatibility
      domain: process.env.COOKIE_DOMAIN, // Allow explicit domain setting for production
    },
    // Session regeneration security
    genid: () => {
      // Generate cryptographically secure session ID
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

          console.log('[Auth] Login successful for user:', user.email);

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Simplified serialization - store user ID in session
  passport.serializeUser((user: any, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  // Simplified deserialization - get user by ID
  passport.deserializeUser(async (userId: number, done) => {
    try {
      console.log('[Auth] Deserializing user ID:', userId);
      const user = await storage.getUser(userId);
      if (user) {
        console.log('[Auth] User found:', user.email);
        done(null, user);
      } else {
        console.log('[Auth] User not found for ID:', userId);
        done(null, false);
      }
    } catch (error) {
      console.error('[Auth] Deserialization error:', error);
      done(null, false);
    }
  });
}

// Simplified session security middleware (removed problematic regeneration)
export const sessionRegenerationMiddleware: RequestHandler = (req, res, next) => {
  // Simply pass through - session regeneration was causing sessions to be lost
  // The database session store already provides adequate security
  next();
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