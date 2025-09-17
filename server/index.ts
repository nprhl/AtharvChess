import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeStorage } from "./storage";

const app = express();

// Security Headers with Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for components
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections for HMR
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
    reportOnly: process.env.NODE_ENV === 'development' // Report-only in development
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility with some features
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Parse cookies for CSRF protection
app.use(cookieParser());

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' })); // Prevent large payloads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password', 'passwordHash', 'resetToken', 'token', 'secret', 'key',
  'apiKey', 'privateKey', 'sessionId', 'refreshToken', 'accessToken',
  'authorization', 'cookie', 'cookies', 'ssn', 'creditCard', 'cvv'
];

// Sanitize response data to remove sensitive fields
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log sanitized response data, never sensitive fields
      if (capturedJsonResponse) {
        const sanitizedResponse = sanitizeLogData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize storage with graceful fallback - don't block app startup
  let databaseAvailable = false;
  try {
    await initializeStorage();
    console.log('Database storage initialized successfully');
    databaseAvailable = true;
  } catch (error: any) {
    console.warn('Database unavailable - continuing with limited functionality');
    console.warn('Core features (chess game, TTS, AI analysis) will work normally');
    console.warn('Database features (accounts, lessons, tournaments) will be disabled');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
