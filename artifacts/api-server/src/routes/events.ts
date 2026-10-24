import { Router, type IRouter } from "express";
import { db, eventsTable, attendeesTable, type UserRow } from "@workspace/db";
import { and, eq, asc } from "drizzle-orm";
import { CreateEventBody, CreateEventResponse, GetEventsResponse, JoinEventParams, UpdateEventPrivacyBody, UpdateEventPrivacyParams } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { getEvent, hydrateEvent } from "../lib/events";
import { HttpError } from "../lib/errors";

const router: IRouter = Router();
router.get("/events", async (_req, res): Promise<void> => {
  const events = await db.select().from(eventsTable).orderBy(asc(eventsTable.startsAt));
  res.json(GetEventsResponse.parse(await Promise.all(events.map(hydrateEvent))));
});
router.post("/events", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Please complete all event fields with valid values");
  const input = parsed.data;
  const user: UserRow = res.locals.user;
  if (!input.title.trim() || !input.locationName.trim()) throw new HttpError(400, "Title and location are required");
  if (input.minAge > input.maxAge) throw new HttpError(400, "Minimum age cannot exceed maximum age");
  if (user.age < input.minAge || user.age > input.maxAge) throw new HttpError(400, "Your event age range must include your own age");
  const startsAt = new Date(input.startsAt);
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new HttpError(400, "Choose a future date and time");
  const event = await db.transaction(async tx => {
    const [created] = await tx.insert(eventsTable).values({ ...input, title: input.title.trim(), locationName: input.locationName.trim(), hostId: user.id, startsAt }).returning();
    await tx.insert(attendeesTable).values({ eventId: created!.id, userId: user.id });
    return created!;
  });
  res.status(201).json(CreateEventResponse.parse(await hydrateEvent(event)));
});
router.post("/events/:id/join", requireUser, async (req, res): Promise<void> => {
  const params = JoinEventParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid event");
  const user: UserRow = res.locals.user;
  await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (user.age < event.minAge || user.age > event.maxAge) throw new HttpError(403, `Age restricted: This event is for ages ${event.minAge}–${event.maxAge}`);
    const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, event.id));
    if (attendees.some(a => a.userId === user.id)) throw new HttpError(409, "You have already joined this event");
    if (attendees.length >= event.maxPeople) throw new HttpError(409, "Event Full");
    if (event.startsAt.getTime() < Date.now()) throw new HttpError(400, "This event has already started");
    await tx.insert(attendeesTable).values({ eventId: event.id, userId: user.id });
  });
  res.json(await hydrateEvent(await getEvent(params.data.id)));
});
router.post("/events/:id/leave", requireUser, async (req, res): Promise<void> => {
  const params = JoinEventParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid event");
  const user: UserRow = res.locals.user;
  await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.hostId === user.id) throw new HttpError(400, "Hosts cannot leave their own event");
    await tx.delete(attendeesTable).where(and(eq(attendeesTable.eventId, event.id), eq(attendeesTable.userId, user.id)));
  });
  res.json(await hydrateEvent(await getEvent(params.data.id)));
});
router.patch("/events/:id/privacy", requireUser, async (req, res): Promise<void> => {
  const params = UpdateEventPrivacyParams.safeParse(req.params);
  const input = UpdateEventPrivacyBody.safeParse(req.body);
  if (!params.success || !input.success) throw new HttpError(400, "Invalid privacy setting");
  const user: UserRow = res.locals.user;
  await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.hostId !== user.id) throw new HttpError(403, "Only the host can change this setting");
    await tx.update(eventsTable).set({ allowMessages: input.data.allowMessages }).where(eq(eventsTable.id, event.id));
  });
  res.json(await hydrateEvent(await getEvent(params.data.id)));
});
export default router;
