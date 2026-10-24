import { db, eventsTable, attendeesTable, usersTable, type EventRow } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { publicUser } from "./auth";
import { HttpError } from "./errors";

export async function hydrateEvent(event: EventRow) {
  const [host] = await db.select().from(usersTable).where(eq(usersTable.id, event.hostId));
  if (!host) throw new HttpError(404, "Host not found");
  const attendees = await db.select({ user: usersTable }).from(attendeesTable)
    .innerJoin(usersTable, eq(attendeesTable.userId, usersTable.id))
    .where(eq(attendeesTable.eventId, event.id)).orderBy(asc(attendeesTable.joinedAt));
  const { hostId: _hostId, ...data } = event;
  return { ...data, startsAt: event.startsAt.toISOString(), host: publicUser(host), attendees: attendees.map(a => publicUser(a.user)), joinedCount: attendees.length };
}
export async function getEvent(id: number) {
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) throw new HttpError(404, "Event not found");
  return event;
}
