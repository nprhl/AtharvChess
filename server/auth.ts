import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import type { User } from '@shared/schema';
import type { Express, RequestHandler } from 'express';

// Configure session store
const pgSession = connectPg(session);

export function configureSession() {
  return session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'chess-learning-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });
}

export function configurePassport() {
  // Local strategy for email/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if user has password hash (form-based user) or is Replit user
          if (!user.passwordHash) {
            return done(null, false, { message: 'This account uses Replit login. Please use "Log in with Replit".' });
          }

          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Unified serialization for both auth systems
  passport.serializeUser((user: any, done) => {
    if (user.claims) {
      // Replit Auth user - store the full user object
      done(null, { type: 'replit', data: user });
    } else {
      // Form-based user - store only the ID
      done(null, { type: 'form', data: user.id });
    }
  });

  // Unified deserialization for both auth systems
  passport.deserializeUser(async (serializedUser: any, done) => {
    try {
      // Handle legacy session data that might not have the expected structure
      if (!serializedUser || typeof serializedUser !== 'object') {
        console.warn('Invalid session data format, clearing session');
        return done(null, false);
      }

      if (serializedUser.type === 'replit') {
        // Replit Auth user - return the stored user object
        done(null, serializedUser.data);
      } else if (serializedUser.type === 'form') {
        // Form-based user - fetch from database
        const user = await storage.getUser(serializedUser.data);
        done(null, user);
      } else {
        // Handle legacy session data - assume it's a user ID from old format
        console.warn('Legacy session data detected, attempting to migrate');
        if (typeof serializedUser === 'number' || (typeof serializedUser === 'string' && !isNaN(Number(serializedUser)))) {
          const user = await storage.getUser(Number(serializedUser));
          done(null, user);
        } else {
          console.warn('Unable to deserialize session, clearing');
          done(null, false);
        }
      }
    } catch (error) {
      console.error('Session deserialization error:', error);
      done(null, false); // Clear invalid session instead of throwing error
    }
  });
}

export function setupAuth(app: Express) {
  app.use(configureSession());
  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();
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