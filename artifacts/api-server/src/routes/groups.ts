import { Router, type IRouter } from "express";
import { db, eventsTable, attendeesTable, groupMessagesTable, notificationsTable } from "@workspace/db";
import { and, eq, asc } from "drizzle-orm";
import { GetGroupMessagesParams, GetGroupMessagesResponse, SendGroupMessageParams, SendGroupMessageBody,
  SendGroupMessageResponse, ReadNotificationParams } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { groupMessageJson } from "../lib/community";

const router: IRouter = Router();
router.get("/events/:id/group-messages", requireUser, async (req, res): Promise<void> => {
  const params = GetGroupMessagesParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid group");
  const userId = res.locals.user.id;
  // Membership and read receipt use the same lock as leave/cancel/approval.
  const messages = await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    const [membership] = await tx.select().from(attendeesTable).where(and(eq(attendeesTable.eventId, event.id), eq(attendeesTable.userId, userId)));
    if (!membership) throw new HttpError(403, "Only joined or accepted attendees can access this group chat");
    const readAt = new Date();
    const history = await tx.select().from(groupMessagesTable).where(eq(groupMessagesTable.eventId, event.id))
      .orderBy(asc(groupMessagesTable.createdAt), asc(groupMessagesTable.id));
    await tx.update(attendeesTable).set({ groupReadAt: readAt }).where(and(eq(attendeesTable.eventId, event.id), eq(attendeesTable.userId, userId)));
    return history;
  });
  res.json(GetGroupMessagesResponse.parse(await Promise.all(messages.map(groupMessageJson))));
});
router.post("/events/:id/group-messages", requireUser, async (req, res): Promise<void> => {
  const params = SendGroupMessageParams.safeParse(req.params);
  const input = SendGroupMessageBody.safeParse(req.body);
  if (!params.success || !input.success || !input.data.text.trim()) throw new HttpError(400, "Enter a message of 1–2000 characters");
  const userId = res.locals.user.id;
  const message = await db.transaction(async tx => {
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.status === "canceled") throw new HttpError(409, "This event has been canceled; group history is read-only");
    const [membership] = await tx.select().from(attendeesTable).where(and(eq(attendeesTable.eventId, event.id), eq(attendeesTable.userId, userId)));
    if (!membership) throw new HttpError(403, "Only joined or accepted attendees can access this group chat");
    const [sent] = await tx.insert(groupMessagesTable).values({ eventId: event.id, senderId: userId, text: input.data.text.trim() }).returning();
    return sent!;
  });
  res.status(201).json(SendGroupMessageResponse.parse(await groupMessageJson(message)));
});
router.patch("/notifications/:id/read", requireUser, async (req, res): Promise<void> => {
  const params = ReadNotificationParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Invalid notification");
  const updated = await db.update(notificationsTable).set({ readAt: new Date() }).where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.userId, res.locals.user.id))).returning({ id: notificationsTable.id });
  if (!updated.length) throw new HttpError(404, "Notification not found");
  res.json({ success: true });
});
export default router;
