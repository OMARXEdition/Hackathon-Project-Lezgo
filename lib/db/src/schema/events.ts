import { pgTable, serial, text, integer, boolean, doublePrecision, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  locationName: text("location_name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  maxPeople: integer("max_people").notNull(),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  emoji: text("emoji").notNull(),
  allowMessages: boolean("allow_messages").notNull().default(true),
}, (t) => [
  check("event_capacity", sql`${t.maxPeople} between 2 and 100`),
  check("event_age_range", sql`${t.minAge} >= 18 and ${t.maxAge} >= ${t.minAge} and ${t.maxAge} <= 120`),
  check("event_coordinates", sql`${t.lat} between -90 and 90 and ${t.lng} between -180 and 180`),
]);
export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type EventRow = typeof eventsTable.$inferSelect;
