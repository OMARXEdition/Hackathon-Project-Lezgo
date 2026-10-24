import { randomBytes } from "node:crypto";
import { db, usersTable, eventsTable, attendeesTable, messagesTable, groupMessagesTable, requestsTable, notificationsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth";
import { logger } from "./logger";

export async function seedDemo() {
  // One advisory lock prevents duplicate seed data if two instances start together.
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(7826301)`);
    // This reserved judging account must also exist when demo data was seeded earlier.
    const [admin] = await tx.select().from(usersTable).where(eq(usersTable.username, "Admin"));
    const adminPasswordValid = admin ? await verifyPassword("hackathon", admin.passwordHash) : false;
    if (!admin) {
      await tx.insert(usersTable).values({
        username: "Admin", passwordHash: await hashPassword("hackathon"),
        age: 25, avatarSeed: "Admin", isDemo: false,
      });
    } else if (!adminPasswordValid || admin.isDemo) {
      await tx.update(usersTable).set({
        passwordHash: adminPasswordValid ? admin.passwordHash : await hashPassword("hackathon"),
        isDemo: false,
      }).where(eq(usersTable.id, admin.id));
    }
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
  await seedLezgoUpgrade();
  logger.info("Lezgo demonstration data is ready");
}

async function seedLezgoUpgrade() {
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(7826301)`);
    const demoUsers = await tx.select().from(usersTable).where(eq(usersTable.isDemo, true));
    const userByName = new Map(demoUsers.map(u => [u.username, u]));
    const configs = [
      { title: "Coffee Talk in English to Practice", isPrivate: false, isPaid: false, price: 0, costDetails: "", languages: ["English", "Turkish"], screeningQuestions: [], applicant: null, answers: [] },
      { title: "Compound Volleyball Match", isPrivate: false, isPaid: true, price: 15, costDetails: "Court rental & equipment", languages: ["Turkish", "English", "Arabic"], screeningQuestions: [], applicant: "elif", answers: [] },
      { title: "Morning 5K Running Group", isPrivate: false, isPaid: false, price: 0, costDetails: "", languages: ["Arabic", "English", "Turkish"], screeningQuestions: [], applicant: null, answers: [] },
      { title: "Coffee Talks & Book Swap", isPrivate: true, isPaid: true, price: 8, costDetails: "Shared café table & one drink", languages: ["Turkish", "English"], screeningQuestions: ["Which book are you bringing?"], applicant: null, answers: [] },
      { title: "UI/UX & Coding Study Session", isPrivate: true, isPaid: false, price: 0, costDetails: "", languages: ["English", "Arabic"], screeningQuestions: ["What is your software skill level?", "What would you like to work on?"], applicant: "zeynep", answers: ["Intermediate — I build React apps.", "A neighborhood activity app and its design system."] },
      { title: "Evening Board Games", isPrivate: true, isPaid: true, price: 10, costDetails: "Game library access & snacks", languages: ["Turkish", "English", "Arabic"], screeningQuestions: ["What is your favorite board game?", "Are you happy to learn a new game?"], applicant: "deniz", answers: ["Codenames", "Absolutely — happy to learn and help explain the rules."] },
    ];
    for (const { title, applicant, answers, ...config } of configs) {
      const [event] = await tx.select({ event: eventsTable }).from(eventsTable)
        .innerJoin(usersTable, eq(eventsTable.hostId, usersTable.id)).where(and(eq(eventsTable.title, title), eq(usersTable.isDemo, true)));
      if (!event) continue;
      const e = event.event;
      const [group] = await tx.select({ id: groupMessagesTable.id }).from(groupMessagesTable).where(eq(groupMessagesTable.eventId, e.id)).limit(1);
      // A seeded group is the durable one-time upgrade marker; never overwrite host edits.
      if (group) continue;
      const upgraded = { ...config, ...(title.includes("Study Session") ? { maxAge: 30 } : {}),
        ...(title.includes("Book Swap") ? { maxPeople: 6 } : {}) };
      await tx.update(eventsTable).set(upgraded).where(eq(eventsTable.id, e.id));
      const attendees = await tx.select().from(attendeesTable).where(eq(attendeesTable.eventId, e.id));
      await tx.insert(groupMessagesTable).values([
        { eventId: e.id, senderId: e.hostId, text: `Welcome to ${title}! Let's use this chat to coordinate.`, isSystem: true, createdAt: new Date(Date.now() - 35 * 60000) },
        { eventId: e.id, senderId: attendees.find(a => a.userId !== e.hostId)?.userId ?? e.hostId, text: "Looking forward to meeting everyone! I'll be there a few minutes early.", createdAt: new Date(Date.now() - 10 * 60000) },
      ]);
      if (config.isPrivate || config.isPaid) {
        for (const attendee of attendees.filter(a => a.userId !== e.hostId)) {
          await tx.insert(requestsTable).values({ eventId: e.id, userId: attendee.userId, status: "accepted",
            answers: config.screeningQuestions.map(question => ({ question, answer: question.includes("skill") ? "Intermediate" : "Happy to join and take part!" })) }).onConflictDoNothing();
        }
      }
      const applicantUser = applicant ? userByName.get(applicant) : null;
      if (applicantUser && !attendees.some(a => a.userId === applicantUser.id)) {
        await tx.insert(requestsTable).values({ eventId: e.id, userId: applicantUser.id,
          answers: config.screeningQuestions.map((question, i) => ({ question, answer: answers[i] ?? "Looking forward to joining!" })) }).onConflictDoNothing();
        await tx.insert(notificationsTable).values({ eventId: e.id, userId: e.hostId, kind: "request", text: `${applicantUser.username} requested to join ${title}` });
      }
    }
  });
}
