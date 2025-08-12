# Chess Learning App API Documentation

## Overview

The Chess Learning App provides a RESTful API for managing user authentication, chess gameplay, AI-powered analysis, progress tracking, and educational content. The API follows REST conventions and returns JSON responses.

## Base URLs

- **Development**: `http://localhost:5000/api`
- **Staging**: `https://chess-learning-staging.replit.app/api`
- **Production**: `https://chess-learning.replit.app/api`

## Authentication

### Session-Based Authentication
The API uses session-based authentication with secure HTTP-only cookies. No bearer tokens or JWT are currently implemented.

**Authentication Flow:**
1. `POST /auth/login` - Creates an authenticated session
2. Session cookie is automatically included in subsequent requests
3. `POST /auth/logout` - Destroys the session

**Protected Endpoints:** Most endpoints require authentication. Unauthenticated requests return `401 Unauthorized`.

## Rate Limiting

- **General Endpoints**: 100 requests per minute per IP
- **AI Endpoints**: 20 requests per minute per IP (OpenAI API costs)
- **Authentication**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## API Versioning

Current API version is **v1** (implicit). Future versions will use explicit versioning:
- Current: `/api/auth/login`
- Future: `/api/v2/auth/login`

Breaking changes will introduce new API versions while maintaining backward compatibility.

## Core Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - End user session
- `GET /auth/me` - Get current user profile

### User Management
- `GET /user/progress` - Get user progress analytics
- `PATCH /user/{id}` - Update user profile
- `GET /user/{id}/settings` - Get user preferences
- `PATCH /user/{id}/settings` - Update user settings

### Chess AI & Analysis
- `POST /ai/move` - Get AI chess move recommendation
- `POST /ai/hint` - Get move hints and suggestions
- `POST /move/evaluate` - Analyze and evaluate chess moves

### Learning & Progress
- `GET /lessons` - List available lessons
- `GET /lessons/{id}` - Get specific lesson content
- `POST /lessons/{id}/progress` - Update lesson progress
- `POST /game/complete` - Store completed game results

### Onboarding
- `GET /onboarding/puzzles` - Get assessment puzzles
- `POST /onboarding/puzzle-attempt` - Submit puzzle solution
- `POST /onboarding/complete` - Finalize onboarding process

## Request/Response Format

### Content Types
- **Request**: `application/json`
- **Response**: `application/json`

### Standard Response Structure
```json
{
  "data": { /* response payload */ },
  "message": "Operation successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response Structure
```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT", 
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Pagination

List endpoints support cursor-based pagination:

**Request Parameters:**
- `limit`: Items per page (default: 20, max: 100)
- `cursor`: Pagination cursor from previous response

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIz...",
    "limit": 20
  }
}
```

## Idempotency

POST and PATCH operations support idempotency using the `Idempotency-Key` header:

```http
POST /api/game/complete
Idempotency-Key: game-123-result-submission
Content-Type: application/json

{
  "result": "win",
  "moves": "e4 e5 Nf3..."
}
```

Duplicate requests with the same key return the original response.

## Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request or validation error |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `SERVICE_UNAVAILABLE` | External service error (AI APIs) |

## AI Service Integration

### OpenAI Integration
- **Model**: GPT-4o for move analysis and hint generation
- **Response Time**: Typically 1-3 seconds
- **Rate Limits**: Based on OpenAI API quotas
- **Fallback**: Traditional chess engine when unavailable

### Move Analysis
The AI provides comprehensive move evaluation:
- **Tactical Analysis**: Pins, forks, skewers, discovered attacks
- **Strategic Assessment**: Piece development, center control, king safety
- **Blunder Detection**: Identifies significant mistakes with explanations
- **Difficulty Adaptation**: Analysis depth varies by user skill level

## Development Tools

### OpenAPI Specification
Complete API specification available at: [`openapi/openapi.yaml`](../openapi/openapi.yaml)

### Validation
```bash
# Lint OpenAPI specification
npm run openapi:lint

# Generate documentation
npm run openapi:docs
```

### Testing
```bash
# Run API tests
npm run test:api

# Test with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Security Considerations

- All endpoints use HTTPS in production
- Session cookies are HTTP-only and secure
- Input validation using Zod schemas
- SQL injection prevention via Drizzle ORM
- Rate limiting on sensitive endpoints
- No sensitive data in error responses

For detailed security policies, see [SECURITY.md](./SECURITY.md).

## Data Privacy

User data handling follows strict privacy principles:
- Minimal data collection
- Chess move data sent to OpenAI for analysis (no PII)
- User controls over data retention
- Full data export/deletion capabilities

For comprehensive data policies, see [DATA.md](./DATA.md).

---

*API Version: 1.0 | Last Updated: August 12, 2025*