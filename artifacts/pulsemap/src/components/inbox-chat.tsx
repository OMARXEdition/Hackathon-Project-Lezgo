import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Ban, Bell, Lock, RotateCw, SendHorizonal } from "lucide-react";
import {
  getGetEventDetailQueryKey,
  getGetGroupMessagesQueryKey,
  getGetInboxQueryKey,
  getGetMessagesQueryKey,
  useGetEventDetail,
  useGetGroupMessages,
  useGetInbox,
  useGetMessages,
  useReadNotification,
  useSendGroupMessage,
  useSendMessage,
  type Inbox,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp, useEvents, useRefreshEvent } from "@/lib/app-context";
import { RequestCard } from "@/components/event-details";
import { apiError } from "@/lib/pulse";
import { Blank, Face, Panel } from "@/components/bits";
import { cn } from "@/lib/utils";

export function useInbox() {
  const { me } = useApp();
  return useGetInbox({ query: { enabled: !!me, queryKey: getGetInboxQueryKey(), refetchInterval: 3500 } });
}

function SignInGate({ reason }: { reason: string }) {
  const { openAuth } = useApp();
  return <Blank emoji="🗣️" title="Your messages live here" body={reason} action={<Button data-testid="button-inbox-signin" onClick={() => openAuth("login", reason)}>Sign in</Button>} />;
}

type InboxTab = "groups" | "private" | "notifications";

export function inboxBadge(d: Inbox | undefined) {
  if (!d) return 0;
  // The API total already includes group messages and unread notifications.
  return d.unreadCount + (d.requests ?? []).length;
}

export function InboxPanel() {
  const [, nav] = useLocation();
  const { me } = useApp();
  const q = useInbox();
  const qc = useQueryClient();
  const [tab, setTab] = useState<InboxTab>("groups");
  const read = useReadNotification({ mutation: { onSettled: () => qc.invalidateQueries({ queryKey: getGetInboxQueryKey() }) } });
  const d = q.data;
  const counts: Record<InboxTab, number> = {
    groups: (d?.groups ?? []).reduce((n, g) => n + g.unreadCount, 0),
    private: (d?.conversations ?? []).reduce((n, c) => n + c.unreadCount, 0),
    notifications: (d?.notifications ?? []).filter((n) => !n.readAt).length + (d?.requests ?? []).length,
  };
  const tabs: { k: InboxTab; label: string }[] = [
    { k: "groups", label: "Group Chats" },
    { k: "private", label: "Private Messages" },
    { k: "notifications", label: "Notifications / Requests" },
  ];

  let body;
  if (!me) body = <SignInGate reason="Sign in to read group chats, private messages and requests." />;
  else if (q.isLoading) body = <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}</div>;
  else if (q.isError || !d) body = <Blank title="Inbox didn't load" body={apiError(q.error)} action={<Button variant="outline" onClick={() => q.refetch()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button>} />;
  else if (tab === "groups")
    body = !d.groups.length ? (
      <Blank title="No group chats yet" body="Join or host a plan — every plan gets a group chat for the host and accepted attendees." action={<Button variant="outline" onClick={() => nav("/")}>Browse the map</Button>} />
    ) : (
      <ul className="space-y-2">
        {d.groups.map((g) => (
          <li key={g.eventId}>
            <button data-testid={`row-group-${g.eventId}`} onClick={() => nav(`/group/${g.eventId}`)}
              className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-muted/50", g.unreadCount ? "border-primary/40 bg-primary/5" : "border-border")}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">{g.eventEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate font-bold", g.canceled && "line-through opacity-70")}>{g.eventTitle}</span>
                  {g.lastMessage && <span className="shrink-0 text-[11px] text-muted-foreground">{format(new Date(g.lastMessage.createdAt), "HH:mm")}</span>}
                </div>
                <p className="text-xs font-semibold text-primary">{g.memberCount} members{g.canceled ? " · canceled" : ""}</p>
                <p className={cn("truncate text-sm", g.unreadCount ? "font-semibold" : "text-muted-foreground")}>
                  {g.lastMessage ? `${g.lastMessage.isSystem ? "Announcement" : g.lastMessage.sender.id === me.id ? "You" : "@" + g.lastMessage.sender.username}: ${g.lastMessage.text}` : "No messages yet — say hi."}
                </p>
              </div>
              {g.unreadCount > 0 && <span data-testid={`badge-group-unread-${g.eventId}`} className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">{g.unreadCount}</span>}
            </button>
          </li>
        ))}
      </ul>
    );
  else if (tab === "private")
    body = !d.conversations.length ? (
      <Blank title="No conversations yet" body="Open a plan and tap Message to say hi to the host before you show up." action={<Button variant="outline" onClick={() => nav("/")}>Browse the map</Button>} />
    ) : (
      <ul className="space-y-2">
        {d.conversations.map((c) => (
          <li key={`${c.eventId}-${c.otherUser.id}`}>
            <button
              data-testid={`row-conversation-${c.eventId}-${c.otherUser.id}`}
              onClick={() => nav(`/chat/${c.eventId}/${c.otherUser.id}`)}
              className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-muted/50", c.unreadCount ? "border-primary/40 bg-primary/5" : "border-border")}
            >
              <div className="relative">
                <Face user={c.otherUser} size={46} ring={false} />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-card text-sm shadow">{c.eventEmoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-bold">@{c.otherUser.username}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{format(new Date(c.lastMessage.createdAt), "HH:mm")}</span>
                </div>
                <p className="truncate text-xs font-semibold text-primary">{c.eventTitle}</p>
                <p className={cn("truncate text-sm", c.unreadCount ? "font-semibold" : "text-muted-foreground")}>
                  {c.lastMessage.senderId === me.id && "You: "}{c.lastMessage.text}
                </p>
              </div>
              {c.unreadCount > 0 && <span data-testid={`badge-unread-${c.eventId}-${c.otherUser.id}`} className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">{c.unreadCount}</span>}
            </button>
          </li>
        ))}
      </ul>
    );
  else
    body = !d.requests.length && !d.notifications.length ? (
      <Blank title="All quiet" body="Join requests for your private or paid plans and updates about your plans land here." />
    ) : (
      <div className="space-y-5">
        {d.requests.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-800">Pending requests · {d.requests.length}</h3>
            <div className="space-y-2">{d.requests.map((r) => <RequestCard key={r.id} r={r} showEvent />)}</div>
          </section>
        )}
        {d.notifications.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</h3>
            <ul className="space-y-2">
              {d.notifications.map((n) => (
                <li key={n.id}>
                  <button data-testid={`row-notification-${n.id}`}
                    onClick={() => { if (!n.readAt) read.mutate({ id: n.id }); nav(`/events/${n.eventId}`); }}
                    className={cn("flex w-full gap-3 rounded-2xl border p-3 text-left transition hover:bg-muted/50", n.readAt ? "border-border" : "border-accent/50 bg-accent/5")}>
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", n.kind.includes("cancel") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                      {n.kind.includes("cancel") ? <Ban className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-primary">{n.eventTitle}</span>
                      <span className={cn("block whitespace-pre-wrap text-sm", !n.readAt && "font-semibold")}>{n.text}</span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(n.createdAt), "d MMM, HH:mm")}</span>
                    </span>
                    {!n.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );

  return (
    <Panel title="Inbox" onClose={() => nav("/")} testId="panel-inbox">
      {me && (
        <div className="sticky top-0 z-10 -mx-1 mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1" role="tablist">
          {tabs.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} data-testid={`tab-inbox-${t.k}`} onClick={() => setTab(t.k)}
              className={cn("relative rounded-xl px-1 py-2 text-[11.5px] font-bold leading-tight transition", tab === t.k ? "bg-card shadow" : "text-muted-foreground")}>
              {t.label}
              {counts[t.k] > 0 && <span className="absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-accent-foreground">{counts[t.k]}</span>}
            </button>
          ))}
        </div>
      )}
      {body}
    </Panel>
  );
}

export function GroupChatPanel({ eventId }: { eventId: number }) {
  const [, nav] = useLocation();
  const { me } = useApp();
  const refresh = useRefreshEvent();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const detail = useGetEventDetail(eventId, { query: { enabled: !!me && !!eventId, queryKey: getGetEventDetailQueryKey(eventId), refetchInterval: 4000 } });
  const msgs = useGetGroupMessages(eventId, { query: { enabled: !!me && !!eventId, queryKey: getGetGroupMessagesQueryKey(eventId), refetchInterval: 3000, retry: false } });
  const send = useSendGroupMessage({
    mutation: {
      onSuccess: () => { setText(""); setErr(null); refresh(eventId); },
      onError: (e) => { setErr(apiError(e)); refresh(eventId); },
    },
  });
  const count = msgs.data?.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    qc.invalidateQueries({ queryKey: getGetInboxQueryKey() });
  }, [count, qc]);

  const ev = detail.data;
  const canceled = ev?.status === "canceled";
  const back = () => nav("/inbox");
  const title = (
    <span className="flex items-center gap-2">
      <button onClick={back} aria-label="Back to inbox" data-testid="button-group-back" className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-lg">{ev?.emoji ?? "…"}</span>
      <span className="min-w-0">
        <button onClick={() => nav(`/events/${eventId}`)} className={cn("block max-w-[230px] truncate text-left text-base hover:underline", canceled && "line-through")} data-testid="link-group-event">{ev?.title ?? "Group chat"}</button>
        <span className="block truncate text-xs font-semibold text-primary">{ev ? `${ev.joinedCount} members · group chat` : "Loading…"}</span>
      </span>
    </span>
  );
  if (!me) return <Panel title="Group chat" onClose={() => nav("/")} testId="panel-group"><SignInGate reason="Sign in to open this group chat." /></Panel>;

  const submit = () => {
    const t = text.trim();
    if (!t || canceled) return;
    send.mutate({ id: eventId, data: { text: t } });
  };

  return (
    <Panel
      title={title}
      onClose={() => nav("/")}
      testId="panel-group"
      footer={
        msgs.isError ? undefined : canceled ? (
          <p data-testid="text-group-locked" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <Lock className="h-4 w-4 shrink-0" />This plan was canceled. The chat is read-only.
          </p>
        ) : (
          <div className="space-y-2">
            {err && <p role="alert" className="text-sm font-medium text-destructive" data-testid="text-group-send-error">{err}</p>}
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <textarea data-testid="input-group-message" rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Message everyone going…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2.5 text-[15px] outline-none focus:border-primary" />
              <Button data-testid="button-group-send" type="submit" size="icon" className="h-11 w-11 rounded-full cta-sunset" disabled={!text.trim() || send.isPending} aria-label="Send">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )
      }
    >
      {msgs.isLoading ? (
        <div className="space-y-2 pt-2"><Skeleton className="h-10 w-2/3 rounded-2xl" /><Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" /></div>
      ) : msgs.isError ? (
        <Blank title="Members only" body={apiError(msgs.error, "Only the host and accepted attendees can read this group chat.")} action={<div className="flex gap-2"><Button variant="outline" onClick={() => msgs.refetch()}>Retry</Button><Button onClick={() => nav(`/events/${eventId}`)}>View plan</Button></div>} />
      ) : !count ? (
        <Blank title="Kick off the group" body="Agree on a landmark, share an ETA, check who's bringing what." />
      ) : (
        <div className="flex flex-col gap-1.5 pt-2" data-testid="list-group-messages">
          {msgs.data!.map((m, i) => {
            if (m.isSystem)
              return (
                <div key={m.id} data-testid={`msg-system-${m.id}`} className="my-2 self-stretch rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-center text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Announcement · {format(new Date(m.createdAt), "d MMM HH:mm")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{m.text}</p>
                </div>
              );
            const mine = m.sender.id === me.id;
            const prev = msgs.data![i - 1];
            const showName = !mine && (!prev || prev.sender.id !== m.sender.id || prev.isSystem);
            return (
              <div key={m.id} className={cn("flex max-w-[85%] items-end gap-2", mine ? "self-end" : "self-start")}>
                {!mine && <span className="w-7 shrink-0">{showName && <Face user={m.sender} size={28} ring={false} />}</span>}
                <div className={cn("rounded-3xl px-4 py-2 text-[15px] animate-in fade-in slide-in-from-bottom-1", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary")}>
                  {showName && <p className="text-[11px] font-bold text-primary">@{m.sender.username}{ev?.host.id === m.sender.id ? " · host" : ""}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{format(new Date(m.createdAt), "HH:mm")}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
    </Panel>
  );
}

export function ChatPanel({ eventId, userId }: { eventId: number; userId: number }) {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { me } = useApp();
  const events = useEvents();
  const inbox = useInbox();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const msgs = useGetMessages(eventId, userId, {
    query: { enabled: !!me && !!eventId && !!userId, queryKey: getGetMessagesQueryKey(eventId, userId), refetchInterval: 3000 },
  });
  const send = useSendMessage({
    mutation: {
      onSuccess: () => {
        setText("");
        setErr(null);
        qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(eventId, userId) });
        qc.invalidateQueries({ queryKey: getGetInboxQueryKey() });
      },
      onError: (e) => setErr(apiError(e)),
    },
  });

  const count = msgs.data?.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    qc.invalidateQueries({ queryKey: getGetInboxQueryKey() });
  }, [count, qc]);

  const event = events.data?.find((e) => e.id === eventId);
  const convo = inbox.data?.conversations.find((c) => c.eventId === eventId && c.otherUser.id === userId);
  const other = event ? (event.host.id === userId ? event.host : event.attendees.find((a) => a.id === userId)) : undefined;
  const otherUser = other ?? convo?.otherUser;
  const iAmHost = !!me && event?.host.id === me.id;
  const allow = event ? event.allowMessages : convo?.allowMessages ?? true;
  const blocked = !iAmHost && !allow;

  const back = () => nav("/inbox");
  const title = (
    <span className="flex items-center gap-2">
      <button onClick={back} aria-label="Back to inbox" data-testid="button-chat-back" className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
      {otherUser && <Face user={otherUser} size={32} ring={false} />}
      <span className="min-w-0">
        <span className="block truncate text-base">@{otherUser?.username ?? "neighbour"}</span>
        <span className="block truncate text-xs font-semibold text-primary">{event?.emoji ?? convo?.eventEmoji} {event?.title ?? convo?.eventTitle ?? "Plan"}</span>
      </span>
    </span>
  );

  if (!me)
    return <Panel title="Messages" onClose={() => nav("/")} testId="panel-chat"><SignInGate reason="Sign in to open this conversation." /></Panel>;

  const submit = () => {
    const t = text.trim();
    if (!t || blocked) return;
    send.mutate({ eventId, userId, data: { text: t } });
  };

  return (
    <Panel
      title={title}
      onClose={() => nav("/")}
      testId="panel-chat"
      footer={
        blocked ? (
          <p data-testid="text-messages-blocked" className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />The host has paused new messages. History stays readable here.
          </p>
        ) : (
          <div className="space-y-2">
            {err && <p role="alert" className="text-sm font-medium text-destructive" data-testid="text-send-error">{err}</p>}
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <textarea
                data-testid="input-message"
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Say hi, ask what to bring…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2.5 text-[15px] outline-none focus:border-primary"
              />
              <Button data-testid="button-send" type="submit" size="icon" className="h-11 w-11 rounded-full cta-sunset" disabled={!text.trim() || send.isPending} aria-label="Send">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )
      }
    >
      {msgs.isLoading ? (
        <div className="space-y-2 pt-2"><Skeleton className="h-10 w-2/3 rounded-2xl" /><Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" /></div>
      ) : msgs.isError ? (
        <Blank title="Couldn't open this chat" body={apiError(msgs.error)} action={<Button variant="outline" onClick={() => msgs.refetch()}>Retry</Button>} />
      ) : !count ? (
        <Blank title="Start the conversation" body={blocked ? "Messaging is off for this plan right now." : "Keep it about the plan. Meet in a public place."} />
      ) : (
        <div className="flex flex-col gap-1.5 pt-2" data-testid="list-messages">
          {msgs.data!.map((m) => {
            const mine = m.senderId === me.id;
            return (
              <div key={m.id} className={cn("max-w-[80%] rounded-3xl px-4 py-2 text-[15px] animate-in fade-in slide-in-from-bottom-1", mine ? "self-end rounded-br-md bg-primary text-primary-foreground" : "self-start rounded-bl-md bg-secondary")}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{format(new Date(m.createdAt), "HH:mm")}{mine && m.readAt ? " · seen" : ""}</p>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
    </Panel>
  );
}
