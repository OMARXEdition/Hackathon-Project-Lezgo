import { pgTable, serial, text, integer, boolean, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  age: integer("age").notNull(),
  avatarSeed: text("avatar_seed").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
}, (t) => [check("adult_age", sql`${t.age} between 18 and 120`)]);
export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true });
export type UserRow = typeof usersTable.$inferSelect;
