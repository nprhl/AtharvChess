# Production Environment Variables Setup

## Critical Required Variables (Must be set)

```bash
# Database Connection
DATABASE_URL=your_postgresql_connection_string

# Session Security (CRITICAL - Generate a strong random string)
SESSION_SECRET=your_strong_random_secret_minimum_32_characters

# Application Environment
NODE_ENV=production

# AI Services
OPENAI_API_KEY=your_openai_api_key
```

## Security Configuration (Recommended for Production)

```bash
# Security Features
ENABLE_RATE_LIMIT=true
ENABLE_REQUEST_VALIDATION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_ENCRYPTION=true

# Database Security
DB_ENABLE_SSL=true
DB_ENABLE_POOLING=true
DB_MAX_CONNECTIONS=20
DB_ENABLE_LOGGING=false
```

## Advanced AI Integration (Optional)

```bash
# MAIA-2 Chess AI (when available)
MAIA2_API_KEY=your_maia2_api_key
MAIA2_API_ENDPOINT=https://api.maia2.ai/v1
MAIA2_TIMEOUT=10000
MAIA2_MAX_RETRIES=3
MAIA2_RATE_LIMIT=60
MAIA2_ENABLE_CACHE=true
MAIA2_CACHE_EXPIRY=30
MAIA2_FALLBACK=true
MAIA2_ENABLE_METRICS=true

# OpenAI Configuration
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=150
OPENAI_TEMPERATURE=0.1
```

## Notification Services (Optional)

```bash
# Twilio SMS (if using SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_API_KEY=your_twilio_api_key
TWILIO_KEY_SECRET=your_twilio_secret
TWILIO_PHONE_NUMBER=your_twilio_phone

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com

# SendGrid (if using email notifications)
SENDGRID_API_KEY=your_sendgrid_api_key
```

## Production Deployment Checklist

1. ✅ Set DATABASE_URL to your production PostgreSQL database
2. ✅ Generate and set a strong SESSION_SECRET (minimum 32 characters)
3. ✅ Set NODE_ENV=production
4. ✅ Add your OPENAI_API_KEY
5. ✅ Enable all security features (ENABLE_*)
6. ✅ Enable database SSL (DB_ENABLE_SSL=true)
7. ✅ Configure rate limiting and request validation
8. ✅ Set up health checks and metrics
9. ✅ Test session persistence after deployment

## Quick SESSION_SECRET Generation

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Environment Variable Priority

**Critical (App won't work without):**
- DATABASE_URL
- SESSION_SECRET
- NODE_ENV
- OPENAI_API_KEY

**Security (Recommended for production):**
- All ENABLE_* flags
- DB_ENABLE_SSL
- Strong session configuration

**Enhancement (Optional but valuable):**
- MAIA2_* variables
- Notification services
- Advanced OpenAI configuration