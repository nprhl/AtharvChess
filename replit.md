# Chess Learning App

## Overview

This is a full-stack chess learning application built with React, TypeScript, Express.js, and PostgreSQL. The app features an interactive chess game interface, progressive lessons, user progress tracking, and personalized settings. It's designed as a mobile-first application with a modern, responsive UI built using shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Chess Logic**: chess.js library for game rules and validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with structured responses
- **Development**: Hot module replacement via Vite integration

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Migrations**: Drizzle-kit for schema management
- **Connection**: @neondatabase/serverless for optimized serverless connections

## Key Components

### AI Integration System
- **OpenAI GPT-4o Integration**: Primary chess engine for advanced gameplay and analysis
- **Multi-Engine Architecture**: Ollama (open-source) → OpenAI → Traditional fallback system
- **Move Evaluation**: Real-time analysis of player moves with tactical and strategic feedback
- **Hint Generation**: Context-aware suggestions based on current position and game history
- **Lesson Generation**: Dynamic lesson creation from actual gameplay patterns and mistakes
- **Progress Analysis**: AI-powered skill assessment and improvement recommendations
- **Personalized Daily Tips**: AI generates custom tips based on user performance, ELO rating, and game history analysis
- **Contextual Learning**: Game-integrated tips that respond to current position, game phase, and player situation
- **Learning Moment Detection**: Automatic recognition and recording of blunders, missed tactics, and good moves

### New UI Components
- **PromotionDialog**: Modal dialog for pawn promotion piece selection
- **GameSettingsDialog**: Comprehensive settings interface for game configuration
- **HeaderNavigation**: App header with live user data and functional navigation
- **Progress System**: Real-time progress tracking with authentic user statistics


### Chess Game Engine
- Custom `ChessGameEngine` class wrapping chess.js
- Move validation and game state management
- FEN string support for game persistence
- Undo/redo functionality
- Complete pawn promotion system with piece selection dialog
- Pawn promotion detection and validation
- Color selection support (play as White or Black)
- Game mode selection (Player vs Computer, Player vs Player)

### User Interface
- Mobile-first responsive design (max-width: 448px)
- Bottom navigation for main app sections
- Interactive chess board with drag-and-drop piece movement
- Complete pawn promotion dialog with piece selection
- Game settings dialog for color choice, difficulty, and game mode
- AI hint system with contextual suggestions
- Progress tracking with visual indicators and real user data
- Header navigation with live ELO rating and functional settings access

### Data Management
- Local storage for game state persistence
- Server-side user data and progress tracking
- Optimistic updates with React Query
- Type-safe API contracts with Zod validation
- Daily tips database with user interaction tracking (views, completions, bookmarks, ratings)
- Game integration service for contextual learning opportunities
- User performance analysis for personalized tip generation

## Data Flow

1. **Game Initialization**: Load saved game from localStorage or start new game
2. **Move Processing**: Validate moves client-side, update local state, sync to server
3. **AI Move Generation**: OpenAI GPT-4o analyzes position and generates strategic moves
4. **Move Evaluation**: Real-time analysis using OpenAI for tactical and strategic feedback
5. **Progress Tracking**: Lessons completion and statistics stored server-side
6. **Settings Sync**: User preferences stored locally with server backup
7. **Dynamic Learning**: OpenAI analyzes gameplay patterns to generate personalized lessons
8. **Hint System**: Context-aware suggestions powered by GPT-4o based on current position

## External Dependencies

### AI & Machine Learning
- **OpenAI API**: GPT-4o model for chess move generation, analysis, and lesson creation
- **@anthropic-ai/sdk**: Claude integration for advanced chess analysis (available but not primary)

### Core Libraries
- **chess.js**: Chess game logic and validation
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database operations
- **zod**: Runtime type validation and schema definition

### UI Components
- **@radix-ui/***: Accessible UI primitives (dialogs, dropdowns, etc.)
- **lucide-react**: Icon library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for client-side development
- Express middleware integration for API routes
- TypeScript compilation with shared types between client/server

### Production Build
- Client: Vite build outputs to `dist/public`
- Server: esbuild bundles server code to `dist/index.js`
- Static file serving via Express for SPA routing

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- OpenAI API access via `OPENAI_API_KEY` environment variable
- Development/production mode detection via `NODE_ENV`
- Replit-specific features enabled via `REPL_ID` detection

## Recent Changes

- **August 14, 2025**: Pure Stockfish Chess Engine Implementation
  - **Stockfish Only**: Removed all fallback engines - pure Stockfish implementation
  - **Skill Level Configuration**: Beginner (Level 1), Intermediate (Level 10), Advanced (Level 20)
  - **World-Class Gameplay**: Professional-grade chess engine with proper opening theory and tactics
  - **Performance Optimized**: Fast move times with configurable depth and skill levels
  - **No Fallbacks**: Clean implementation without traditional engine dependencies

- **August 13, 2025**: Comprehensive Daily Tips System & AI-Powered Personalization
  - **Micro-Learning System**: Complete daily chess tips with database schema, categorized by opening, tactics, endgame, strategy, psychology
  - **AI-Generated Personalized Tips**: GPT-4o analyzes user performance, ELO, and game history to generate custom daily tips
  - **Game Integration**: Contextual tips during gameplay, situational advice, and learning moment tracking
  - **Interactive Tip Components**: Chess position visualization, bookmark system, rating functionality, progress tracking
  - **Smart Tip Navigation**: Added Tips tab to bottom navigation with comprehensive browsing by category and difficulty
  - **User Progress Analytics**: Completion rates, reading streaks, bookmark management, and learning statistics
  - **Game Integration Hooks**: Real-time tip delivery based on game phase (opening/middlegame/endgame) and player situations

- **August 11, 2025**: Complete Chess Rules Implementation & User Interface Improvements
  - **Pawn Promotion System**: Added complete pawn promotion dialog with piece selection (Queen, Rook, Bishop, Knight)
  - **Color Selection Feature**: Implemented game settings dialog allowing users to choose White or Black pieces
  - **Game Settings Dialog**: Created comprehensive settings interface with difficulty, game mode, and color selection
  - **Header Authentication Fix**: Replaced hardcoded ELO rating (1250) with real user data from database
  - **Settings Navigation**: Made header gear icon clickable to navigate to settings page
  - **Progress Data Recovery**: Fixed 500 server errors on progress tab by creating robust progress endpoint
  - **Real Progress Statistics**: Progress page now displays actual user ELO, games won, puzzles solved, and skill areas
  - **OpenAI Integration Optimization**: Enhanced move evaluation, hint generation, and lesson creation using GPT-4o
  - Chess game now fully complies with official chess rules including proper pawn promotion handling

- **August 11, 2025**: Dynamic Learning System & GPT-4o Chess AI Integration
  - Successfully implemented GPT-4o as primary chess engine with strong strategic gameplay
  - Created comprehensive dynamic lesson system that tracks user gameplay patterns
  - Added personalized lesson generation based on actual moves and mistakes
  - Implemented skill progress tracking across 4 key areas: tactics, endgame, opening, positional
  - Built game analysis system using OpenAI to identify learning opportunities
  - Enhanced chess board interaction with proper piece selection/deselection
  - Fixed all OpenAI API parameter issues for GPT-5/GPT-4o compatibility
  - System now provides genuinely challenging advanced-level chess with real-time learning

- **August 11, 2025**: Ollama Open-Source AI Integration
  - Added OllamaChessAI class supporting open-source language models via Ollama
  - Integrated difficulty-specific model selection (llama3.1:8b for beginner/intermediate, llama3.1:70b for advanced)
  - Implemented sophisticated chess prompting with context awareness and game history
  - Added intelligent fallback system: Ollama AI → Traditional Enhanced Engine
  - Enhanced AI move and hint endpoints with engine selection and response parsing
  - Created comprehensive setup documentation for Ollama integration
  - System now provides much stronger chess gameplay when Ollama models are available

- **August 10, 2025**: Comprehensive Authentication and Onboarding System
  - Implemented full user authentication with Passport.js and bcrypt password hashing
  - Added PostgreSQL database schema for users, sessions, puzzles, and puzzle attempts
  - Created login and registration pages with form validation using React Hook Form and Zod
  - Built ELO rating assessment system through chess puzzle solving
  - Developed personalized onboarding workflow for new users
  - Added automatic learning module recommendations based on assessed skill level
  - Enhanced database schema with authentication tables (sessions, puzzles, puzzle_attempts)
  - Integrated puzzle service for ELO calculation and lesson recommendations
  - Created authentication middleware and protected routes
  - Updated App routing to handle authentication states and onboarding flow

- **August 10, 2025**: Enhanced AI difficulty system
  - Fixed hardcoded 'beginner' difficulty in hint function to use user-selected difficulty
  - Completely redesigned ChessAI with distinct difficulty behaviors:
    - Beginner: 80% random moves with high scoring variation for learning
    - Intermediate: 30% random moves with medium scoring variation for challenge
    - Advanced: Pure calculation with positional analysis and deeper search
  - Added search depth scaling (1-3 ply) based on difficulty level
  - Implemented positional evaluation bonuses for advanced level
  - Added tactical awareness (check detection, mobility bonuses) for intermediate/advanced

- **August 9, 2025**: Added PostgreSQL database integration with Neon
  - Replaced in-memory storage (MemStorage) with database storage (DatabaseStorage)
  - Created database schema with tables: users, games, lessons, user_lesson_progress, settings
  - Added Drizzle relations for type-safe queries and joins
  - Implemented full CRUD operations for all entities
  - Successfully migrated default lessons to database
  - All LSP diagnostics resolved

## Changelog

- August 13, 2025: Daily tips system with AI personalization and game integration
- August 11, 2025: Complete chess rules implementation (pawn promotion, color selection)
- August 11, 2025: Header authentication and progress data fixes
- August 11, 2025: Game settings dialog and user interface improvements
- August 11, 2025: Dynamic learning system and GPT-4o integration
- August 11, 2025: Ollama open-source AI integration
- August 10, 2025: Authentication system and onboarding
- August 9, 2025: PostgreSQL database integration completed
- June 29, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.