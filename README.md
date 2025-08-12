# Chess Learning App

A mobile-first chess learning web application that leverages advanced AI technologies to create an adaptive, intelligent learning environment for chess enthusiasts.

## Features

- **Interactive Chess Board**: Full chess rules implementation with pawn promotion and game settings
- **AI-Powered Opponent**: Multiple AI engines including OpenAI GPT-4o, Ollama, and traditional Stockfish
- **Dynamic Learning System**: Personalized lessons generated from actual gameplay patterns
- **Progress Analytics**: Real-time ELO tracking and skill assessment across multiple chess domains
- **Authentication System**: Secure user accounts with onboarding and progress persistence
- **Mobile-First Design**: Responsive UI optimized for mobile devices

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5000
```

### Database Setup

```bash
# Push database schema
npm run db:push
```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="your-postgresql-connection-string"
OPENAI_API_KEY="your-openai-api-key"
SESSION_SECRET="your-session-secret"
```

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4o for chess analysis and lesson generation
- **Authentication**: Session-based with Passport.js

## Documentation

- [API Documentation](./docs/API.md) - Complete API reference with OpenAPI specification
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and technical architecture
- [Database Schema](./docs/DATA.md) - ERD, data models, and privacy policies
- [Security Guidelines](./docs/SECURITY.md) - Security practices and incident response
- [Changelog](./CHANGELOG.md) - Version history and release notes

## Version Management

This project follows [Semantic Versioning](https://semver.org/) and maintains a [Keep a Changelog](https://keepachangelog.com/) format.

### Release Scripts

```bash
# Patch release (bug fixes)
./scripts/version-patch.sh

# Minor release (new features) 
./scripts/version-minor.sh

# Major release (breaking changes)
./scripts/version-major.sh
```

Each script will:
1. Bump the version in package.json
2. Update CHANGELOG.md with new version stub
3. Create a git commit and tag
4. Provide next steps for releasing

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

## Contributing

1. Follow the [Security Guidelines](./docs/SECURITY.md#security-pr-checklist) for all PRs
2. Update the changelog for user-facing changes
3. Ensure all tests pass and TypeScript compiles without errors
4. Use the version scripts for releases

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

*Chess Learning App v1.0.0*