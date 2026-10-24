import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Ban, Check, ChevronDown, Lock, LocateFixed, MapPin, MessageCircleOff, MessageCircle, Navigation, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getGetEventDetailQueryKey,
  getGetEventsQueryKey,
  getGetInboxQueryKey,
  useUpdateEventPrivacy,
  type Event,
} from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { apiError, CATEGORIES, catTheme, fitsAge, langChip, formatPrice, formatWhen, isAttending, LANGUAGES, NEARBY_KM, SORT_LABELS, type Filters, type SortKey } from "@/lib/pulse";
import { AgeBadge, CapacityBar, EmojiTile, FaceStack } from "@/components/bits";
import { cn } from "@/lib/utils";

export function PrivacySwitch({ event, compact }: { event: Event; compact?: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useUpdateEventPrivacy({
    mutation: {
      onSuccess: (ev) => {
        qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetInboxQueryKey() });
        qc.invalidateQueries({ queryKey: getGetEventDetailQueryKey(ev.id) });
        toast({
          title: ev.allowMessages ? "Messages are open" : "Messages paused",
          description: ev.allowMessages ? "Neighbours can message you about this plan." : "No new messages can reach you. Old threads stay readable.",
        });
      },
      onError: (e) => toast({ title: "Couldn't update messaging", description: apiError(e), variant: "destructive" }),
    },
  });
  const checked = m.isPending && m.variables ? m.variables.data.allowMessages : event.allowMessages;
  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/70",
        compact ? "px-3 py-2" : "px-4 py-3",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {checked ? <MessageCircle className="h-4 w-4 text-teal-600" /> : <MessageCircleOff className="h-4 w-4 text-muted-foreground" />}
        <span>
          {checked ? "Accepting messages" : "Messages off"}
          {!compact && <span className="block text-xs font-normal text-muted-foreground">Your event · changes apply instantly</span>}
        </span>
      </span>
      <Switch
        data-testid={`switch-messages-${event.id}`}
        checked={checked}
        disabled={m.isPending}
        onCheckedChange={(v) => m.mutate({ id: event.id, data: { allowMessages: v } })}
      />
    </label>
  );
}

export function EventTags({ event, className }: { event: Event; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", catTheme(event.category).chip)}>{CATEGORIES.find((c) => c.id === event.category)?.label ?? event.category}</span>
      {event.status === "canceled" && <span data-testid={`tag-canceled-${event.id}`} className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground"><Ban className="h-3 w-3" />Canceled</span>}
      {event.isPrivate ? (
        <span data-testid={`tag-private-${event.id}`} className="flex items-center gap-1 rounded-full border border-purple-300 bg-purple-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-[0_0_10px_#a855f7]"><Lock className="h-3 w-3" />Private</span>
      ) : (
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-900">Public</span>
      )}
      {event.isPaid ? <span data-testid={`tag-price-${event.id}`} className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-extrabold text-slate-900">{formatPrice(event.price)}</span> : <span className="rounded-full border border-lime-300 bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-800">Free</span>}
      {(event.languages ?? []).map((l) => <span key={l} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", langChip(l))}>{l}</span>)}
    </div>
  );
}

export function EventCard({ event, active, onOpen }: { event: Event; active?: boolean; onOpen: () => void }) {
  const { me } = useApp();
  const mine = me?.id === event.host.id;
  const going = isAttending(event, me);
  const th = catTheme(event.category);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`card-event-${event.id}`}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className={cn(
        "bounce-card group relative w-full cursor-pointer overflow-hidden rounded-3xl border bg-card p-4 pt-5 text-left transition-all hover:-translate-y-1 hover:shadow-[0_18px_32px_-16px_rgba(236,72,153,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-pink-400 shadow-[0_0_0_2px_#ec4899]" : "border-card-border",
      )}
    >
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-2", th.bar)} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 opacity-70", th.header)} />
      <div className="relative flex gap-3">
        <EmojiTile event={event} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight" data-testid={`text-title-${event.id}`}>{event.title}</h3>
            {mine ? (
              <span className="shrink-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-2.5 py-0.5 text-xs font-bold text-white">Hosting</span>
            ) : going ? (
              <span className="shrink-0 rounded-full bg-teal-500 px-2.5 py-0.5 text-xs font-bold text-white">Going</span>
            ) : null}
          </div>
          <p className="mt-1"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[13px] font-bold text-emerald-800">{formatWhen(event.startsAt)}</span></p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.locationName}</span>
          </p>
        </div>
      </div>
      <EventTags event={event} className="relative mt-3" />
      <div className="mt-3"><CapacityBar event={event} /></div>
      <div className="mt-3 flex items-center justify-between">
        <FaceStack users={event.attendees} hostId={event.host.id} size={28} />
        <AgeBadge event={event} fits={me ? fitsAge(event, me) : null} />
      </div>
      {mine && <div className="mt-3"><PrivacySwitch event={event} compact /></div>}
    </div>
  );
}

function CheckDropdown<T extends string>({ label, testId, options, value, onChange }: { label: string; testId: string; options: { id: T; label: string; emoji?: string; theme?: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  const on = value.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid={`dropdown-${testId}`} className={cn(chipCls(on), "pr-2")}>
          {label}
          {on && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-pink-600">{value.length}</span>}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[3000] w-60 rounded-2xl p-2">
        {options.map((o) => {
          const checked = value.includes(o.id);
          return (
            <label key={o.id} data-testid={`option-${testId}-${o.id}`} className={cn("mb-1 flex cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-2 text-sm font-semibold transition", checked && o.theme ? o.theme : checked ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800" : "border-transparent hover:bg-muted")}>
              <Checkbox checked={checked} onCheckedChange={(c) => onChange(c ? [...value, o.id] : value.filter((x) => x !== o.id))} />
              {o.emoji && <span className="text-base leading-none">{o.emoji}</span>}
              {o.label}
            </label>
          );
        })}
        {on && <button data-testid={`button-clear-${testId}`} onClick={() => onChange([])} className="mt-1 w-full rounded-xl px-2 py-1.5 text-left text-xs font-bold text-pink-600 hover:bg-pink-50">Clear selection</button>}
      </PopoverContent>
    </Popover>
  );
}

const chipCls = (on: boolean) =>
  cn(
    "pill-pop flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    on ? "brand-grad border-pink-300 text-white shadow-brand" : "border-white/80 bg-white/80 hover:-translate-y-0.5 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700",
  );

export function FilterBar({ filters, setFilters, floating, originLabel, onLocate, locating }: { filters: Filters; setFilters: (f: Filters) => void; floating?: boolean; originLabel?: string; onLocate?: () => void; locating?: boolean }) {
  const { me, requireAuth } = useApp();
  const chip = chipCls;
  return (
    <div className="space-y-2.5">
      <div className={cn("flex items-center gap-2 rounded-2xl border border-pink-100 bg-white/90 px-3 focus-within:border-pink-300", floating && "shadow-[0_6px_18px_-10px_rgba(168,85,247,.4)]")}>
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          data-testid="input-search"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search coffee, Moda, chess…"
          className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          aria-label="Search activities"
        />
        {filters.q && (
          <button data-testid="button-clear-search" aria-label="Clear search" onClick={() => setFilters({ ...filters, q: "" })} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
        {onLocate && (
          <button data-testid="button-locate" aria-label="Use my location" onClick={onLocate} className="rounded-full p-1.5 text-teal-600 hover:bg-teal-50">
            <LocateFixed className={cn("h-4 w-4", locating && "animate-pulse")} />
          </button>
        )}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <CheckDropdown label="Categories" testId="categories" options={CATEGORIES.map((c) => ({ ...c, theme: catTheme(c.id).chip }))} value={filters.categories} onChange={(v) => setFilters({ ...filters, categories: v })} />
        <CheckDropdown label="Languages" testId="languages" options={LANGUAGES.map((l) => ({ id: l, label: l, theme: langChip(l) }))} value={filters.languages} onChange={(v) => setFilters({ ...filters, languages: v })} />
        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="dropdown-sort" className={cn(chip(filters.sort !== "default"), "pr-2")}>
              <ArrowUpDown className="h-3.5 w-3.5" />{filters.sort === "default" ? "Sort" : SORT_LABELS[filters.sort]}<ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-[3000] w-60 rounded-2xl p-2">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <button key={k} data-testid={`option-sort-${k}`} onClick={() => setFilters({ ...filters, sort: k })} className={cn("flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-muted", filters.sort === k && "bg-sky-50 text-sky-700")}>
                {SORT_LABELS[k]}{filters.sort === k && <Check className="h-4 w-4" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        <button data-testid="filter-nearby" aria-pressed={filters.nearby} className={chip(filters.nearby)} onClick={() => setFilters({ ...filters, nearby: !filters.nearby })}>
          <Navigation className={cn("h-3.5 w-3.5", !filters.nearby && "text-emerald-600")} />Within {NEARBY_KM} km
        </button>
        <button data-testid="filter-size-small" aria-pressed={filters.size === "small"} className={chip(filters.size === "small")} onClick={() => setFilters({ ...filters, size: filters.size === "small" ? "all" : "small" })}>
          Intimate ≤ 6
        </button>
        <button data-testid="filter-size-large" aria-pressed={filters.size === "large"} className={chip(filters.size === "large")} onClick={() => setFilters({ ...filters, size: filters.size === "large" ? "all" : "large" })}>
          Larger 7+
        </button>
        <button
          data-testid="filter-fits-age"
          aria-pressed={filters.fitsAge}
          className={chip(filters.fitsAge)}
          onClick={() => {
            if (!filters.fitsAge && !requireAuth("Sign in so we can match events to your age.")) return;
            setFilters({ ...filters, fitsAge: !filters.fitsAge });
          }}
        >
          Fits my age{me && filters.fitsAge ? ` (${me.age})` : ""}
        </button>
        <button data-testid="filter-open-spots" aria-pressed={filters.openSpots} className={chip(filters.openSpots)} onClick={() => setFilters({ ...filters, openSpots: !filters.openSpots })}>
          Open spots
        </button>
      </div>
      {(filters.nearby || filters.sort === "nearest") && originLabel && <p data-testid="text-origin" className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Distances measured from {originLabel}</p>}
    </div>
  );
}
