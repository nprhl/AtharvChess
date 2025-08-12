# Changelog

All notable changes to the Chess Learning App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Version management scripts for automated releases
- Comprehensive documentation suite

## [1.0.0] - 2025-08-12

### Added
- **Complete Chess Learning Platform**: Full-stack application with React frontend and Express backend
- **Authentication System**: Session-based authentication with bcrypt password hashing and Passport.js integration
- **PostgreSQL Database**: Comprehensive schema with user accounts, games, lessons, puzzles, and progress tracking
- **Multi-Engine Chess AI**: OpenAI GPT-4o integration with Ollama fallback and traditional Stockfish engine
- **Dynamic Learning System**: AI-powered lesson generation based on user gameplay patterns and mistakes
- **Progress Analytics**: Real-time ELO tracking, skill assessment across tactics/endgame/opening/positional areas
- **Interactive Chess Board**: Full chess rules implementation including pawn promotion, color selection, and game settings
- **Puzzle Assessment System**: ELO calibration through chess puzzle solving during onboarding
- **Mobile-First UI**: Responsive design with shadcn/ui components and Tailwind CSS
- **API Documentation**: Complete OpenAPI 3.1 specification with 15+ endpoints
- **Database Documentation**: Comprehensive ERD with PII classification and backup policies
- **Security Documentation**: Threat model, authentication policies, and incident response procedures
- **Architecture Documentation**: System diagrams, data flows, and deployment strategies

### Security
- **Input Validation**: Zod schemas for all API endpoints with chess-specific validation
- **Rate Limiting**: Configurable limits for general API (100/15min), AI endpoints (20/min), and authentication (5/15min)
- **Session Security**: HTTP-only cookies with secure flags and CSRF protection
- **PII Protection**: Classified data handling with encryption at rest and sanitized logging
- **Dependency Security**: Automated vulnerability scanning and pinned security-critical packages

### Technical Architecture
- **Frontend**: React 18 with TypeScript, Vite build system, Wouter routing, TanStack Query
- **Backend**: Node.js with Express, TypeScript ES modules, Drizzle ORM
- **Database**: PostgreSQL with Neon serverless, comprehensive migration strategy
- **AI Integration**: OpenAI GPT-4o for move analysis, hint generation, and lesson creation
- **Development**: Hot module replacement, comprehensive TypeScript configuration
- **Deployment**: Replit-optimized with environment-based configuration

## [0.9.0] - 2025-08-11

### Added
- **Pawn Promotion System**: Complete dialog interface for piece selection (Queen, Rook, Bishop, Knight)
- **Game Settings Dialog**: Color selection, difficulty levels, and game mode configuration
- **Real User Data Integration**: Fixed hardcoded ELO ratings with authentic database queries
- **Progress Data Recovery**: Robust endpoint handling with proper error management
- **Header Navigation**: Functional settings access and live user statistics display

### Changed
- **Chess Rules Compliance**: Full implementation of official chess rules including promotion handling
- **UI Polish**: Enhanced user interface with proper piece selection and game configuration
- **Data Authenticity**: Replaced mock data with real user progress and statistics

### Fixed
- **500 Server Errors**: Resolved progress endpoint failures with proper database column mapping
- **Authentication Display**: Fixed hardcoded user data in header with live database integration
- **Settings Navigation**: Made header gear icon functional for settings page access

## [0.8.0] - 2025-08-11

### Added
- **GPT-4o Chess Integration**: Advanced AI opponent with strategic gameplay and real-time analysis
- **Dynamic Lesson Generator**: Personalized lessons based on actual gameplay patterns and mistakes
- **Skill Progress Tracking**: Granular tracking across tactics, endgame, opening, and positional play
- **Game Analysis System**: AI-powered post-game analysis identifying learning opportunities
- **Enhanced Chess Board**: Improved piece interaction with selection/deselection functionality

### Changed
- **AI Engine Priority**: OpenAI GPT-4o as primary engine with intelligent fallback system
- **Learning Personalization**: Lessons now generated from real user gameplay data
- **Move Evaluation**: Enhanced analysis using GPT-4o for tactical and strategic feedback

### Fixed
- **OpenAI API Compatibility**: Resolved parameter issues for GPT-4o model integration
- **Chess Engine Performance**: Optimized AI response times and accuracy

## [0.7.0] - 2025-08-11

### Added
- **Ollama Integration**: Open-source AI engine support with llama3.1:8b and llama3.1:70b models
- **Difficulty-Specific Models**: Intelligent model selection based on user skill level
- **Enhanced AI Prompting**: Sophisticated chess context awareness and game history integration
- **Comprehensive Fallback System**: Ollama → OpenAI → Traditional engine progression
- **Setup Documentation**: Complete Ollama integration guide and configuration instructions

### Changed
- **AI Architecture**: Multi-engine approach with graceful degradation
- **Chess Engine Selection**: Dynamic engine choice based on availability and performance
- **Hint System**: Improved explanations with open-source model integration

## [0.6.0] - 2025-08-10

### Added
- **User Authentication**: Complete registration and login system with form validation
- **ELO Rating System**: Chess skill assessment through puzzle solving
- **Onboarding Workflow**: Personalized learning path recommendations
- **Puzzle Service**: ELO calculation and lesson recommendations based on performance
- **Database Schema**: Authentication tables for sessions, puzzles, and puzzle attempts

### Changed
- **User Management**: Integrated authentication with protected routes and middleware
- **App Routing**: Authentication state handling and onboarding flow
- **Database Design**: Enhanced schema for user progress and assessment data

### Security
- **Password Security**: bcrypt hashing with secure session management
- **Protected Routes**: Authentication middleware for sensitive operations
- **Session Storage**: PostgreSQL-based session persistence

## [0.5.0] - 2025-08-10

### Added
- **Enhanced AI Difficulty System**: Distinct behavioral patterns for beginner/intermediate/advanced levels
- **Dynamic Difficulty Scaling**: Search depth and randomization based on user skill
- **Positional Evaluation**: Advanced scoring for piece placement and tactical awareness
- **Hint System Enhancement**: User-selected difficulty properly integrated

### Changed
- **AI Engine Behavior**: 
  - Beginner: 80% random moves with high scoring variation
  - Intermediate: 30% random moves with tactical awareness
  - Advanced: Pure calculation with deep positional analysis
- **Search Algorithms**: Configurable depth (1-3 ply) based on difficulty level

### Fixed
- **Hardcoded Difficulty**: Resolved static 'beginner' setting in hint generation

## [0.4.0] - 2025-08-09

### Added
- **PostgreSQL Integration**: Complete migration from in-memory to database storage
- **Drizzle ORM**: Type-safe database operations with comprehensive relations
- **Database Schema**: Users, games, lessons, progress tracking, and settings tables
- **Migration System**: Forward-only schema changes with zero-downtime deployment
- **Default Content**: Migrated lesson library to database with proper seeding

### Changed
- **Storage Architecture**: DatabaseStorage implementation replacing MemStorage
- **Data Persistence**: All user data and progress now permanently stored
- **Type Safety**: Enhanced with Drizzle relations for complex queries

### Technical
- **Database Provider**: Neon PostgreSQL with serverless configuration
- **ORM Integration**: Drizzle with Zod schema validation
- **Development Workflow**: Automated schema pushing with `npm run db:push`

## [0.3.0] - 2025-06-29

### Added
- **Core Chess Engine**: Basic game logic with move validation
- **Frontend Foundation**: React components with basic chess board
- **Backend API**: Express server with initial routing structure
- **Development Environment**: Vite configuration with hot reloading

### Technical
- **Project Structure**: Established client/server/shared architecture
- **Build System**: Vite for frontend, esbuild for backend production builds
- **Type Safety**: TypeScript configuration across full stack

---

## Release Process

### Version Bumping
```bash
# Patch release (bug fixes)
npm run version:patch

# Minor release (new features)
npm run version:minor

# Major release (breaking changes)
npm run version:major
```

### Release Guidelines

**Patch (x.y.Z)** - Backwards compatible bug fixes
- Security patches
- Bug fixes that don't change functionality
- Documentation updates
- Performance improvements

**Minor (x.Y.z)** - Backwards compatible new features
- New API endpoints
- New chess features or game modes
- UI enhancements
- Database schema additions (non-breaking)

**Major (X.y.z)** - Breaking changes
- API contract changes
- Database schema migrations requiring data migration
- Fundamental architecture changes
- Node.js or major dependency version upgrades

### Changelog Maintenance

When preparing a release:

1. Move unreleased changes to the new version section
2. Add release date in YYYY-MM-DD format
3. Ensure all changes are categorized appropriately
4. Add comparison links for the new version
5. Update version references in documentation

### Security Disclosure

Security vulnerabilities are documented in the Security section of each release. For responsible disclosure of security issues, contact: security@chess-learning.app

---

*Changelog maintained following [Keep a Changelog](https://keepachangelog.com/) guidelines*
*Project versioning follows [Semantic Versioning](https://semver.org/)*

[Unreleased]: https://github.com/chess-learning-app/chess-learning/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/chess-learning-app/chess-learning/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/chess-learning-app/chess-learning/releases/tag/v0.3.0