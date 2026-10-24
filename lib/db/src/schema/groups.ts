import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const groupMessagesTable = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  text: text("text").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("group_event_created_idx").on(t.eventId, t.createdAt)]);
export const insertGroupMessageSchema = createInsertSchema(groupMessagesTable).omit({ id: true });
export type GroupMessageRow = typeof groupMessagesTable.$inferSelect;
