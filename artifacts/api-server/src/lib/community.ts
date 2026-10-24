import { db, usersTable, type RequestRow, type GroupMessageRow } from "@workspace/db";
import { eq } from "drizzle-orm";
import { publicUser } from "./auth";
import { getEvent } from "./events";

export async function requestJson(request: RequestRow) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
  const event = await getEvent(request.eventId);
  return { id: request.id, eventId: event.id, eventTitle: event.title, eventEmoji: event.emoji,
    applicant: publicUser(user!), answers: request.answers, status: request.status, createdAt: request.createdAt.toISOString() };
}
export async function groupMessageJson(message: GroupMessageRow) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, message.senderId));
  return { id: message.id, eventId: message.eventId, sender: publicUser(user!), text: message.text, isSystem: message.isSystem, createdAt: message.createdAt.toISOString() };
}
