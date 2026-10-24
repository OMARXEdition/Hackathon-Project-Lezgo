// Non-destructive-to-user-data API regression check. Uses only newly created
// verification events and labeled demo identities. Prints fixture IDs for cleanup.
import assert from "node:assert/strict";

const base = process.env.LEZGO_TEST_BASE ?? "http://localhost:80";
const fixtures = [];
function session() {
  let cookie = "";
  return async (path, method = "GET", data) => {
    const res = await fetch(`${base}/api${path}`, {
      method, headers: { ...(cookie ? { cookie } : {}), ...(data === undefined ? {} : { "content-type": "application/json" }) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const body = await res.json();
    return { status: res.status, body };
  };
}
async function run() {
  const guest = session(), host = session(), first = session(), second = session();
  const users = (await guest("/demo-users")).body;
  const deniz = users.find(u => u.username === "deniz");
  const elif = users.find(u => u.username === "elif");
  const can = users.find(u => u.username === "can");
  assert.ok(deniz && elif && can, "Demo users are available");
  await host("/auth/demo", "POST", { userId: deniz.id });
  await first("/auth/demo", "POST", { userId: elif.id });
  await second("/auth/demo", "POST", { userId: can.id });
  const all = (await guest("/events")).body;
  for (const [privateFlag, paidFlag] of [[false, false], [false, true], [true, false], [true, true]]) {
    assert.ok(all.some(e => e.isPrivate === privateFlag && e.isPaid === paidFlag), `Seed contains private=${privateFlag}, paid=${paidFlag}`);
  }
  const input = {
    title: `Lezgo verification ${Date.now()}`, description: "Temporary API verification fixture",
    category: "study", locationName: "Moda verification meeting point", lat: 40.981, lng: 29.025,
    startsAt: new Date(Date.now() + 7 * 86400000).toISOString(), maxPeople: 2,
    minAge: 18, maxAge: 40, emoji: "📚", allowMessages: true,
    isPrivate: true, isPaid: true, price: 15, costDetails: "Court rental & equipment",
    languages: ["Arabic", "English"], screeningQuestions: ["Skill level?", "Favorite activity?"],
  };
  assert.equal((await guest("/events", "POST", input)).status, 401);
  const create = await host("/events", "POST", input);
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const id = create.body.id;
  fixtures.push(id);
  assert.equal(create.body.price, 15);
  assert.equal(create.body.costDetails, input.costDetails);
  assert.equal((await second(`/events/${id}`, "PUT", input)).status, 403);
  assert.equal((await first(`/events/${id}/join`, "POST")).status, 403);
  assert.equal((await first(`/events/${id}/group-messages`)).status, 403);
  assert.equal((await first(`/events/${id}/requests`, "POST", { answers: ["Beginner"] })).status, 400);
  const applicationA = await first(`/events/${id}/requests`, "POST", { answers: ["Beginner", "Coffee"] });
  const applicationB = await second(`/events/${id}/requests`, "POST", { answers: ["Intermediate", "Volleyball"] });
  assert.equal(applicationA.status, 201);
  assert.equal(applicationB.status, 201);
  assert.equal((await first(`/events/${id}/requests`, "POST", { answers: ["Beginner", "Coffee"] })).status, 409);
  assert.equal((await first(`/events/${id}/requests`)).status, 403);
  assert.equal((await first(`/events/${id}`)).body.myRequestStatus, "pending");
  assert.equal((await host(`/events/${id}/requests`)).body.filter(r => r.status === "pending").length, 2);
  assert.equal((await first(`/events/${id}/requests/${applicationA.body.id}`, "PATCH", { decision: "accept" })).status, 403);
  // Concurrent approvals contend on the event row: only one remaining spot.
  const decisions = await Promise.all([
    host(`/events/${id}/requests/${applicationA.body.id}`, "PATCH", { decision: "accept" }),
    host(`/events/${id}/requests/${applicationB.body.id}`, "PATCH", { decision: "accept" }),
  ]);
  assert.deepEqual(decisions.map(r => r.status).sort(), [200, 409]);
  const winner = decisions[0].status === 200 ? first : second;
  const loser = decisions[0].status === 200 ? second : first;
  assert.equal((await winner(`/events/${id}`)).body.joinedCount, 2);
  assert.equal((await winner(`/events/${id}`)).body.myRequestStatus, "accepted");
  assert.equal((await loser(`/events/${id}/group-messages`)).status, 403);
  const groupSend = await winner(`/events/${id}/group-messages`, "POST", { text: "Accepted attendee message" });
  assert.equal(groupSend.status, 201);
  const history = await host(`/events/${id}/group-messages`);
  assert.ok(history.body.some(m => m.text === "Accepted attendee message"));
  const acceptedInbox = (await winner("/inbox")).body;
  assert.ok(acceptedInbox.groups.some(g => g.eventId === id));
  assert.ok(acceptedInbox.notifications.some(n => n.eventId === id && n.kind === "accepted"));
  assert.equal((await host(`/events/${id}/cancel`, "POST", { reason: "   " })).status, 400);
  assert.equal((await host(`/events/${id}`)).body.status, "active");
  assert.equal((await winner(`/events/${id}/cancel`, "POST", { reason: "Unauthorized" })).status, 403);
  const reason = "Heavy rain — court closed. Please stay safe.";
  const canceled = await host(`/events/${id}/cancel`, "POST", { reason });
  assert.equal(canceled.status, 200);
  assert.equal(canceled.body.cancellationReason, reason);
  const canceledInbox = (await winner("/inbox")).body;
  const notice = canceledInbox.notifications.find(n => n.eventId === id && n.kind === "cancellation");
  assert.ok(notice.text.includes(reason) && notice.text.includes(input.title));
  assert.equal((await host(`/notifications/${notice.id}/read`, "PATCH")).status, 404);
  assert.equal((await winner(`/notifications/${notice.id}/read`, "PATCH")).status, 200);
  const canceledHistory = await winner(`/events/${id}/group-messages`);
  assert.ok(canceledHistory.body.some(m => m.isSystem && m.text.includes(reason) && m.text.includes(input.title)));
  assert.equal((await winner(`/events/${id}/group-messages`, "POST", { text: "Must not send" })).status, 409);
  assert.equal((await host(`/events/${id}`, "PUT", input)).status, 409);
  assert.equal((await host(`/events/${id}/cancel`, "POST", { reason })).status, 409);
  assert.equal((await host(`/events/${id}/requests`)).body.filter(r => r.status === "pending").length, 0);
  const freeInput = { ...input, title: `${input.title} public`, isPrivate: false, isPaid: false, price: 0, costDetails: "", screeningQuestions: [] };
  const free = await host("/events", "POST", freeInput);
  assert.equal(free.status, 201);
  fixtures.push(free.body.id);
  assert.equal((await first(`/events/${free.body.id}/join`, "POST")).status, 200);
  assert.equal((await first(`/events/${free.body.id}/group-messages`)).status, 200);
  assert.equal((await first(`/events/${free.body.id}/leave`, "POST")).status, 200);
  assert.equal((await first(`/events/${free.body.id}/group-messages`)).status, 403);
  const edit = await host(`/events/${free.body.id}`, "PUT", { ...freeInput, isPrivate: true, screeningQuestions: ["New question"], languages: ["Turkish"] });
  assert.equal(edit.status, 200);
  assert.deepEqual(edit.body.screeningQuestions, ["New question"]);
  assert.deepEqual(edit.body.languages, ["Turkish"]);
  console.log("PASS: seed mix, auth/ownership, screening, private/paid approval, concurrent capacity, group authorization, cancellation broadcast, notification ownership, public joining/leaving, event editing.");
}
try { await run(); } finally { console.log(`VERIFICATION_EVENT_IDS=${JSON.stringify(fixtures)}`); }
