import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Ban, CalendarClock, Check, Copy, Crown, Hourglass, Languages, Loader2, Lock, MapPin, MessageCircle, MessagesSquare, Pencil, Users, X } from "lucide-react";
import {
  getGetEventDetailQueryKey,
  getGetEventRequestsQueryKey,
  useCancelEvent,
  useDecideRequest,
  useGetEventDetail,
  useGetEventRequests,
  useJoinEvent,
  useLeaveEvent,
  useRequestToJoin,
  type JoinRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApp, useRefreshEvent } from "@/lib/app-context";
import { apiError, catOf, catTheme, fitsAge, formatPrice, formatWhen, inviteLink, isAttending, needsApproval, spotsLeft } from "@/lib/pulse";
import { AgeBadge, Blank, CapacityBar, Face, FaceStack, Panel } from "@/components/bits";
import { EventTags, PrivacySwitch } from "@/components/event-bits";
import { cn } from "@/lib/utils";

export function RequestCard({ r, showEvent }: { r: JoinRequest; showEvent?: boolean }) {
  const refresh = useRefreshEvent();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const decide = useDecideRequest({
    mutation: {
      onSuccess: (_d, v) => {
        refresh(r.eventId);
        toast({ title: v.data.decision === "accept" ? `@${r.applicant.username} is in` : "Request declined", description: v.data.decision === "accept" ? "They now see the group chat." : undefined });
      },
      onError: (e) => { refresh(r.eventId); toast({ title: "Couldn't decide", description: apiError(e), variant: "destructive" }); },
    },
  });
  const busy = decide.isPending;
  return (
    <div data-testid={`card-request-${r.id}`} className="rounded-2xl border border-purple-200 bg-card p-3">
      {showEvent && (
        <button onClick={() => nav(`/events/${r.eventId}`)} className="mb-2 block truncate text-left text-xs font-bold text-primary hover:underline" data-testid={`link-request-event-${r.id}`}>{r.eventEmoji} {r.eventTitle}</button>
      )}
      <div className="flex items-center gap-3">
        <Face user={r.applicant} size={42} ring={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold" data-testid={`text-applicant-${r.id}`}>@{r.applicant.username}</p>
          <p className="text-xs text-muted-foreground">{r.applicant.age} years · asked {formatWhen(r.createdAt)}</p>
        </div>
      </div>
      {r.answers.length > 0 && (
        <dl className="mt-3 space-y-2">
          {r.answers.map((a, i) => (
            <div key={i} className="rounded-xl bg-purple-50 px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-purple-800">{a.question}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900" data-testid={`text-answer-${r.id}-${i}`}>{a.answer}</dd>
            </div>
          ))}
        </dl>
      )}
      {r.status === "pending" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button data-testid={`button-accept-${r.id}`} disabled={busy} className="rounded-full" onClick={() => decide.mutate({ id: r.eventId, requestId: r.id, data: { decision: "accept" } })}>
            {busy && decide.variables?.data.decision === "accept" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Accept
          </Button>
          <Button data-testid={`button-decline-${r.id}`} disabled={busy} variant="outline" className="rounded-full" onClick={() => decide.mutate({ id: r.eventId, requestId: r.id, data: { decision: "decline" } })}>
            <X className="mr-1 h-4 w-4" />Decline
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs font-bold capitalize text-muted-foreground">{r.status}</p>
      )}
    </div>
  );
}

function PendingRequests({ eventId }: { eventId: number }) {
  const q = useGetEventRequests(eventId, { query: { queryKey: getGetEventRequestsQueryKey(eventId), refetchInterval: 3500 } });
  const pending = (q.data ?? []).filter((r) => r.status === "pending");
  return (
    <section className="mt-4 rounded-3xl border border-purple-300 bg-purple-50/60 p-4" data-testid="section-pending-requests">
      <h3 className="flex items-center gap-2 text-sm font-bold text-purple-900"><Hourglass className="h-4 w-4" />Pending requests {pending.length > 0 && <span className="rounded-full bg-purple-600 px-2 text-xs text-white">{pending.length}</span>}</h3>
      <div className="mt-3 space-y-2">
        {q.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : q.isError ? (
          <p className="text-sm text-destructive">{apiError(q.error)} <button className="underline" onClick={() => q.refetch()}>Retry</button></p>
        ) : pending.length ? pending.map((r) => <RequestCard key={r.id} r={r} />) : <p className="text-sm text-muted-foreground">No one waiting. Share your invite link.</p>}
      </div>
    </section>
  );
}

function CancelModal({ eventId, title, onClose }: { eventId: number; title: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const refresh = useRefreshEvent();
  const { toast } = useToast();
  const cancel = useCancelEvent({
    mutation: {
      onSuccess: () => { refresh(eventId); toast({ title: "Plan canceled", description: "Everyone who joined was notified with your reason." }); onClose(); },
      onError: (e) => setErr(apiError(e)),
    },
  });
  const t = reason.trim();
  return (
    <div className="absolute inset-0 z-[2000] grid place-items-center bg-[hsl(222_45%_10%/.5)] p-4" onClick={onClose} data-testid="modal-cancel">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="rainbow-strip w-full max-w-[400px] overflow-hidden rounded-[28px] bg-card p-6 shadow-2xl">
        <h2 className="font-display text-xl font-extrabold">Why are you canceling this event?</h2>
        <p className="mt-1 text-sm text-muted-foreground">“{title}” — your reason goes to every attendee's inbox and the group chat. This can't be undone.</p>
        <textarea data-testid="input-cancel-reason" autoFocus rows={4} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rain is forecast all evening — let's reschedule." className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-[15px] outline-none focus:border-primary" />
        {err && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{err}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose} data-testid="button-cancel-keep">Keep plan</Button>
          <Button variant="destructive" className="rounded-full" disabled={!t || cancel.isPending} data-testid="button-cancel-confirm" onClick={() => cancel.mutate({ id: eventId, data: { reason: t } })}>
            {cancel.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Cancel event
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function EventDetails({ id }: { id: number }) {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const refresh = useRefreshEvent();
  const { me, requireAuth } = useApp();
  const q = useGetEventDetail(id, { query: { enabled: !!id, queryKey: getGetEventDetailQueryKey(id), refetchInterval: 3500 } });
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const event = q.data;

  const join = useJoinEvent({
    mutation: {
      onSuccess: (ev) => { setErr(null); refresh(id); toast({ title: `You're in ${ev.emoji}`, description: `See you at ${ev.locationName}.` }); },
      onError: (e) => { setErr(apiError(e)); refresh(id); },
    },
  });
  const leave = useLeaveEvent({
    mutation: {
      onSuccess: () => { setErr(null); refresh(id); toast({ title: "You left the plan", description: "Your spot is free for someone else." }); },
      onError: (e) => setErr(apiError(e)),
    },
  });
  const request = useRequestToJoin({
    mutation: {
      onSuccess: () => { setErr(null); setAnswers([]); refresh(id); toast({ title: "Request sent", description: "The host will review it. You'll get a notification." }); },
      onError: (e) => { setErr(apiError(e)); refresh(id); },
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
        <Blank title="This plan isn't on the map" body={q.isError ? apiError(q.error, "It may have been removed, or the link is off by a digit.") : "It may have been removed, or the link is off by a digit."} action={<div className="flex gap-2"><Button variant="outline" onClick={() => q.refetch()}>Retry</Button><Button onClick={close}>Back to the map</Button></div>} />
      </Panel>
    );

  const c = catOf(event.category);
  const th = catTheme(event.category);
  const mine = me?.id === event.host.id;
  const going = isAttending(event, me);
  const member = mine || going;
  const left = spotsLeft(event);
  const ageOk = me ? fitsAge(event, me) : null;
  const canceled = event.status === "canceled";
  const approval = needsApproval(event);
  const questions = event.isPrivate ? event.screeningQuestions : [];
  const busy = join.isPending || leave.isPending || request.isPending;
  const answersOk = questions.every((_, i) => (answers[i] ?? "").trim().length > 0);

  const copyInvite = async () => {
    const link = inviteLink(event.inviteCode || event.id);
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Invite link copied", description: link });
    } catch {
      window.prompt("Copy this invite link:", link);
      toast({ title: "Copy the link manually", description: link });
    }
  };

  const big = "h-12 w-full rounded-full text-base font-bold";
  let action;
  if (canceled) action = <p className="text-center text-sm font-semibold text-destructive" data-testid="text-canceled-locked">This plan was canceled — joining is closed.</p>;
  else if (mine) action = <p className="text-center text-sm text-muted-foreground" data-testid="text-host-note">You're hosting — hosts count toward capacity and can't leave their own plan.</p>;
  else if (going)
    action = (
      <Button data-testid="button-leave" variant="outline" className={big} disabled={busy} onClick={() => leave.mutate({ id: event.id })}>
        {leave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Leave and free my spot
      </Button>
    );
  else if (!me) action = <Button data-testid="button-join" className={big} onClick={() => requireAuth(approval ? "Sign in to request a spot." : "Sign in to join this plan.")}>{approval ? "Sign in to request" : "Sign in to join"}</Button>;
  else if (left === 0) action = <Button data-testid="button-join" className={big} disabled>Full — no spots left</Button>;
  else if (ageOk === false) action = <Button data-testid="button-join" className={big} disabled>For ages {event.minAge}–{event.maxAge}</Button>;
  else if (approval && event.myRequestStatus === "pending") action = <Button data-testid="button-request-pending" className={cn(big, "bg-purple-600 text-white")} disabled><Hourglass className="mr-2 h-4 w-4" />Request pending — host is reviewing</Button>;
  else if (approval && event.myRequestStatus === "declined") action = <Button data-testid="button-request-declined" variant="outline" className={big} disabled>Request declined by host</Button>;
  else if (approval)
    action = (
      <Button data-testid="button-request-join" className={cn(big, event.isPrivate && "bg-purple-600 text-white hover:bg-purple-700")} disabled={busy || !answersOk}
        onClick={() => request.mutate({ id: event.id, data: { answers: questions.map((_, i) => (answers[i] ?? "").trim()) } })}>
        {request.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Request to Join
      </Button>
    );
  else
    action = (
      <Button data-testid="button-join" className={cn(big, "cta-sunset")} disabled={busy} onClick={() => join.mutate({ id: event.id })}>
        {join.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Join this plan
      </Button>
    );

  const showForm = !!me && !mine && !going && !canceled && approval && left > 0 && ageOk !== false && event.myRequestStatus !== "pending" && event.myRequestStatus !== "declined" && questions.length > 0;

  return (
    <Panel
      testId="panel-event"
      onClose={close}
      title={<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold", th.chip)}>{c.emoji} {c.label}</span>}
      footer={
        <div className="space-y-2">
          {err && <p role="alert" data-testid="text-join-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{err}</p>}
          {action}
        </div>
      }
    >
      {canceled && (
        <div className="mb-4 rounded-3xl border-2 border-destructive bg-destructive/10 p-4" data-testid="banner-canceled">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold text-destructive"><Ban className="h-5 w-5" />Canceled by the host</p>
          <p className="mt-1 whitespace-pre-wrap text-sm" data-testid="text-cancellation-reason">“{event.cancellationReason}”</p>
        </div>
      )}
      <div className={cn("relative overflow-hidden rounded-3xl border p-5 pt-6", th.header, th.chip.split(" ").find((x) => x.startsWith("border-")), canceled && "opacity-70")}>
        <div aria-hidden className={cn("absolute inset-x-0 top-0 h-2", th.bar)} />
        <div className="absolute -right-3 -top-4 select-none text-[96px] leading-none opacity-90">{event.emoji}</div>
        <h2 className={cn("relative max-w-[78%] font-display text-2xl font-extrabold leading-tight", canceled && "line-through")} data-testid="text-event-title">{event.title}</h2>
        <div className="relative mt-3 space-y-1.5 text-sm">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800"><CalendarClock className="h-4 w-4" />{formatWhen(event.startsAt)}</p>
          <p className="flex items-center gap-2 font-semibold"><MapPin className={cn("h-4 w-4", th.text)} />{event.locationName}</p>
        </div>
      </div>

      <EventTags event={event} className="mt-3" />

      {event.isPaid && (
        <p className="mt-3 rounded-2xl bg-yellow-100 px-4 py-3 text-[15px] font-bold text-slate-900" data-testid="text-price">
          {formatPrice(event.price)} — {event.costDetails}
          <span className="block text-xs font-medium text-slate-600">Paid plan · settle with the host directly. Requests need host approval.</span>
        </p>
      )}
      {event.isPrivate && !canceled && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm text-purple-900" data-testid="text-private-status">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />Private plan — the host approves every request{questions.length ? ` and asks ${questions.length} screening question${questions.length > 1 ? "s" : ""}.` : "."}
        </p>
      )}
      {(event.languages ?? []).length > 0 && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-languages"><Languages className="h-4 w-4" />Spoken: {event.languages.join(", ")}</p>}

      {event.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed" data-testid="text-description">{event.description}</p>}

      {showForm && (
        <div className="mt-4 space-y-3 rounded-3xl border border-purple-300 p-4" data-testid="form-screening">
          <p className="text-sm font-bold">Answer every question to request a spot</p>
          {questions.map((qq, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-[13px] font-semibold">{qq}</span>
              <textarea data-testid={`input-answer-${i}`} rows={2} maxLength={2000} value={answers[i] ?? ""} onChange={(e) => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-[15px] outline-none focus:border-purple-500" />
            </label>
          ))}
        </div>
      )}

      {member && (
        <Button data-testid="button-open-group" variant="secondary" className="mt-4 h-11 w-full rounded-full border-0 bg-gradient-to-r from-teal-400 to-sky-500 font-bold text-white hover:brightness-105" onClick={() => nav(`/group/${event.id}`)}>
          <MessagesSquare className="mr-2 h-4 w-4" />Open group chat{canceled ? " (read-only)" : ""}
        </Button>
      )}

      <div className="mt-5 space-y-3 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-teal-600" />Who's going</span>
          <AgeBadge event={event} fits={ageOk} />
        </div>
        <CapacityBar event={event} />
        {event.attendees.length ? <FaceStack users={event.attendees} hostId={event.host.id} max={10} size={38} /> : <p className="text-sm text-muted-foreground">No one yet.</p>}
        {me && ageOk === false && !mine && <p className="text-sm font-medium text-destructive">You're {me.age}; this plan is for {event.minAge}–{event.maxAge}.</p>}
        {!me && <p className="text-xs text-muted-foreground">Adults 18+ · ages are self-reported.</p>}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50/60 p-3">
        <Face user={event.host} size={44} ring={false} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Crown className="h-3 w-3 text-amber-500" />Host</p>
          <p className="truncate font-bold" data-testid="text-host">@{event.host.username} · {event.host.age}</p>
        </div>
        {!mine && event.allowMessages && (
          <Button data-testid="button-message-host" variant="secondary" className="rounded-full border border-pink-200 bg-pink-100 text-pink-700 hover:bg-pink-200" onClick={() => requireAuth("Sign in to message the host.") && nav(`/chat/${event.id}/${event.host.id}`)}>
            <MessageCircle className="mr-1.5 h-4 w-4" />Message
          </Button>
        )}
        {!mine && !event.allowMessages && <span className="text-xs text-muted-foreground">Messages off</span>}
      </div>

      {mine && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button data-testid="button-copy-invite" variant="outline" className="rounded-full border-sky-300 text-sky-700 hover:bg-sky-50" onClick={copyInvite}><Copy className="mr-1.5 h-4 w-4" />Copy Invite Link</Button>
            <Button data-testid="button-edit-event" variant="outline" className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-50" disabled={canceled} onClick={() => nav(`/edit/${event.id}`)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          </div>
          {!canceled && <PrivacySwitch event={event} />}
          {!canceled && <PendingRequests eventId={event.id} />}
          {!canceled && (
            <Button data-testid="button-cancel-event" variant="ghost" className="w-full rounded-full text-destructive hover:bg-destructive/10" onClick={() => setShowCancel(true)}>
              <Ban className="mr-1.5 h-4 w-4" />Cancel Event
            </Button>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Meet in public places. Lezgo never shares phone numbers or addresses.</p>
      {showCancel && <CancelModal eventId={event.id} title={event.title} onClose={() => setShowCancel(false)} />}
    </Panel>
  );
}
