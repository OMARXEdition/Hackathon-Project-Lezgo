import { Router, type IRouter } from "express";
import { db, eventsTable, attendeesTable, usersTable, requestsTable, groupMessagesTable, notificationsTable, type UserRow } from "@workspace/db";
import { and, eq, asc } from "drizzle-orm";
import { CreateEventBody, CreateEventResponse, GetEventsResponse, JoinEventParams, EditEventBody,
  EditEventParams, UpdateEventPrivacyBody, UpdateEventPrivacyParams, GetEventDetailParams,
  GetEventDetailResponse, CancelEventBody, CancelEventParams } from "@workspace/api-zod";
import { currentUser, requireUser } from "../lib/auth";
import { getEvent, hydrateEvent } from "../lib/events";
import { HttpError } from "../lib/errors";

const router: IRouter = Router();
function validateEvent(input: ReturnType<typeof CreateEventBody.parse>, user: UserRow) {
  if (!input.title.trim() || !input.locationName.trim()) throw new HttpError(400, "Title and location are required");
  if (input.minAge > input.maxAge) throw new HttpError(400, "Minimum age cannot exceed maximum age");
  if (user.age < input.minAge || user.age > input.maxAge) throw new HttpError(400, "Your event age range must include your own age");
  const startsAt = new Date(input.startsAt);
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) throw new HttpError(400, "Choose a future date and time");
  if (input.isPaid && (input.price <= 0 || !input.costDetails.trim())) throw new HttpError(400, "Paid events require a positive price and cost details");
  if (input.isPaid && Math.abs(input.price * 100 - Math.round(input.price * 100)) > 0.00001) throw new HttpError(400, "Use a price with at most two decimal places");
  if (input.isPrivate && input.screeningQuestions.some(q => !q.trim())) throw new HttpError(400, "Screening questions cannot be blank");
  return { ...input, startsAt, title: input.title.trim(), locationName: input.locationName.trim(),
    price: input.isPaid ? input.price : 0, costDetails: input.isPaid ? input.costDetails.trim() : "",
    languages: [...new Set(input.languages)],
    screeningQuestions: input.isPrivate ? input.screeningQuestions.map(q => q.trim()) : [] };
}
router.get("/events", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  const events = await db.select().from(eventsTable).orderBy(asc(eventsTable.startsAt));
  res.json(GetEventsResponse.parse(await Promise.all(events.map(e => hydrateEvent(e, user?.id)))));
});
router.get("/events/:id", async (req, res): Promise<void> => {
  const parsed = GetEventDetailParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid event");
  const user = await currentUser(req);
  res.json(GetEventDetailResponse.parse(await hydrateEvent(await getEvent(parsed.data.id), user?.id)));
});
router.post("/events", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Please complete all event fields with valid values");
  const user: UserRow = res.locals.user;
  const input = validateEvent(parsed.data, user);
  const event = await db.transaction(async tx => {
    const [created] = await tx.insert(eventsTable).values({ ...input, hostId: user.id }).returning();
    await tx.insert(attendeesTable).values({ eventId: created!.id, userId: user.id });
    await tx.insert(groupMessagesTable).values({ eventId: created!.id, senderId: user.id, text: `Welcome to ${created!.title}! This is your event group chat.`, isSystem: true });
    return created!;
  });
  res.status(201).json(CreateEventResponse.parse(await hydrateEvent(event, user.id)));
});
router.put("/events/:id", requireUser, async (req, res): Promise<void> => {
  const params = EditEventParams.safeParse(req.params);
  const parsed = EditEventBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new HttpError(400, "Please complete all event fields with valid values");
  const user: UserRow = res.locals.user;
  const input = validateEvent(parsed.data, user);
  const event = await db.transaction(async tx => {
    const [existing] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!existing) throw new HttpError(404, "Event not found");
    if (existing.hostId !== user.id) throw new HttpError(403, "Only the host can edit this event");
    if (existing.status === "canceled") throw new HttpError(409, "Canceled events cannot be edited");
    const attendees = await tx.select({ age: usersTable.age }).from(attendeesTable)
      .innerJoin(usersTable, eq(attendeesTable.userId, usersTable.id)).where(eq(attendeesTable.eventId, existing.id));
    if (attendees.length > input.maxPeople) throw new HttpError(409, "Capacity cannot be lower than the current attendee count");
    if (attendees.some(a => a.age < input.minAge || a.age > input.maxAge)) throw new HttpError(409, "The age range must include all current attendees");
    const [updated] = await tx.update(eventsTable).set(input).where(eq(eventsTable.id, existing.id)).returning();
    return updated!;
  });
  res.json(await hydrateEvent(event, user.id));
});
router.post("/events/:id/join", requireUser, async (req, res): Promise<void> => {
  const params = JoinEventParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid event");
  const user: UserRow = res.locals.user;
  await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.status === "canceled") throw new HttpError(409, "This event has been canceled");
    if (event.isPrivate || event.isPaid) throw new HttpError(403, "This event requires a join request and host approval");
    if (user.age < event.minAge || user.age > event.maxAge) throw new HttpError(403, `Age restricted: This event is for ages ${event.minAge}–${event.maxAge}`);
    const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, event.id));
    if (attendees.some(a => a.userId === user.id)) throw new HttpError(409, "You have already joined this event");
    if (attendees.length >= event.maxPeople) throw new HttpError(409, "Event Full");
    if (event.startsAt.getTime() < Date.now()) throw new HttpError(400, "This event has already started");
    await tx.insert(attendeesTable).values({ eventId: event.id, userId: user.id });
    await tx.update(requestsTable).set({ status: "accepted" }).where(and(eq(requestsTable.eventId, event.id), eq(requestsTable.userId, user.id)));
  });
  res.json(await hydrateEvent(await getEvent(params.data.id), user.id));
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
    await tx.update(requestsTable).set({ status: "withdrawn" }).where(and(eq(requestsTable.eventId, event.id), eq(requestsTable.userId, user.id)));
  });
  res.json(await hydrateEvent(await getEvent(params.data.id), user.id));
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
  res.json(await hydrateEvent(await getEvent(params.data.id), user.id));
});
router.post("/events/:id/cancel", requireUser, async (req, res): Promise<void> => {
  const params = CancelEventParams.safeParse(req.params);
  const input = CancelEventBody.safeParse(req.body);
  if (!params.success || !input.success || !input.data.reason.trim()) throw new HttpError(400, "Please explain why you are canceling this event");
  const user: UserRow = res.locals.user;
  const reason = input.data.reason.trim();
  await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.hostId !== user.id) throw new HttpError(403, "Only the host can cancel this event");
    if (event.status === "canceled") throw new HttpError(409, "This event is already canceled");
    await tx.update(eventsTable).set({ status: "canceled", cancellationReason: reason }).where(eq(eventsTable.id, event.id));
    const text = `${event.title} — Canceled: ${reason}`;
    const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, event.id));
    const pending = await tx.select().from(requestsTable).where(and(eq(requestsTable.eventId, event.id), eq(requestsTable.status, "pending")));
    const recipients = [...new Set([...attendees.map(a => a.userId), ...pending.map(r => r.userId)])];
    if (recipients.length) await tx.insert(notificationsTable).values(recipients.map(userId => ({ userId, eventId: event.id, kind: "cancellation", text })));
    await tx.update(requestsTable).set({ status: "declined" }).where(and(eq(requestsTable.eventId, event.id), eq(requestsTable.status, "pending")));
    await tx.insert(groupMessagesTable).values({ eventId: event.id, senderId: user.id, text, isSystem: true });
  });
  res.json(await hydrateEvent(await getEvent(params.data.id), user.id));
});
export default router;
