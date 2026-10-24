import { Router, type IRouter } from "express";
import { db, eventsTable, messagesTable, usersTable, type UserRow, type MessageRow } from "@workspace/db";
import { and, or, eq, asc, desc, isNull } from "drizzle-orm";
import { GetMessagesParams, SendMessageParams, SendMessageBody, GetMessagesResponse, GetInboxResponse, SendMessageResponse } from "@workspace/api-zod";
import { publicUser, requireUser } from "../lib/auth";
import { getEvent } from "../lib/events";
import { HttpError } from "../lib/errors";

const router: IRouter = Router();
const messageJson = (m: MessageRow) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null });
function conversationWhere(eventId: number, me: number, other: number) {
  return and(eq(messagesTable.eventId, eventId), or(
    and(eq(messagesTable.senderId, me), eq(messagesTable.recipientId, other)),
    and(eq(messagesTable.senderId, other), eq(messagesTable.recipientId, me)),
  ));
}
router.get("/inbox", requireUser, async (_req, res): Promise<void> => {
  const user: UserRow = res.locals.user;
  const messages = await db.select().from(messagesTable)
    .where(or(eq(messagesTable.senderId, user.id), eq(messagesTable.recipientId, user.id)))
    .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id));
  const grouped = new Map<string, { eventId: number; otherId: number; lastMessage: ReturnType<typeof messageJson>; unreadCount: number }>();
  for (const message of messages) {
    const otherId = message.senderId === user.id ? message.recipientId : message.senderId;
    const key = `${message.eventId}:${otherId}`;
    let group = grouped.get(key);
    if (!group) {
      group = { eventId: message.eventId, otherId, lastMessage: messageJson(message), unreadCount: 0 };
      grouped.set(key, group);
    }
    if (message.recipientId === user.id && !message.readAt) group.unreadCount++;
  }
  const conversations = await Promise.all([...grouped.values()].map(async group => {
    const event = await getEvent(group.eventId);
    const [other] = await db.select().from(usersTable).where(eq(usersTable.id, group.otherId));
    return { eventId: event.id, eventTitle: event.title, eventEmoji: event.emoji, otherUser: publicUser(other!),
      lastMessage: group.lastMessage, unreadCount: group.unreadCount, allowMessages: event.allowMessages };
  }));
  res.json(GetInboxResponse.parse({ conversations, unreadCount: conversations.reduce((sum, c) => sum + c.unreadCount, 0) }));
});
router.get("/messages/:eventId/:userId", requireUser, async (req, res): Promise<void> => {
  const parsed = GetMessagesParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid conversation");
  const { eventId, userId } = parsed.data;
  const me: UserRow = res.locals.user;
  const event = await getEvent(eventId);
  if (me.id === userId) throw new HttpError(400, "Choose another user");
  if (event.hostId !== me.id && event.hostId !== userId) throw new HttpError(403, "Conversations must include the event host");
  const [other] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!other) throw new HttpError(404, "User not found");
  // Only messages between the current session and the requested person can be read.
  await db.update(messagesTable).set({ readAt: new Date() }).where(and(
    eq(messagesTable.eventId, eventId), eq(messagesTable.senderId, userId),
    eq(messagesTable.recipientId, me.id), isNull(messagesTable.readAt),
  ));
  const messages = await db.select().from(messagesTable).where(conversationWhere(eventId, me.id, userId))
    .orderBy(asc(messagesTable.createdAt), asc(messagesTable.id));
  res.json(GetMessagesResponse.parse(messages.map(messageJson)));
});
router.post("/messages/:eventId/:userId", requireUser, async (req, res): Promise<void> => {
  const parsed = SendMessageParams.safeParse(req.params);
  const input = SendMessageBody.safeParse(req.body);
  if (!parsed.success || !input.success || !input.data.text.trim()) throw new HttpError(400, "Enter a message of 1–2000 characters");
  const { eventId, userId } = parsed.data;
  const me: UserRow = res.locals.user;
  if (me.id === userId) throw new HttpError(400, "You cannot message yourself");
  const message = await db.transaction(async tx => {
    // The shared event lock makes sending atomic with the host's live toggle.
    const [event] = await tx.select().from(eventsTable).where(eq(eventsTable.id, eventId)).for("update");
    if (!event) throw new HttpError(404, "Event not found");
    if (event.hostId !== me.id && event.hostId !== userId) throw new HttpError(403, "Conversations must include the event host");
    if (me.id !== event.hostId && !event.allowMessages) throw new HttpError(403, "The host has turned off private messages for this event");
    const [other] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!other) throw new HttpError(404, "User not found");
    // A host can reply only to an existing incoming conversation.
    if (me.id === event.hostId) {
      const existing = await tx.select({ id: messagesTable.id }).from(messagesTable)
        .where(conversationWhere(eventId, me.id, userId)).limit(1);
      if (!existing.length) throw new HttpError(403, "Reply to an existing conversation from your inbox");
    }
    const [sent] = await tx.insert(messagesTable).values({ eventId, senderId: me.id, recipientId: userId, text: input.data.text.trim() }).returning();
    return sent!;
  });
  res.status(201).json(SendMessageResponse.parse(messageJson(message)));
});
export default router;
