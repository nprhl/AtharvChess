import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  eloRating: integer("elo_rating").notNull().default(1200),
  gamesWon: integer("games_won").notNull().default(0),
  puzzlesSolved: integer("puzzles_solved").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
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

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  games: many(games),
  lessonProgress: many(userLessonProgress),
  settings: one(settings, {
    fields: [users.id],
    references: [settings.userId],
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
