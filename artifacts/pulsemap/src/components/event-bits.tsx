import { useQueryClient } from "@tanstack/react-query";
import { MapPin, MessageCircleOff, MessageCircle, Search, X } from "lucide-react";
import {
  getGetEventsQueryKey,
  getGetInboxQueryKey,
  useUpdateEventPrivacy,
  type Event,
} from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { apiError, CATEGORIES, fitsAge, formatWhen, isAttending, type Filters } from "@/lib/pulse";
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
      <div className="mt-3"><CapacityBar event={event} /></div>
      <div className="mt-3 flex items-center justify-between">
        <FaceStack users={event.attendees} hostId={event.host.id} size={28} />
        <AgeBadge event={event} fits={me ? fitsAge(event, me) : null} />
      </div>
      {mine && <div className="mt-3"><PrivacySwitch event={event} compact /></div>}
    </div>
  );
}

export function FilterBar({ filters, setFilters, floating }: { filters: Filters; setFilters: (f: Filters) => void; floating?: boolean }) {
  const { me, requireAuth } = useApp();
  const chip = (on: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
    );
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
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <button data-testid="filter-category-all" className={chip(filters.category === "all")} onClick={() => setFilters({ ...filters, category: "all" })}>All</button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            data-testid={`filter-category-${c.id}`}
            className={chip(filters.category === c.id)}
            onClick={() => setFilters({ ...filters, category: filters.category === c.id ? "all" : c.id })}
          >
            <span className="text-base leading-none">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
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
    </div>
  );
}
