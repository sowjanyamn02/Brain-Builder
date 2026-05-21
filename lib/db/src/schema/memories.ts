import { pgTable, text, serial, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryTypeEnum = pgEnum("memory_type", [
  "thought", "note", "learning", "idea", "journal", "task"
]);

export const memoryCategoryEnum = pgEnum("memory_category", [
  "work", "personal", "learning", "ideas", "health", "business"
]);

export const memoriesTable = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: memoryTypeEnum("type").notNull().default("note"),
  category: memoryCategoryEnum("category").notNull().default("personal"),
  tags: text("tags").array().notNull().default([]),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;
