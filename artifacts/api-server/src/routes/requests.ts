import { Router, type IRouter } from "express";
import { db, eventsTable, requestsTable, attendeesTable, usersTable, notificationsTable, type UserRow } from "@workspace/db";
import { and, eq, asc } from "drizzle-orm";
import { GetEventRequestsParams, GetEventRequestsResponse, RequestToJoinParams, RequestToJoinBody,
  RequestToJoinResponse, DecideRequestParams, DecideRequestBody, DecideRequestResponse } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { getEvent } from "../lib/events";
import { requestJson } from "../lib/community";

const router: IRouter = Router();
router.get("/events/:id/requests", requireUser, async (req, res): Promise<void> => {
  const params = GetEventRequestsParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid event");
  const event = await getEvent(params.data.id);
  if (event.hostId !== res.locals.user.id) throw new HttpError(403, "Only the host can see applications");
  const requests = await db.select().from(requestsTable).where(eq(requestsTable.eventId, event.id)).orderBy(asc(requestsTable.createdAt));
  res.json(GetEventRequestsResponse.parse(await Promise.all(requests.map(requestJson))));
});
router.post("/events/:id/requests", requireUser, async (req, res): Promise<void> => {
  const params = RequestToJoinParams.safeParse(req.params);
  const input = RequestToJoinBody.safeParse(req.body);
  if (!params.success || !input.success) throw new HttpError(400, "Answer every screening question");
  const user: UserRow = res.locals.user;
  const request = await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.status === "canceled") throw new HttpError(409, "This event has been canceled");
    if (event.startsAt.getTime() <= Date.now()) throw new HttpError(409, "This event has already started");
    if (event.hostId === user.id) throw new HttpError(409, "You are the host of this event");
    if (!event.isPrivate && !event.isPaid) throw new HttpError(400, "This free public event can be joined immediately");
    if (user.age < event.minAge || user.age > event.maxAge) throw new HttpError(403, `Age restricted: This event is for ages ${event.minAge}–${event.maxAge}`);
    const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, event.id));
    if (attendees.some(a => a.userId === user.id)) throw new HttpError(409, "You have already joined this event");
    if (attendees.length >= event.maxPeople) throw new HttpError(409, "Event Full");
    const questions = event.isPrivate ? event.screeningQuestions : [];
    if (input.data.answers.length !== questions.length || input.data.answers.some(a => !a.trim())) throw new HttpError(400, "Answer every screening question");
    const [existing] = await tx.select().from(requestsTable).where(and(eq(requestsTable.eventId, event.id), eq(requestsTable.userId, user.id)));
    if (existing?.status === "pending") throw new HttpError(409, "Your request is already pending");
    if (existing?.status === "declined") throw new HttpError(409, "The host declined your request for this event");
    const answers = questions.map((question, i) => ({ question, answer: input.data.answers[i]!.trim() }));
    const [created] = await tx.insert(requestsTable).values({ eventId: event.id, userId: user.id, answers })
      .onConflictDoUpdate({ target: [requestsTable.eventId, requestsTable.userId], set: { answers, status: "pending", createdAt: new Date() } }).returning();
    await tx.insert(notificationsTable).values({ userId: event.hostId, eventId: event.id, kind: "request", text: `${user.username} requested to join ${event.title}` });
    return created!;
  });
  res.status(201).json(RequestToJoinResponse.parse(await requestJson(request)));
});
router.patch("/events/:id/requests/:requestId", requireUser, async (req, res): Promise<void> => {
  const params = DecideRequestParams.safeParse(req.params);
  const input = DecideRequestBody.safeParse(req.body);
  if (!params.success || !input.success) throw new HttpError(400, "Invalid decision");
  const host: UserRow = res.locals.user;
  const request = await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.hostId !== host.id) throw new HttpError(403, "Only the host can decide requests");
    if (event.status === "canceled") throw new HttpError(409, "This event has been canceled");
    const [application] = await tx.select().from(requestsTable).where(and(eq(requestsTable.id, params.data.requestId), eq(requestsTable.eventId, event.id))).for("update");
    if (!application) throw new HttpError(404, "Request not found");
    if (application.status !== "pending") throw new HttpError(409, "This request has already been decided");
    const accept = input.data.decision === "accept";
    if (accept) {
      if (event.startsAt.getTime() <= Date.now()) throw new HttpError(409, "This event has already started");
      const [applicant] = await tx.select().from(usersTable).where(eq(usersTable.id, application.userId));
      if (!applicant || applicant.age < event.minAge || applicant.age > event.maxAge) throw new HttpError(403, "The applicant is outside the event age range");
      const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, event.id));
      if (attendees.length >= event.maxPeople) throw new HttpError(409, "Event Full");
      await tx.insert(attendeesTable).values({ eventId: event.id, userId: application.userId }).onConflictDoNothing();
    }
    const [updated] = await tx.update(requestsTable).set({ status: accept ? "accepted" : "declined" }).where(eq(requestsTable.id, application.id)).returning();
    await tx.insert(notificationsTable).values({ userId: application.userId, eventId: event.id, kind: accept ? "accepted" : "declined",
      text: accept ? `You're in! The host accepted your request for ${event.title}. Your event group chat is now available.` : `The host declined your request for ${event.title}.` });
    return updated!;
  });
  res.json(DecideRequestResponse.parse(await requestJson(request)));
});
export default router;
