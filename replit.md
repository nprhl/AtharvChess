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

### Chess Game Engine
- Custom `ChessGameEngine` class wrapping chess.js
- Move validation and game state management
- FEN string support for game persistence
- Undo/redo functionality

### User Interface
- Mobile-first responsive design (max-width: 448px)
- Bottom navigation for main app sections
- Interactive chess board with drag-and-drop piece movement
- AI hint system with contextual suggestions
- Progress tracking with visual indicators

### Data Management
- Local storage for game state persistence
- Server-side user data and progress tracking
- Optimistic updates with React Query
- Type-safe API contracts with Zod validation

## Data Flow

1. **Game Initialization**: Load saved game from localStorage or start new game
2. **Move Processing**: Validate moves client-side, update local state, sync to server
3. **Progress Tracking**: Lessons completion and statistics stored server-side
4. **Settings Sync**: User preferences stored locally with server backup
5. **AI Integration**: Hint requests sent to server for processing

## External Dependencies

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
- Development/production mode detection via `NODE_ENV`
- Replit-specific features enabled via `REPL_ID` detection

## Recent Changes

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

- August 9, 2025: PostgreSQL database integration completed
- June 29, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.