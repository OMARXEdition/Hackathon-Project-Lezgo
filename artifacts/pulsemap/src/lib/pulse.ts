import { format, isToday, isTomorrow } from "date-fns";
import type { Event, EventInputCategory, User } from "@workspace/api-client-react";

export const CATEGORIES: { id: EventInputCategory; label: string; emoji: string; hue: string }[] = [
  { id: "coffee", label: "Coffee", emoji: "☕", hue: "24 85% 55%" },
  { id: "sports", label: "Sports", emoji: "⚽", hue: "152 55% 38%" },
  { id: "running", label: "Running", emoji: "🏃", hue: "340 75% 56%" },
  { id: "study", label: "Study", emoji: "📚", hue: "222 65% 52%" },
  { id: "games", label: "Games", emoji: "🎮", hue: "270 50% 56%" },
];
export const catOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export const QUICK_EMOJIS = ["☕", "🏐", "🏃", "🗣️", "⚽", "🎮", "📚", "🎸", "🍕", "🧘"];
export const AVATAR_SEEDS = ["Ayla", "Deniz", "Kerem", "Elif", "Mert", "Zeynep", "Bora", "Lale"];
export const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const ISTANBUL: [number, number] = [40.9876, 29.0306];

export function apiError(e: unknown, fallback = "Something went wrong. Try again."): string {
  const d = (e as { data?: { error?: string } } | null)?.data;
  if (d && typeof d.error === "string") return d.error;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export const spotsLeft = (e: Event) => Math.max(0, e.maxPeople - e.joinedCount);
export const isAttending = (e: Event, me: User | null) => !!me && e.attendees.some((a) => a.id === me.id);
export const fitsAge = (e: Event, me: User | null) => !!me && me.age >= e.minAge && me.age <= e.maxAge;

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE d MMM");
  return `${day} · ${format(d, "HH:mm")}`;
}

export type Filters = { q: string; category: EventInputCategory | "all"; fitsAge: boolean; openSpots: boolean };
export const EMPTY_FILTERS: Filters = { q: "", category: "all", fitsAge: false, openSpots: false };

export function filterEvents(events: Event[], f: Filters, me: User | null) {
  const q = f.q.trim().toLocaleLowerCase("tr");
  return events.filter((e) => {
    if (f.category !== "all" && e.category !== f.category) return false;
    if (f.openSpots && spotsLeft(e) === 0) return false;
    if (f.fitsAge && me && !fitsAge(e, me)) return false;
    if (q) {
      const hay = `${e.title} ${e.description} ${e.locationName} ${e.host.username} ${e.category}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
