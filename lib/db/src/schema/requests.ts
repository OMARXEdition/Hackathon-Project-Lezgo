import { pgTable, serial, integer, text, jsonb, timestamp, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const requestsTable = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<{ question: string; answer: string }[]>().notNull().default([]),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("unique_event_applicant").on(t.eventId, t.userId),
  check("join_request_status", sql`${t.status} in ('pending','accepted','declined','withdrawn')`),
]);
export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true });
export type RequestRow = typeof requestsTable.$inferSelect;
