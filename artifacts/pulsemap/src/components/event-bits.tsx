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
import { apiError, CATEGORIES, fitsAge, formatPrice, formatWhen, isAttending, LANGUAGES, NEARBY_KM, SORT_LABELS, type Filters, type SortKey } from "@/lib/pulse";
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
        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5",
        compact ? "px-3 py-2" : "px-4 py-3",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {checked ? <MessageCircle className="h-4 w-4 text-primary" /> : <MessageCircleOff className="h-4 w-4 text-muted-foreground" />}
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
      {event.status === "canceled" && <span data-testid={`tag-canceled-${event.id}`} className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground"><Ban className="h-3 w-3" />Canceled</span>}
      {event.isPrivate ? (
        <span data-testid={`tag-private-${event.id}`} className="flex items-center gap-1 rounded-full border border-purple-300 bg-purple-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-[0_0_10px_#a855f7]"><Lock className="h-3 w-3" />Private</span>
      ) : (
        <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-bold text-slate-900">Public</span>
      )}
      {event.isPaid ? <span data-testid={`tag-price-${event.id}`} className="rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-900">{formatPrice(event.price)}</span> : <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">Free</span>}
      {(event.languages ?? []).map((l) => <span key={l} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{l}</span>)}
    </div>
  );
}

export function EventCard({ event, active, onOpen }: { event: Event; active?: boolean; onOpen: () => void }) {
  const { me } = useApp();
  const mine = me?.id === event.host.id;
  const going = isAttending(event, me);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`card-event-${event.id}`}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className={cn(
        "group w-full cursor-pointer rounded-3xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_hsl(222_45%_16%/.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary))]" : "border-card-border",
      )}
    >
      <div className="flex gap-3">
        <EmojiTile event={event} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-[17px] font-bold leading-tight" data-testid={`text-title-${event.id}`}>{event.title}</h3>
            {mine ? (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">Hosting</span>
            ) : going ? (
              <span className="shrink-0 rounded-full bg-[hsl(150_62%_38%)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[hsl(40_60%_98%)]">Going</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] font-semibold text-primary">{formatWhen(event.startsAt)}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.locationName}</span>
          </p>
        </div>
      </div>
      <EventTags event={event} className="mt-3" />
      <div className="mt-3"><CapacityBar event={event} /></div>
      <div className="mt-3 flex items-center justify-between">
        <FaceStack users={event.attendees} hostId={event.host.id} size={28} />
        <AgeBadge event={event} fits={me ? fitsAge(event, me) : null} />
      </div>
      {mine && <div className="mt-3"><PrivacySwitch event={event} compact /></div>}
    </div>
  );
}

function CheckDropdown<T extends string>({ label, testId, options, value, onChange }: { label: string; testId: string; options: { id: T; label: string; emoji?: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  const on = value.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid={`dropdown-${testId}`} className={cn(chipCls(on), "pr-2")}>
          {label}
          {on && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">{value.length}</span>}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[3000] w-60 rounded-2xl p-2">
        {options.map((o) => {
          const checked = value.includes(o.id);
          return (
            <label key={o.id} data-testid={`option-${testId}-${o.id}`} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-semibold hover:bg-muted">
              <Checkbox checked={checked} onCheckedChange={(c) => onChange(c ? [...value, o.id] : value.filter((x) => x !== o.id))} />
              {o.emoji && <span className="text-base leading-none">{o.emoji}</span>}
              {o.label}
            </label>
          );
        })}
        {on && <button data-testid={`button-clear-${testId}`} onClick={() => onChange([])} className="mt-1 w-full rounded-xl px-2 py-1.5 text-left text-xs font-bold text-primary hover:bg-muted">Clear selection</button>}
      </PopoverContent>
    </Popover>
  );
}

const chipCls = (on: boolean) =>
  cn(
    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
  );

export function FilterBar({ filters, setFilters, floating, originLabel, onLocate, locating }: { filters: Filters; setFilters: (f: Filters) => void; floating?: boolean; originLabel?: string; onLocate?: () => void; locating?: boolean }) {
  const { me, requireAuth } = useApp();
  const chip = chipCls;
  return (
    <div className="space-y-2.5">
      <div className={cn("flex items-center gap-2 rounded-2xl border border-border bg-card px-3", floating && "shadow-[0_10px_30px_-12px_hsl(222_45%_16%/.4)]")}>
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
          <button data-testid="button-locate" aria-label="Use my location" onClick={onLocate} className="rounded-full p-1.5 text-primary hover:bg-muted">
            <LocateFixed className={cn("h-4 w-4", locating && "animate-pulse")} />
          </button>
        )}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <CheckDropdown label="Categories" testId="categories" options={CATEGORIES} value={filters.categories} onChange={(v) => setFilters({ ...filters, categories: v })} />
        <CheckDropdown label="Languages" testId="languages" options={LANGUAGES.map((l) => ({ id: l, label: l }))} value={filters.languages} onChange={(v) => setFilters({ ...filters, languages: v })} />
        <Popover>
          <PopoverTrigger asChild>
            <button data-testid="dropdown-sort" className={cn(chip(filters.sort !== "default"), "pr-2")}>
              <ArrowUpDown className="h-3.5 w-3.5" />{filters.sort === "default" ? "Sort" : SORT_LABELS[filters.sort]}<ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-[3000] w-60 rounded-2xl p-2">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <button key={k} data-testid={`option-sort-${k}`} onClick={() => setFilters({ ...filters, sort: k })} className={cn("flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-muted", filters.sort === k && "text-primary")}>
                {SORT_LABELS[k]}{filters.sort === k && <Check className="h-4 w-4" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        <button data-testid="filter-nearby" aria-pressed={filters.nearby} className={chip(filters.nearby)} onClick={() => setFilters({ ...filters, nearby: !filters.nearby })}>
          <Navigation className="h-3.5 w-3.5" />Within {NEARBY_KM} km
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
      {(filters.nearby || filters.sort === "nearest") && originLabel && <p data-testid="text-origin" className="text-[11px] font-semibold text-muted-foreground">Distances measured from {originLabel}</p>}
    </div>
  );
}
