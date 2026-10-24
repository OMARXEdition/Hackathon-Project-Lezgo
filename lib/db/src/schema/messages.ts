import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  recipientId: integer("recipient_id").notNull().references(() => usersTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (t) => [index("message_conversation_idx").on(t.eventId, t.senderId, t.recipientId)]);
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true });
export type MessageRow = typeof messagesTable.$inferSelect;
