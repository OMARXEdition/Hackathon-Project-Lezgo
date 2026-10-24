import assert from "node:assert/strict";
import test from "node:test";
import type { Event, User } from "@workspace/api-client-react";
import { EMPTY_FILTERS, filterEvents, haversineKm, needsApproval } from "./pulse";

const me: User = { id: 1, username: "tester", age: 22, avatarSeed: "Test", isDemo: true };
function event(id: number, patch: Partial<Event> = {}): Event {
  return { id, title: `Plan ${id}`, description: "", category: "coffee", locationName: "Moda",
    lat: 0, lng: 0, startsAt: "2030-01-01T12:00:00Z", maxPeople: 6, minAge: 18, maxAge: 30,
    emoji: "☕", allowMessages: true, isPrivate: false, isPaid: false, price: 0, costDetails: "",
    languages: ["English"], screeningQuestions: [], host: me, attendees: [me], joinedCount: 1,
    status: "active", cancellationReason: "", inviteCode: String(id), myRequestStatus: null, pendingRequestCount: 0, ...patch };
}
test("Haversine returns real distances, including identical points and the date line", () => {
  assert.equal(haversineKm([41, 29], [41, 29]), 0);
  assert.ok(Math.abs(haversineKm([0, 0], [1, 0]) - 111.195) < 0.01);
  assert.ok(Math.abs(haversineKm([0, 179.9], [0, -179.9]) - 22.239) < 0.01);
});
test("nearby excludes beyond 15km, includes the boundary, and orders nearest first", () => {
  const degree15 = 15 / 6371 * 180 / Math.PI;
  const rows = [event(1, { lat: degree15 }), event(2, { lat: 0.05 }), event(3, { lat: 0.14 })];
  const actual = filterEvents(rows, { ...EMPTY_FILTERS, nearby: true }, me, [0, 0]);
  assert.deepEqual(actual.map(e => e.id), [2, 1]);
  assert.deepEqual(rows.map(e => e.id), [1, 2, 3], "Input array must not mutate");
});
test("multi-category and multi-language OR matches combine across filters with AND", () => {
  const rows = [event(1, { languages: ["Arabic"] }), event(2, { category: "sports", languages: ["English"] }),
    event(3, { category: "games", languages: ["English"] }), event(4, { languages: ["French"] })];
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, categories: ["coffee", "sports"], languages: ["Arabic", "English"] }, me).map(e => e.id), [1, 2]);
  assert.equal(filterEvents(rows, { ...EMPTY_FILTERS, categories: [], languages: [] }, me).length, 4);
});
test("size thresholds, capacity ordering, age and spots compose correctly", () => {
  const rows = [event(1, { maxPeople: 6 }), event(2, { maxPeople: 7 }), event(3, { maxPeople: 4, joinedCount: 4 }), event(4, { minAge: 25 })];
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, size: "small", fitsAge: true, openSpots: true }, me).map(e => e.id), [1]);
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, size: "large" }, me).map(e => e.id), [2]);
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, sort: "capAsc" }, me).map(e => e.maxPeople), [4, 6, 6, 7]);
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, sort: "capDesc" }, me).map(e => e.maxPeople), [7, 6, 6, 4]);
});
test("soonest ordering uses instants rather than labels", () => {
  const rows = [event(1, { startsAt: "2030-01-02T08:00:00Z" }), event(2, { startsAt: "2030-01-01T19:00:00Z" })];
  assert.deepEqual(filterEvents(rows, { ...EMPTY_FILTERS, sort: "soonest" }, me).map(e => e.id), [2, 1]);
});
test("only free public plans bypass approval", () => {
  for (const isPrivate of [false, true]) for (const isPaid of [false, true]) {
    assert.equal(needsApproval({ isPrivate, isPaid }), isPrivate || isPaid);
  }
});
