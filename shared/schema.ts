import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, varchar, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  replitUserId: text("replit_user_id").unique(), // External Replit OIDC user ID
  username: text("username"),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  eloRating: integer("elo_rating").notNull().default(1200),
  isEloCalibrated: boolean("is_elo_calibrated").notNull().default(false),
  gamesWon: integer("games_won").notNull().default(0),
  puzzlesSolved: integer("puzzles_solved").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  // Tournament-related fields
  dateOfBirth: timestamp("date_of_birth"),
  schoolId: integer("school_id"),
  primaryRole: text("primary_role").notNull().default('student'), // 'student', 'teacher', 'coach', 'organizer', 'parent', 'admin'
  phoneNumber: text("phone_number"),
  parentEmail: text("parent_email"),
  federationId: text("federation_id"), // FIDE ID or national federation ID
  emergencyContact: text("emergency_contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  opponent: text("opponent"),
  result: text("result").notNull(), // 'win', 'loss', 'draw'
  moves: jsonb("moves").notNull(), // Array of chess moves
  eloChange: integer("elo_change").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  content: jsonb("content").notNull(), // Lesson content structure
  order: integer("order").notNull(),
});

export const userLessonProgress = pgTable("user_lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  lessonId: integer("lesson_id").references(() => lessons.id),
  completed: boolean("completed").notNull().default(false),
  score: integer("score"), // Percentage score
  completedAt: timestamp("completed_at"),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Chess puzzles for ELO assessment
export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  fen: text("fen").notNull(), // Starting position
  solution: jsonb("solution").notNull(), // Array of moves that solve the puzzle
  rating: integer("rating").notNull(), // Puzzle difficulty rating
  tags: text("tags").array(), // e.g., ['tactics', 'endgame', 'opening']
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User puzzle attempts for ELO calculation
export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  puzzleId: integer("puzzle_id").references(() => puzzles.id),
  solved: boolean("solved").notNull(),
  timeSpent: integer("time_spent"), // seconds
  attemptedMoves: jsonb("attempted_moves"), // Array of moves user tried
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Engine evaluations for progress analytics
export const engineEvals = pgTable("engine_evals", {
  fen: text("fen").notNull(),
  depth: integer("depth").notNull(),
  engine: text("engine").notNull(),
  scoreCp: integer("score_cp"),
  bestmove: text("bestmove"),
  pv: text("pv"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.fen, table.depth, table.engine] }),
}));

// Game analysis and learning patterns
export const gameAnalysis = pgTable("game_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  gameId: integer("game_id").references(() => games.id),
  movesAnalyzed: jsonb("moves_analyzed").notNull(), // Detailed move analysis
  weaknessesFound: text("weaknesses_found").array(), // e.g., ['tactics', 'endgame', 'opening']
  strengthsFound: text("strengths_found").array(),
  suggestedLessons: text("suggested_lessons").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Dynamic lesson recommendations
export const dynamicLessons = pgTable("dynamic_lessons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lessonType: text("lesson_type").notNull(), // 'pattern_practice', 'mistake_correction', 'skill_building'
  targetWeakness: text("target_weakness").notNull(),
  exercises: jsonb("exercises").notNull(), // Specific exercises based on user's games
  priority: integer("priority").notNull().default(1), // 1-10, higher = more important
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User progress tracking per skill area
export const skillProgress = pgTable("skill_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  skillArea: text("skill_area").notNull(), // 'tactics', 'endgame', 'opening', 'positional'
  currentLevel: integer("current_level").notNull().default(1), // 1-10 scale
  practiceCount: integer("practice_count").notNull().default(0),
  successRate: integer("success_rate").notNull().default(0), // percentage
  lastPracticed: timestamp("last_practiced"),
  improvementTrend: text("improvement_trend"), // 'improving', 'stable', 'declining'
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  hintsEnabled: boolean("hints_enabled").notNull().default(true),
  focusMode: boolean("focus_mode").notNull().default(false),
  progressTracking: boolean("progress_tracking").notNull().default(true),
  dailyPlayTime: integer("daily_play_time").notNull().default(30), // minutes
  breakReminders: integer("break_reminders").notNull().default(15), // minutes
  difficulty: text("difficulty").notNull().default('beginner'),
  autoAdjustDifficulty: boolean("auto_adjust_difficulty").notNull().default(true),
});

// Daily chess tips for micro-learning
export const dailyTips = pgTable("daily_tips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // 'opening', 'tactics', 'endgame', 'strategy', 'psychology'
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  fen: text("fen"), // Optional chess position to demonstrate the tip
  moves: jsonb("moves"), // Optional sequence of moves to illustrate
  estimatedReadTime: integer("estimated_read_time").notNull(), // seconds
  tags: text("tags").array(), // searchable tags
  isActive: boolean("is_active").notNull().default(true),
  publishDate: timestamp("publish_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User interactions with daily tips
export const userTipProgress = pgTable("user_tip_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tipId: integer("tip_id").references(() => dailyTips.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  completed: boolean("completed").notNull().default(false),
  bookmarked: boolean("bookmarked").notNull().default(false),
  rating: integer("rating"), // 1-5 stars user rating
  completedAt: timestamp("completed_at"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type InsertUserLessonProgress = typeof userLessonProgress.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;

export type Puzzle = typeof puzzles.$inferSelect;
export type InsertPuzzle = typeof puzzles.$inferInsert;

export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type InsertPuzzleAttempt = typeof puzzleAttempts.$inferInsert;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export const insertUserLessonProgressSchema = createInsertSchema(userLessonProgress).omit({
  id: true,
  completedAt: true,
});

export const insertPuzzleSchema = createInsertSchema(puzzles).omit({
  id: true,
  createdAt: true,
});

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertEngineEvalSchema = createInsertSchema(engineEvals).omit({
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export const insertDailyTipSchema = createInsertSchema(dailyTips).omit({
  id: true,
  createdAt: true,
});

export const insertUserTipProgressSchema = createInsertSchema(userTipProgress).omit({
  id: true,
  viewedAt: true,
  completedAt: true,
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

// Relations (updated with tournament relationships)
export const usersRelations = relations(users, ({ many, one }) => ({
  games: many(games),
  lessonProgress: many(userLessonProgress),
  puzzleAttempts: many(puzzleAttempts),
  settings: one(settings, {
    fields: [users.id],
    references: [settings.userId],
  }),
  // Tournament relationships
  school: one(organizations, {
    fields: [users.schoolId],
    references: [organizations.id],
  }),
  roles: many(userRoles),
  teamMemberships: many(teamMembers),
  organizedTournaments: many(tournaments),
  registrations: many(registrations),
  ratingSnapshots: many(ratingSnapshots),
  certificates: many(certificates),
  notifications: many(notifications),
}));

export const puzzlesRelations = relations(puzzles, ({ many }) => ({
  attempts: many(puzzleAttempts),
}));

export const puzzleAttemptsRelations = relations(puzzleAttempts, ({ one }) => ({
  user: one(users, {
    fields: [puzzleAttempts.userId],
    references: [users.id],
  }),
  puzzle: one(puzzles, {
    fields: [puzzleAttempts.puzzleId],
    references: [puzzles.id],
  }),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ many }) => ({
  userProgress: many(userLessonProgress),
}));

export const userLessonProgressRelations = relations(userLessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [userLessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [userLessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, {
    fields: [settings.userId],
    references: [users.id],
  }),
}));

export const dailyTipsRelations = relations(dailyTips, ({ many }) => ({
  userProgress: many(userTipProgress),
}));

export const userTipProgressRelations = relations(userTipProgress, ({ one }) => ({
  user: one(users, {
    fields: [userTipProgress.userId],
    references: [users.id],
  }),
  tip: one(dailyTips, {
    fields: [userTipProgress.tipId],
    references: [dailyTips.id],
  }),
}));

// ==================== TOURNAMENT SYSTEM TABLES ====================

// Organizations (Schools/Clubs)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'school', 'club', 'academy'
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").notNull().default('IN'),
  postalCode: text("postal_code"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  website: text("website"),
  principalName: text("principal_name"),
  principalEmail: text("principal_email"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  settings: jsonb("settings"), // Organization-specific settings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User Roles (for RBAC)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // 'super_admin', 'organizer', 'coach', 'teacher', 'parent', 'student'
  scope: text("scope"), // 'global', 'org:123', 'tournament:456', 'team:789'
  permissions: text("permissions").array(), // Specific permissions array
  grantedBy: integer("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// Teams (within organizations)
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  coachId: integer("coach_id").references(() => users.id),
  description: text("description"),
  gradeLevel: text("grade_level"), // 'K-2', '3-5', '6-8', '9-12', 'mixed'
  skillLevel: text("skill_level"), // 'beginner', 'intermediate', 'advanced', 'mixed'
  maxMembers: integer("max_members").default(50),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Team memberships
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default('member'), // 'member', 'captain', 'co_captain'
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// Tournaments
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizerId: integer("organizer_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  venue: text("venue"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").notNull().default('IN'),
  timeZone: text("time_zone").notNull().default('Asia/Kolkata'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationStartDate: timestamp("registration_start_date").notNull(),
  registrationEndDate: timestamp("registration_end_date").notNull(),
  maxParticipants: integer("max_participants"),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).default('0'),
  currency: text("currency").notNull().default('INR'),
  status: text("status").notNull().default('draft'), // 'draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'archived'
  format: text("format").notNull().default('swiss'), // 'swiss', 'round_robin', 'knockout', 'arena'
  timeControl: jsonb("time_control").notNull(), // {type: 'classical', minutes: 90, increment: 30}
  isOnline: boolean("is_online").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  requirePayment: boolean("require_payment").notNull().default(false),
  requireParentConsent: boolean("require_parent_consent").notNull().default(true),
  rules: text("rules"),
  prizeStructure: jsonb("prize_structure"),
  settings: jsonb("settings"), // Tournament-specific settings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tournament Sections (skill/grade divisions)
export const tournamentSections = pgTable("tournament_sections", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),
  description: text("description"),
  minRating: integer("min_rating"),
  maxRating: integer("max_rating"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  gradeLevel: text("grade_level"), // 'K-2', '3-5', '6-8', '9-12'
  maxParticipants: integer("max_participants"),
  rounds: integer("rounds").notNull(),
  format: text("format").notNull(), // 'swiss', 'round_robin', 'knockout'
  timeControl: jsonb("time_control").notNull(),
  boardCount: integer("board_count").default(1), // For team events
  tieBreaks: text("tie_breaks").array().notNull().default(['buchholz', 'sonneborn_berger', 'head_to_head']),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Registrations
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  sectionId: integer("section_id").notNull().references(() => tournamentSections.id),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").references(() => teams.id),
  registeredBy: integer("registered_by").references(() => users.id), // Parent/teacher who registered
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'waitlisted', 'cancelled', 'refunded'
  paymentStatus: text("payment_status").notNull().default('pending'), // 'pending', 'paid', 'failed', 'refunded'
  paymentReference: text("payment_reference"),
  registrationData: jsonb("registration_data"), // Additional form data
  parentConsentGiven: boolean("parent_consent_given").default(false),
  parentConsentDate: timestamp("parent_consent_date"),
  emergencyContact: text("emergency_contact"),
  medicalInfo: text("medical_info"),
  specialRequirements: text("special_requirements"),
  seedingRating: integer("seeding_rating"), // Rating at registration time
  confirmedAt: timestamp("confirmed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tournament Rounds
export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  sectionId: integer("section_id").notNull().references(() => tournamentSections.id),
  roundNumber: integer("round_number").notNull(),
  name: text("name"), // Optional custom round name
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'active', 'completed', 'cancelled'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  pairingsGeneratedAt: timestamp("pairings_generated_at"),
  pairingsGeneratedBy: integer("pairings_generated_by").references(() => users.id),
  isLocked: boolean("is_locked").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Pairings (match assignments)
export const pairings = pgTable("pairings", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull().references(() => rounds.id),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  sectionId: integer("section_id").notNull().references(() => tournamentSections.id),
  boardNumber: integer("board_number").notNull(),
  whitePlayerId: integer("white_player_id").references(() => users.id),
  blackPlayerId: integer("black_player_id").references(() => users.id),
  whiteTeamId: integer("white_team_id").references(() => teams.id),
  blackTeamId: integer("black_team_id").references(() => teams.id),
  tableNumber: integer("table_number"),
  result: text("result"), // '1-0', '0-1', '1/2-1/2', '0-0' (double forfeit), '*' (ongoing)
  whiteScore: decimal("white_score", { precision: 3, scale: 1 }), // 1.0, 0.5, 0.0
  blackScore: decimal("black_score", { precision: 3, scale: 1 }),
  gameStatus: text("game_status").notNull().default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'forfeited', 'bye'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  isBye: boolean("is_bye").notNull().default(false),
  byeColor: text("bye_color"), // 'white', 'black' for bye assignments
  notes: text("notes"),
  arbiterNotes: text("arbiter_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tournament Games (detailed game results)
export const tournamentGames = pgTable("tournament_games", {
  id: serial("id").primaryKey(),
  pairingId: integer("pairing_id").notNull().references(() => pairings.id),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  whitePlayerId: integer("white_player_id").notNull().references(() => users.id),
  blackPlayerId: integer("black_player_id").notNull().references(() => users.id),
  result: text("result").notNull(), // '1-0', '0-1', '1/2-1/2'
  resultReason: text("result_reason"), // 'checkmate', 'resignation', 'time', 'draw_agreement', 'stalemate', 'threefold', 'fifty_move'
  moves: jsonb("moves"), // PGN or move array
  pgn: text("pgn"), // Full PGN string
  timeUsed: jsonb("time_used"), // {white: 3600, black: 3400} in seconds
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  submittedBy: integer("submitted_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedAt: timestamp("approved_at"),
  ecoCode: text("eco_code"), // Chess opening code
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Appeals & Arbitration
export const appeals = pgTable("appeals", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  gameId: integer("game_id").references(() => tournamentGames.id),
  pairingId: integer("pairing_id").references(() => pairings.id),
  appealedBy: integer("appealed_by").notNull().references(() => users.id),
  appealType: text("appeal_type").notNull(), // 'result_dispute', 'pairing_error', 'conduct_complaint', 'technical_issue'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence"), // Photos, documents, witness statements
  status: text("status").notNull().default('pending'), // 'pending', 'under_review', 'resolved', 'rejected', 'withdrawn'
  priority: text("priority").notNull().default('normal'), // 'low', 'normal', 'high', 'urgent'
  assignedTo: integer("assigned_to").references(() => users.id),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  resolution: text("resolution"),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Rating Snapshots (for fair pairings and history)
export const ratingSnapshots = pgTable("rating_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  ratingBefore: integer("rating_before").notNull(),
  ratingAfter: integer("rating_after"),
  ratingChange: integer("rating_change").default(0),
  gamesPlayed: integer("games_played").default(0),
  score: decimal("score", { precision: 4, scale: 1 }), // Total score in tournament
  performance: integer("performance"), // Performance rating
  snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),
  isProvisional: boolean("is_provisional").notNull().default(false),
});

// Certificates & Awards
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  sectionId: integer("section_id").references(() => tournamentSections.id),
  userId: integer("user_id").notNull().references(() => users.id),
  certificateType: text("certificate_type").notNull(), // 'participation', 'winner', 'runner_up', 'third_place', 'special_award'
  awardName: text("award_name").notNull(),
  description: text("description"),
  placement: integer("placement"), // 1st, 2nd, 3rd, etc.
  score: decimal("score", { precision: 4, scale: 1 }),
  totalRounds: integer("total_rounds"),
  certificateData: jsonb("certificate_data"), // Template merge fields
  templateId: text("template_id"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  issuedBy: integer("issued_by").notNull().references(() => users.id),
  downloadCount: integer("download_count").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  isActive: boolean("is_active").notNull().default(true),
});

// Notification preferences and logs
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'tournament_registration', 'round_pairing', 'result_posted', 'award_issued'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional notification data
  isRead: boolean("is_read").notNull().default(false),
  isEmailSent: boolean("is_email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  channel: text("channel").notNull().default('in_app'), // 'in_app', 'email', 'sms', 'whatsapp'
  priority: text("priority").notNull().default('normal'), // 'low', 'normal', 'high'
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== TOURNAMENT RELATIONS ====================

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  users: many(users),
  teams: many(teams),
  tournaments: many(tournaments),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [userRoles.grantedBy],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  coach: one(users, {
    fields: [teams.coachId],
    references: [users.id],
  }),
  members: many(teamMembers),
  registrations: many(registrations),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [tournaments.organizationId],
    references: [organizations.id],
  }),
  sections: many(tournamentSections),
  registrations: many(registrations),
  rounds: many(rounds),
  appeals: many(appeals),
  certificates: many(certificates),
}));

export const tournamentSectionsRelations = relations(tournamentSections, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentSections.tournamentId],
    references: [tournaments.id],
  }),
  registrations: many(registrations),
  rounds: many(rounds),
  certificates: many(certificates),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [registrations.tournamentId],
    references: [tournaments.id],
  }),
  section: one(tournamentSections, {
    fields: [registrations.sectionId],
    references: [tournamentSections.id],
  }),
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [registrations.teamId],
    references: [teams.id],
  }),
  registeredByUser: one(users, {
    fields: [registrations.registeredBy],
    references: [users.id],
  }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [rounds.tournamentId],
    references: [tournaments.id],
  }),
  section: one(tournamentSections, {
    fields: [rounds.sectionId],
    references: [tournamentSections.id],
  }),
  pairings: many(pairings),
  pairingsGeneratedByUser: one(users, {
    fields: [rounds.pairingsGeneratedBy],
    references: [users.id],
  }),
}));

export const pairingsRelations = relations(pairings, ({ one, many }) => ({
  round: one(rounds, {
    fields: [pairings.roundId],
    references: [rounds.id],
  }),
  tournament: one(tournaments, {
    fields: [pairings.tournamentId],
    references: [tournaments.id],
  }),
  section: one(tournamentSections, {
    fields: [pairings.sectionId],
    references: [tournamentSections.id],
  }),
  whitePlayer: one(users, {
    fields: [pairings.whitePlayerId],
    references: [users.id],
  }),
  blackPlayer: one(users, {
    fields: [pairings.blackPlayerId],
    references: [users.id],
  }),
  whiteTeam: one(teams, {
    fields: [pairings.whiteTeamId],
    references: [teams.id],
  }),
  blackTeam: one(teams, {
    fields: [pairings.blackTeamId],
    references: [teams.id],
  }),
  tournamentGames: many(tournamentGames),
  appeals: many(appeals),
}));

export const tournamentGamesRelations = relations(tournamentGames, ({ one }) => ({
  pairing: one(pairings, {
    fields: [tournamentGames.pairingId],
    references: [pairings.id],
  }),
  tournament: one(tournaments, {
    fields: [tournamentGames.tournamentId],
    references: [tournaments.id],
  }),
  whitePlayer: one(users, {
    fields: [tournamentGames.whitePlayerId],
    references: [users.id],
  }),
  blackPlayer: one(users, {
    fields: [tournamentGames.blackPlayerId],
    references: [users.id],
  }),
  submittedByUser: one(users, {
    fields: [tournamentGames.submittedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [tournamentGames.approvedBy],
    references: [users.id],
  }),
}));

export const appealsRelations = relations(appeals, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [appeals.tournamentId],
    references: [tournaments.id],
  }),
  game: one(tournamentGames, {
    fields: [appeals.gameId],
    references: [tournamentGames.id],
  }),
  pairing: one(pairings, {
    fields: [appeals.pairingId],
    references: [pairings.id],
  }),
  appealedByUser: one(users, {
    fields: [appeals.appealedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [appeals.assignedTo],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [appeals.reviewedBy],
    references: [users.id],
  }),
}));

export const ratingSnapshotsRelations = relations(ratingSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [ratingSnapshots.userId],
    references: [users.id],
  }),
  tournament: one(tournaments, {
    fields: [ratingSnapshots.tournamentId],
    references: [tournaments.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [certificates.tournamentId],
    references: [tournaments.id],
  }),
  section: one(tournamentSections, {
    fields: [certificates.sectionId],
    references: [tournamentSections.id],
  }),
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  issuedByUser: one(users, {
    fields: [certificates.issuedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));


// ==================== TOURNAMENT SCHEMA EXPORTS ====================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  grantedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentSectionSchema = createInsertSchema(tournamentSections).omit({
  id: true,
  createdAt: true,
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPairingSchema = createInsertSchema(pairings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentGameSchema = createInsertSchema(tournamentGames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppealSchema = createInsertSchema(appeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRatingSnapshotSchema = createInsertSchema(ratingSnapshots).omit({
  id: true,
  snapshotDate: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  issuedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type InsertUserLessonProgress = z.infer<typeof insertUserLessonProgressSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Puzzle = typeof puzzles.$inferSelect;
export type InsertPuzzle = z.infer<typeof insertPuzzleSchema>;
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type InsertPuzzleAttempt = z.infer<typeof insertPuzzleAttemptSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

// Tournament Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type TournamentSection = typeof tournamentSections.$inferSelect;
export type InsertTournamentSection = z.infer<typeof insertTournamentSectionSchema>;
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Round = typeof rounds.$inferSelect;
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Pairing = typeof pairings.$inferSelect;
export type InsertPairing = z.infer<typeof insertPairingSchema>;
export type TournamentGame = typeof tournamentGames.$inferSelect;
export type InsertTournamentGame = z.infer<typeof insertTournamentGameSchema>;
export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type RatingSnapshot = typeof ratingSnapshots.$inferSelect;
export type InsertRatingSnapshot = z.infer<typeof insertRatingSnapshotSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
