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

/** Centralized category colour presentation (Tailwind literal classes). */
export type CatTheme = { chip: string; bar: string; header: string; solid: string; text: string };
const T = {
  teal: { chip: "bg-teal-100 text-teal-800 border-teal-300", bar: "bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-400", header: "bg-gradient-to-br from-teal-100 via-teal-50 to-white", solid: "bg-teal-500 text-white border-teal-500", text: "text-teal-800" },
  amber: { chip: "bg-amber-100 text-amber-800 border-amber-300", bar: "bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400", header: "bg-gradient-to-br from-amber-100 via-amber-50 to-white", solid: "bg-amber-400 text-amber-950 border-amber-400", text: "text-amber-800" },
  rose: { chip: "bg-rose-100 text-rose-800 border-rose-300", bar: "bg-gradient-to-r from-rose-300 via-rose-400 to-pink-400", header: "bg-gradient-to-br from-rose-100 via-rose-50 to-white", solid: "bg-rose-500 text-white border-rose-500", text: "text-rose-800" },
  sky: { chip: "bg-sky-100 text-sky-800 border-sky-300", bar: "bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-400", header: "bg-gradient-to-br from-sky-100 via-sky-50 to-white", solid: "bg-sky-500 text-white border-sky-500", text: "text-sky-800" },
} satisfies Record<string, CatTheme>;
export const CATEGORY_THEME: Record<EventInputCategory, CatTheme> = { sports: T.teal, running: T.teal, coffee: T.amber, games: T.rose, study: T.sky };
export const catTheme = (id: string): CatTheme => CATEGORY_THEME[id as EventInputCategory] ?? T.amber;
const LANG_CHIPS = ["bg-violet-100 text-violet-800 border-violet-300", "bg-pink-100 text-pink-800 border-pink-300", "bg-orange-100 text-orange-800 border-orange-300", "bg-teal-100 text-teal-800 border-teal-300", "bg-sky-100 text-sky-800 border-sky-300"];
export const langChip = (l: string) => LANG_CHIPS[Math.max(0, LANGUAGES.indexOf(l as EventInputLanguagesItem)) % LANG_CHIPS.length];
export const DIST_BADGE = "bg-emerald-100 text-emerald-800";
export const RING_CYCLE = ["ring-pink-400", "ring-teal-400", "ring-amber-400"];
