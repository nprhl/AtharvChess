# Security Policy

## Supported Versions

We currently support the latest version deployed on Replit.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing our security team.

## Security Measures

### Authentication
- Session-based authentication with Passport.js
- Password hashing using bcrypt with salt rounds
- Session management with secure cookies

### Data Protection
- Environment variables for sensitive configuration
- Input validation using Zod schemas
- SQL injection prevention via Drizzle ORM

### API Security
- Rate limiting on API endpoints
- CSRF protection
- Request/response validation