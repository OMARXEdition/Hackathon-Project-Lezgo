import { format, isToday, isTomorrow } from "date-fns";
import type { Event, EventInputCategory, EventInputLanguagesItem, User } from "@workspace/api-client-react";

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

export const LANGUAGES: EventInputLanguagesItem[] = ["Arabic", "English", "Turkish", "Spanish", "French"];
export const NEARBY_KM = 15;

export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type SortKey = "default" | "soonest" | "nearest" | "capAsc" | "capDesc";
export type SizeKey = "all" | "small" | "large";
export type Filters = {
  q: string;
  categories: EventInputCategory[];
  languages: EventInputLanguagesItem[];
  fitsAge: boolean;
  openSpots: boolean;
  nearby: boolean;
  size: SizeKey;
  sort: SortKey;
};
export const EMPTY_FILTERS: Filters = { q: "", categories: [], languages: [], fitsAge: false, openSpots: false, nearby: false, size: "all", sort: "default" };

export const SORT_LABELS: Record<SortKey, string> = {
  default: "Recommended",
  soonest: "Soonest first",
  nearest: "Nearest first",
  capAsc: "Capacity: small → large",
  capDesc: "Capacity: large → small",
};

export function filterEvents(events: Event[], f: Filters, me: User | null, origin: [number, number] = ISTANBUL) {
  const q = f.q.trim().toLocaleLowerCase("tr");
  const dist = (e: Event) => haversineKm(origin, [e.lat, e.lng]);
  const out = events.filter((e) => {
    if (f.categories.length && !f.categories.includes(e.category)) return false;
    if (f.languages.length && !(e.languages ?? []).some((l) => f.languages.includes(l))) return false;
    if (f.openSpots && spotsLeft(e) === 0) return false;
    if (f.fitsAge && me && !fitsAge(e, me)) return false;
    if (f.size === "small" && e.maxPeople > 6) return false;
    if (f.size === "large" && e.maxPeople < 7) return false;
    if (f.nearby && dist(e) > NEARBY_KM) return false;
    if (q) {
      const hay = `${e.title} ${e.description} ${e.locationName} ${e.host.username} ${e.category} ${(e.languages ?? []).join(" ")}`.toLocaleLowerCase("tr");
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sort = f.sort === "default" && f.nearby ? "nearest" : f.sort;
  const t = (e: Event) => new Date(e.startsAt).getTime();
  if (sort === "soonest") out.sort((a, b) => t(a) - t(b));
  else if (sort === "nearest") out.sort((a, b) => dist(a) - dist(b));
  else if (sort === "capAsc") out.sort((a, b) => a.maxPeople - b.maxPeople || t(a) - t(b));
  else if (sort === "capDesc") out.sort((a, b) => b.maxPeople - a.maxPeople || t(a) - t(b));
  return out;
}

export const needsApproval = (e: Pick<Event, "isPrivate" | "isPaid">) => e.isPrivate || e.isPaid;
export const formatPrice = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
export const inviteLink = (id: number | string) => `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/?$/, "/")}?invite=${encodeURIComponent(String(id))}`;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
