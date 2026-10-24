import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Crown, Loader2, MapPin, MessageCircle, Users } from "lucide-react";
import { getGetEventsQueryKey, useJoinEvent, useLeaveEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApp, useEvents } from "@/lib/app-context";
import { apiError, catOf, fitsAge, formatWhen, isAttending, spotsLeft } from "@/lib/pulse";
import { AgeBadge, Blank, CapacityBar, Face, FaceStack, Panel } from "@/components/bits";
import { PrivacySwitch } from "@/components/event-bits";

export function EventDetails({ id }: { id: number }) {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { me, requireAuth } = useApp();
  const q = useEvents();
  const [err, setErr] = useState<string | null>(null);
  const event = q.data?.find((e) => e.id === id);

  const refresh = () => qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  const join = useJoinEvent({
    mutation: {
      onSuccess: (ev) => { setErr(null); refresh(); toast({ title: `You're in ${ev.emoji}`, description: `See you at ${ev.locationName}.` }); },
      onError: (e) => { setErr(apiError(e)); refresh(); },
    },
  });
  const leave = useLeaveEvent({
    mutation: {
      onSuccess: () => { setErr(null); refresh(); toast({ title: "You left the plan", description: "Your spot is free for someone else." }); },
      onError: (e) => setErr(apiError(e)),
    },
  });

  const close = () => nav("/");

  if (q.isLoading)
    return (
      <Panel title="Loading…" onClose={close} testId="panel-event">
        <div className="space-y-3"><Skeleton className="h-24 w-full rounded-3xl" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-32 w-full rounded-3xl" /></div>
      </Panel>
    );
  if (!event)
    return (
      <Panel title="Plan not found" onClose={close} testId="panel-event">
        <Blank title="This plan isn't on the map" body="It may have been removed, or the link is off by a digit." action={<Button onClick={close}>Back to the map</Button>} />
      </Panel>
    );

  const c = catOf(event.category);
  const mine = me?.id === event.host.id;
  const going = isAttending(event, me);
  const left = spotsLeft(event);
  const ageOk = me ? fitsAge(event, me) : null;
  const busy = join.isPending || leave.isPending;

  let action;
  if (mine) action = <p className="text-center text-sm text-muted-foreground" data-testid="text-host-note">You're hosting — hosts count as an attendee and can't leave their own plan.</p>;
  else if (going)
    action = (
      <Button data-testid="button-leave" variant="outline" className="h-12 w-full rounded-2xl text-base" disabled={busy} onClick={() => leave.mutate({ id: event.id })}>
        {leave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Leave and free my spot
      </Button>
    );
  else
    action = (
      <Button
        data-testid="button-join"
        className="h-12 w-full rounded-2xl text-base"
        disabled={busy || (!!me && (left === 0 || ageOk === false))}
        onClick={() => requireAuth("Sign in to join this plan.") && join.mutate({ id: event.id })}
      >
        {join.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {left === 0 ? "Full — no spots left" : me && ageOk === false ? `For ages ${event.minAge}–${event.maxAge}` : me ? "Join this plan" : "Sign in to join"}
      </Button>
    );

  return (
    <Panel
      testId="panel-event"
      onClose={close}
      title={<span className="text-sm font-semibold uppercase tracking-wider" style={{ color: `hsl(${c.hue})` }}>{c.emoji} {c.label}</span>}
      footer={
        <div className="space-y-2">
          {err && <p role="alert" data-testid="text-join-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{err}</p>}
          {action}
        </div>
      }
    >
      <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: `linear-gradient(140deg, hsl(${c.hue} / .18), hsl(${c.hue} / .05))` }}>
        <div className="absolute -right-3 -top-4 select-none text-[96px] leading-none opacity-90">{event.emoji}</div>
        <h2 className="relative max-w-[78%] font-display text-2xl font-extrabold leading-tight" data-testid="text-event-title">{event.title}</h2>
        <div className="relative mt-3 space-y-1.5 text-sm">
          <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" />{formatWhen(event.startsAt)}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.locationName}</p>
        </div>
      </div>

      {event.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed" data-testid="text-description">{event.description}</p>}

      <div className="mt-5 space-y-3 rounded-3xl border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4" />Who's going</span>
          <AgeBadge event={event} fits={ageOk} />
        </div>
        <CapacityBar event={event} />
        {event.attendees.length ? <FaceStack users={event.attendees} hostId={event.host.id} max={10} size={38} /> : <p className="text-sm text-muted-foreground">No one yet.</p>}
        {me && ageOk === false && !mine && <p className="text-sm font-medium text-destructive">You're {me.age}; this plan is for {event.minAge}–{event.maxAge}.</p>}
        {!me && <p className="text-xs text-muted-foreground">Adults 18+ · ages are self-reported.</p>}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border p-3">
        <Face user={event.host} size={44} ring={false} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Crown className="h-3 w-3" />Host</p>
          <p className="truncate font-bold" data-testid="text-host">@{event.host.username} · {event.host.age}</p>
        </div>
        {!mine && event.allowMessages && (
          <Button
            data-testid="button-message-host"
            variant="secondary"
            className="rounded-full"
            onClick={() => requireAuth("Sign in to message the host.") && nav(`/chat/${event.id}/${event.host.id}`)}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />Message
          </Button>
        )}
        {!mine && !event.allowMessages && <span className="text-xs text-muted-foreground">Messages off</span>}
      </div>
      {mine && <div className="mt-3"><PrivacySwitch event={event} /></div>}
      <p className="mt-4 text-xs text-muted-foreground">Meet in public places. PulseMap never shares phone numbers or addresses.</p>
    </Panel>
  );
}
