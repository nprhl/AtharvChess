# Chess Learning App - Security Documentation

## Overview

This document establishes security guardrails for the Chess Learning App, designed for solo development with AI assistance. It provides practical, implementable security measures for protecting user data, maintaining system integrity, and responding to security incidents.

## Threat Model

### Threat Actors

**Anonymous Users**
- **Capabilities**: Registration, login attempts, public endpoint access
- **Motivations**: Account creation, legitimate access, potential reconnaissance
- **Mitigations**: Rate limiting, input validation, CAPTCHA for repeated failures

**Authenticated Children (Ages 6-17)**
- **Capabilities**: Game play, lesson access, progress tracking, limited profile changes
- **Motivations**: Learning chess, accessing age-appropriate content
- **Mitigations**: Content filtering, restricted data access, parental controls

**Authenticated Parents**
- **Capabilities**: Child account management, progress monitoring, payment processing
- **Motivations**: Monitoring child progress, managing subscriptions
- **Mitigations**: Strong authentication, encrypted PII, payment tokenization

**Administrators**
- **Capabilities**: Full system access, user management, system configuration
- **Motivations**: System maintenance, user support, content moderation
- **Mitigations**: Multi-factor authentication, audit logging, least privilege access

**External Attackers**
- **Capabilities**: Internet-based attacks, automated tools, social engineering
- **Motivations**: Data theft, service disruption, financial gain, reputation damage
- **Mitigations**: WAF, DDoS protection, security monitoring, incident response

### Protected Assets

**User Accounts**
- Authentication credentials (password hashes, session tokens)
- Personal information (email, username, age verification)
- Account preferences and settings

**Progress Data**
- Chess game histories and move sequences
- Learning analytics and skill assessments
- Lesson completion and performance metrics

**System Tokens**
- API keys (OpenAI, third-party services)
- Database connection strings
- Encryption keys and secrets

**Business Logic**
- Chess AI algorithms and configurations
- Lesson content and educational materials
- User analytics and behavioral patterns

## Authentication & Session Policy

### Password Security
```typescript
// Use Argon2id for password hashing (upgrade from bcrypt)
import argon2 from 'argon2';

const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1,
  });
};

const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  return await argon2.verify(hash, password);
};
```

### Session Management
```typescript
// Session configuration with secure defaults
const sessionConfig = {
  secret: process.env.SESSION_SECRET, // 32+ random bytes
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,                                // Prevent XSS access
    maxAge: 24 * 60 * 60 * 1000,                  // 24 hours
    sameSite: 'strict'                             // CSRF protection
  },
  rolling: true // Extend session on activity
};
```

### JWT Implementation (Future Enhancement)
```typescript
// JWT rotation strategy for API access
interface TokenPair {
  accessToken: string;  // 15 minutes TTL
  refreshToken: string; // 7 days TTL
}

const generateTokenPair = (userId: number): TokenPair => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', jti: nanoid() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

### Device Tracking
- Track login sessions by device fingerprint
- Alert users of new device logins
- Provide session management dashboard
- Implement suspicious activity detection

**Checklist: Authentication Security**
- [ ] Argon2id password hashing implemented
- [ ] Session cookies secure and httpOnly
- [ ] JWT rotation mechanism ready for API
- [ ] Device fingerprinting for session tracking
- [ ] Failed login attempt rate limiting
- [ ] Password strength requirements enforced

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
enum UserRole {
  CHILD = 'child',
  PARENT = 'parent', 
  ADMIN = 'admin'
}

interface User {
  id: number;
  role: UserRole;
  parentId?: number; // For child accounts
}

const permissions = {
  [UserRole.CHILD]: [
    'game:play',
    'lesson:view',
    'progress:view:own',
    'profile:edit:limited'
  ],
  [UserRole.PARENT]: [
    'child:manage',
    'progress:view:children',
    'payment:manage',
    'report:generate'
  ],
  [UserRole.ADMIN]: [
    'user:manage:all',
    'content:moderate',
    'system:configure',
    'analytics:view:all'
  ]
};
```

### Route Guards
```typescript
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (!user || !hasPermission(user.role, permission)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage in routes
app.get('/api/admin/users', 
  requireAuth, 
  requirePermission('user:manage:all'), 
  getUsersHandler
);
```

### Least Privilege Implementation
- Users access only their own data by default
- Parents access only their children's data
- Admins require explicit permission escalation
- API endpoints validate ownership before data access

**Checklist: Authorization**
- [ ] RBAC roles defined and implemented
- [ ] Route guards protect sensitive endpoints
- [ ] Data ownership validation in all queries
- [ ] Permission checks before data modifications
- [ ] Admin actions require additional verification

## Input/Output Validation

### Zod Validation at Boundaries
```typescript
// API request validation
const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128)
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    // Proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors
      });
    }
  }
});
```

### Chess-Specific Validation
```typescript
const fenSchema = z.string().regex(
  /^[rnbqkpRNBQKP1-8\/\s\-KQkq]+$/,
  'Invalid FEN notation'
);

const moveSchema = z.object({
  from: z.string().regex(/^[a-h][1-8]$/, 'Invalid square'),
  to: z.string().regex(/^[a-h][1-8]$/, 'Invalid square'),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional()
});
```

### Allowlist Strategy
- Whitelist allowed file extensions: `.pgn`, `.fen`
- Validate chess notation against strict patterns
- Sanitize user-generated content for display
- Use parameterized queries for all database operations

### Safe JSON Handling
```typescript
const safeJsonParse = (input: string, maxSize = 10000): any => {
  if (input.length > maxSize) {
    throw new Error('JSON payload too large');
  }
  
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};
```

**Checklist: Input Validation**
- [ ] Zod schemas for all API endpoints
- [ ] Chess notation validation implemented
- [ ] File upload restrictions enforced
- [ ] JSON payload size limits set
- [ ] SQL injection prevention via ORM
- [ ] XSS prevention via output encoding

## HTTP Security Hardening

### Helmet Security Headers
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.replit.app"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "api.openai.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Configuration
```typescript
const corsOptions = {
  origin: [
    'https://chess-learning.replit.app',
    'https://chess-learning-staging.replit.app',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Rate Limiting Quotas
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limits for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'AI service rate limit exceeded'
});

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts'
});
```

### Compression Security
```typescript
import compression from 'compression';

app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024, // Only compress > 1KB
  filter: (req, res) => {
    // Don't compress responses that contain user data
    if (req.path.includes('/api/user/') && 
        res.getHeader('content-type')?.includes('application/json')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**Checklist: HTTP Hardening**
- [ ] Helmet security headers configured
- [ ] CORS whitelist implemented
- [ ] Rate limiting on all endpoints
- [ ] Compression configured securely
- [ ] HTTPS enforced in production
- [ ] Security headers tested

## Secrets Management

### Environment Variables Only
```bash
# .env (never committed)
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
SESSION_SECRET="32-byte-random-string"
JWT_SECRET="different-32-byte-string"
JWT_REFRESH_SECRET="another-32-byte-string"

# Production secrets via Replit Secrets
# Development secrets via .env
# No secrets in code or config files
```

### Secret Rotation Cadence
- **API Keys**: Rotate quarterly or after team changes
- **Database Passwords**: Rotate semi-annually
- **JWT Secrets**: Rotate annually or after security incidents
- **Session Secrets**: Rotate after major releases

### Secret Validation
```typescript
const validateSecrets = () => {
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'OPENAI_API_KEY'
  ];
  
  for (const secret of required) {
    if (!process.env[secret]) {
      throw new Error(`Missing required secret: ${secret}`);
    }
    
    if (process.env[secret].length < 32) {
      throw new Error(`Secret ${secret} is too short`);
    }
  }
};
```

**Checklist: Secrets Management**
- [ ] All secrets stored in environment variables
- [ ] No secrets committed to version control
- [ ] Secret rotation schedule established
- [ ] Secret validation on application startup
- [ ] Different secrets for different environments
- [ ] Secret access auditing implemented

## Dependency Security

### Weekly Audit Process
```bash
# Automated dependency scanning
npm audit --audit-level moderate
npm outdated

# Security scanning with Snyk (if available)
npx snyk test
npx snyk monitor

# Update dependencies weekly
npm update --save
npm audit fix
```

### Version Pinning Strategy
```json
// package.json - Pin exact versions for security-critical deps
{
  "dependencies": {
    "express": "4.21.2",        // Exact version
    "bcryptjs": "^3.0.2",       // Minor updates allowed
    "jsonwebtoken": "~9.0.0",   // Patch updates only
    "zod": "^3.22.0"            // Minor updates allowed
  }
}
```

### CVE Response Process
1. **Detection**: Automated alerts via GitHub/npm audit
2. **Assessment**: Evaluate impact on chess app functionality
3. **Response Timeline**: Critical (24h), High (72h), Medium (1 week)
4. **Testing**: Full regression testing after updates
5. **Deployment**: Emergency deployment process for critical issues

**Checklist: Dependency Hygiene**
- [ ] Weekly dependency audit scheduled
- [ ] Security-critical packages pinned
- [ ] CVE response process documented
- [ ] Automated dependency updates configured
- [ ] Dependency scanning in CI/CD pipeline

## Logging & Privacy

### PII-Free Logging
```typescript
import winston from 'winston';

const sanitizeForLogging = (data: any): any => {
  const sanitized = { ...data };
  
  // Remove PII fields
  delete sanitized.email;
  delete sanitized.username;
  delete sanitized.password;
  delete sanitized.passwordHash;
  
  // Mask IP addresses
  if (sanitized.ip) {
    sanitized.ip = sanitized.ip.replace(/\.\d+$/, '.***');
  }
  
  return sanitized;
};

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.Console()
  ]
});
```

### Trace ID Implementation
```typescript
import { nanoid } from 'nanoid';

const addTraceId = (req: Request, res: Response, next: NextFunction) => {
  req.traceId = nanoid();
  res.setHeader('X-Trace-ID', req.traceId);
  next();
};

// Usage in error handling
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request failed', {
    traceId: req.traceId,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    error: error.message,
    stack: error.stack
  });
  
  res.status(500).json({
    message: 'Internal server error',
    traceId: req.traceId
  });
};
```

**Checklist: Secure Logging**
- [ ] PII sanitization for all logs
- [ ] Trace IDs for request correlation
- [ ] Structured logging with Winston
- [ ] Log retention policy implemented
- [ ] Log access controls configured
- [ ] Error details not exposed to users

## Secure File Handling

### No User-Controlled Paths
```typescript
import path from 'path';

const validateFilePath = (userPath: string): string => {
  // Reject any path traversal attempts
  if (userPath.includes('..') || userPath.includes('/') || userPath.includes('\\')) {
    throw new Error('Invalid file path');
  }
  
  // Whitelist allowed extensions
  const allowedExt = ['.pgn', '.fen'];
  const ext = path.extname(userPath).toLowerCase();
  if (!allowedExt.includes(ext)) {
    throw new Error('File type not allowed');
  }
  
  // Generate safe filename
  const safeName = userPath.replace(/[^a-zA-Z0-9.-]/g, '_');
  return path.join('/safe/upload/directory', safeName);
};
```

### Object Storage Integration
```typescript
// Use cloud storage for user-generated content
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const uploadGameFile = async (file: Buffer, userId: number): Promise<string> => {
  const key = `games/${userId}/${nanoid()}.pgn`;
  
  await s3.upload({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: 'application/x-chess-pgn',
    ServerSideEncryption: 'AES256'
  }).promise();
  
  return key;
};
```

**Checklist: File Security**
- [ ] Path traversal protection implemented
- [ ] File type validation enforced
- [ ] Cloud storage for user content
- [ ] File size limits configured
- [ ] Virus scanning for uploads
- [ ] Encrypted file storage

## CI/CD Security Gates

### Security Testing Pipeline
```yaml
# .github/workflows/security.yml
name: Security Checks
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Dependency Audit
        run: npm audit --audit-level moderate
        
      - name: License Check
        run: npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-3-Clause"
        
      - name: OpenAPI Schema Validation
        run: npx redocly lint openapi/openapi.yaml
        
      - name: Security Linting
        run: npx eslint --ext .ts,.js . --rule "no-eval: error"
        
      - name: Secret Scanning
        run: |
          if grep -r "sk-" src/; then
            echo "Potential secret found!"
            exit 1
          fi
```

### OpenAPI Drift Detection
```typescript
// Compare API implementation against OpenAPI spec
const validateApiCompliance = async () => {
  const spec = await SwaggerParser.validate('openapi/openapi.yaml');
  const routes = app._router.stack;
  
  // Check for undocumented routes
  for (const route of routes) {
    if (!isRouteInSpec(route.path, spec)) {
      throw new Error(`Undocumented route: ${route.path}`);
    }
  }
};
```

**Checklist: CI/CD Security**
- [ ] Dependency scanning in pipeline
- [ ] License compliance checking
- [ ] OpenAPI validation automated
- [ ] Secret scanning implemented
- [ ] Security test coverage measured
- [ ] Deployment security gates configured

## Incident Response

### Response Team Structure
- **Incident Commander**: Lead developer (solo dev scenario)
- **Communication Lead**: Community/support contact
- **Technical Lead**: System administrator/DevOps
- **Legal/Compliance**: Legal advisor (if applicable)

### Incident Classification
**P0 - Critical (Response: Immediate)**
- Data breach or unauthorized access
- Complete service outage
- Payment system compromise

**P1 - High (Response: 2 hours)**
- Partial service outage
- Performance degradation affecting all users
- Security vulnerability actively exploited

**P2 - Medium (Response: 24 hours)**
- Feature-specific issues
- Non-critical security vulnerabilities
- Isolated user impact

### 24-Hour User Notification Template
```html
Subject: Security Update - Chess Learning App

Dear Chess Learning App Users,

We are writing to inform you of a security incident that occurred on [DATE] 
affecting our systems. We take the security of your data seriously and want 
to provide you with details about what happened and what we're doing about it.

WHAT HAPPENED:
[Brief description of the incident]

INFORMATION INVOLVED:
[Specific data types affected, if any]

WHAT WE'RE DOING:
- Immediately secured the affected systems
- Conducted thorough investigation
- Implemented additional security measures
- Reported to relevant authorities as required

WHAT YOU CAN DO:
- Change your password as a precaution
- Monitor your account for unusual activity
- Contact us with any concerns at security@chess-learning.app

We sincerely apologize for this incident and any inconvenience it may cause.

Chess Learning App Security Team
```

### Incident Response Playbook

**Immediate Response (0-1 hours)**
1. Assess and contain the incident
2. Activate incident response team
3. Document all actions taken
4. Preserve evidence for investigation

**Investigation Phase (1-8 hours)**
1. Determine root cause and scope
2. Identify affected users and data
3. Assess regulatory notification requirements
4. Develop remediation plan

**Recovery Phase (8-24 hours)**
1. Implement fixes and security measures
2. Test system integrity
3. Restore normal operations
4. Monitor for additional issues

**Communication Phase (24-72 hours)**
1. Notify affected users
2. Update stakeholders
3. Submit regulatory notifications
4. Publish transparency report

**Post-Incident (1 week)**
1. Conduct post-mortem analysis
2. Update security procedures
3. Implement preventive measures
4. Security training updates

**Checklist: Incident Response**
- [ ] Incident response team contacts updated
- [ ] Response procedures documented
- [ ] User notification templates prepared
- [ ] Evidence preservation process defined
- [ ] Communication channels established
- [ ] Post-incident review process planned

## Security PR Checklist

Copy and paste this checklist into every Pull Request:

```markdown
## Security Review Checklist

### Input Validation & Sanitization
- [ ] All user inputs validated with Zod schemas
- [ ] Chess notation (FEN/PGN) validated against patterns
- [ ] File uploads restricted to safe types and sizes
- [ ] SQL injection prevention via parameterized queries

### Authentication & Authorization  
- [ ] Authentication required for protected endpoints
- [ ] User permissions checked before data access
- [ ] Session management follows security policies
- [ ] No authentication bypass vulnerabilities

### Data Protection
- [ ] No PII exposed in logs or error messages
- [ ] Sensitive data encrypted at rest and in transit
- [ ] User data access limited to owned resources
- [ ] Database queries use proper access controls

### API Security
- [ ] Rate limiting implemented for new endpoints
- [ ] CORS configuration allows only trusted origins
- [ ] Security headers configured appropriately
- [ ] Error responses don't leak sensitive information

### Dependencies & Secrets
- [ ] No new dependencies with known vulnerabilities
- [ ] Secrets not hardcoded in source code
- [ ] Environment variables used for configuration
- [ ] License compatibility verified for new packages

### Documentation & Testing
- [ ] Security implications documented
- [ ] OpenAPI specification updated for new endpoints
- [ ] Security test cases added where applicable
- [ ] Threat model updated if attack surface changed

### Code Quality
- [ ] No use of eval() or other dangerous functions
- [ ] Proper error handling implemented
- [ ] Logging follows privacy guidelines
- [ ] Code follows security coding standards
```

---

*Security Documentation Version: 1.0 | Last Updated: August 12, 2025*  
*Cross-references: [API.md](./API.md) | [DATA.md](./DATA.md) | [ARCHITECTURE.md](./ARCHITECTURE.md)*