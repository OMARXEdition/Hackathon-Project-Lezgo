import { randomBytes } from "node:crypto";
import { db, usersTable, eventsTable, attendeesTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedDemo() {
  // One advisory lock prevents duplicate seed data if two instances start together.
  await db.transaction(async tx => {
    const { sql } = await import("drizzle-orm");
    await tx.execute(sql`select pg_advisory_xact_lock(7826301)`);
    const existing = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.isDemo, true)).limit(1);
    if (existing.length) return;
    const demoDefinitions = [
      { username: "deniz", age: 19, avatarSeed: "Deniz" },
      { username: "elif", age: 21, avatarSeed: "Elif" },
      { username: "can", age: 24, avatarSeed: "Can" },
      { username: "zeynep", age: 26, avatarSeed: "Zeynep" },
      { username: "mert", age: 31, avatarSeed: "Mert" },
    ];
    const users = [];
    for (const definition of demoDefinitions) {
      const [user] = await tx.insert(usersTable).values({ ...definition, passwordHash: await hashPassword(randomBytes(32).toString("hex")), isDemo: true }).returning();
      users.push(user!);
    }
    const day = (offset: number, hour: number) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + offset);
      date.setUTCHours(hour - 3, 0, 0, 0);
      return date;
    };
    const definitions = [
      { host: 1, title: "Coffee Talk in English to Practice", description: "A good coffee, a sea breeze, and a little English practice. All levels welcome — no lessons, just friendly conversation. Meet by the park's waterfront café.", category: "coffee", locationName: "Moda Seaside Park", lat: 40.9809, lng: 29.0247, startsAt: day(1, 16), maxPeople: 6, minAge: 18, maxAge: 27, emoji: "☕", allowMessages: true, members: [1, 2, 3, 0] },
      { host: 2, title: "Compound Volleyball Match", description: "A friendly six-person volleyball match. Bring water and comfortable shoes; we'll bring the ball. Beginners are absolutely welcome.", category: "sports", locationName: "Fenerbahçe Sports Court", lat: 40.9708, lng: 29.0425, startsAt: day(1, 18), maxPeople: 6, minAge: 18, maxAge: 35, emoji: "🏐", allowMessages: true, members: [2, 3, 4] },
      { host: 3, title: "Morning 5K Running Group", description: "Start the day with an easy-paced 5K along the waterfront. No one gets left behind. Stretching and optional coffee afterwards.", category: "running", locationName: "Caddebostan Coast", lat: 40.9628, lng: 29.0631, startsAt: day(2, 8), maxPeople: 8, minAge: 20, maxAge: 40, emoji: "🏃", allowMessages: true, members: [3, 2, 4] },
      { host: 4, title: "Coffee Talks & Book Swap", description: "Bring a book you've loved and leave with a new recommendation. A relaxed afternoon of stories, conversation, and fresh coffee.", category: "coffee", locationName: "Beşiktaş Book Café", lat: 41.0437, lng: 29.0069, startsAt: day(2, 15), maxPeople: 4, minAge: 21, maxAge: 40, emoji: "🗣️", allowMessages: true, members: [4, 1, 2, 3] },
      { host: 0, title: "UI/UX & Coding Study Session", description: "Work on your side project with a friendly campus crew. Designers, developers, and curious beginners welcome. Bring your laptop and something you're excited about.", category: "study", locationName: "Marmara University Campus", lat: 40.9864, lng: 29.0523, startsAt: day(3, 14), maxPeople: 6, minAge: 18, maxAge: 25, emoji: "📚", allowMessages: false, members: [0, 1, 2] },
      { host: 1, title: "Evening Board Games", description: "Catan, Codenames, and whatever else fits on the table. We'll explain the rules — just bring yourself. A friendly way to meet your neighbors.", category: "games", locationName: "Yeldeğirmeni Games Café", lat: 40.9977, lng: 29.0281, startsAt: day(3, 19), maxPeople: 5, minAge: 18, maxAge: 32, emoji: "🎲", allowMessages: true, members: [1, 3] },
    ];
    const created = [];
    for (const { host, members, ...definition } of definitions) {
      const [event] = await tx.insert(eventsTable).values({ ...definition, hostId: users[host]!.id }).returning();
      for (const member of members) await tx.insert(attendeesTable).values({ eventId: event!.id, userId: users[member]!.id });
      created.push(event!);
    }
    const sampleMessages = [
      { eventId: created[0]!.id, senderId: users[2]!.id, recipientId: users[1]!.id, text: "Hey Elif! Is it okay if my English is a bit rusty?", createdAt: new Date(Date.now() - 45 * 60000), readAt: new Date(Date.now() - 40 * 60000) },
      { eventId: created[0]!.id, senderId: users[1]!.id, recipientId: users[2]!.id, text: "Of course! That's exactly what we're here for. See you by the waterfront café!", createdAt: new Date(Date.now() - 38 * 60000), readAt: null },
      { eventId: created[1]!.id, senderId: users[0]!.id, recipientId: users[2]!.id, text: "Hi Can, do I need to bring a volleyball?", createdAt: new Date(Date.now() - 20 * 60000), readAt: null },
      { eventId: created[5]!.id, senderId: users[3]!.id, recipientId: users[1]!.id, text: "Looking forward to game night! I can bring Codenames.", createdAt: new Date(Date.now() - 10 * 60000), readAt: null },
    ];
    await tx.insert(messagesTable).values(sampleMessages);
  });
  logger.info("PulseMap demonstration data is ready");
}
