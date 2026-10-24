import { db, eventsTable, attendeesTable, usersTable, requestsTable, type EventRow } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { publicUser } from "./auth";
import { HttpError } from "./errors";

export async function hydrateEvent(event: EventRow, viewerId?: number) {
  const [host] = await db.select().from(usersTable).where(eq(usersTable.id, event.hostId));
  if (!host) throw new HttpError(404, "Host not found");
  const attendees = await db.select({ user: usersTable }).from(attendeesTable)
    .innerJoin(usersTable, eq(attendeesTable.userId, usersTable.id))
    .where(eq(attendeesTable.eventId, event.id)).orderBy(asc(attendeesTable.joinedAt));
  const { hostId: _hostId, ...data } = event;
  const requests = viewerId ? await db.select().from(requestsTable).where(and(eq(requestsTable.eventId, event.id),
    viewerId === event.hostId ? eq(requestsTable.status, "pending") : eq(requestsTable.userId, viewerId))) : [];
  return { ...data, startsAt: event.startsAt.toISOString(), host: publicUser(host), attendees: attendees.map(a => publicUser(a.user)),
    joinedCount: attendees.length, inviteCode: String(event.id),
    myRequestStatus: viewerId === event.hostId ? null : (requests[0]?.status ?? null),
    pendingRequestCount: viewerId === event.hostId ? requests.length : 0 };
}
export async function getEvent(id: number) {
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) throw new HttpError(404, "Event not found");
  return event;
}
