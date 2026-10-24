import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Lock, RotateCw, SendHorizonal } from "lucide-react";
import {
  getGetInboxQueryKey,
  getGetMessagesQueryKey,
  useGetInbox,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp, useEvents } from "@/lib/app-context";
import { apiError } from "@/lib/pulse";
import { Blank, Face, Panel } from "@/components/bits";
import { cn } from "@/lib/utils";

export function useInbox() {
  const { me } = useApp();
  return useGetInbox({ query: { enabled: !!me, queryKey: getGetInboxQueryKey(), refetchInterval: 4000 } });
}

function SignInGate({ reason }: { reason: string }) {
  const { openAuth } = useApp();
  return <Blank emoji="🗣️" title="Your messages live here" body={reason} action={<Button data-testid="button-inbox-signin" onClick={() => openAuth("login", reason)}>Sign in</Button>} />;
}

export function InboxPanel() {
  const [, nav] = useLocation();
  const { me } = useApp();
  const q = useInbox();
  return (
    <Panel title="Inbox" onClose={() => nav("/")} testId="panel-inbox">
      {!me ? (
        <SignInGate reason="Sign in to read private, event-linked messages." />
      ) : q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}</div>
      ) : q.isError ? (
        <Blank title="Inbox didn't load" body={apiError(q.error)} action={<Button variant="outline" onClick={() => q.refetch()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button>} />
      ) : !q.data?.conversations.length ? (
        <Blank emoji="☕" title="No conversations yet" body="Open a plan and tap Message to say hi to the host before you show up." action={<Button variant="outline" onClick={() => nav("/")}>Browse the map</Button>} />
      ) : (
        <ul className="space-y-2">
          {q.data.conversations.map((c) => (
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
              <Button data-testid="button-send" type="submit" size="icon" className="h-11 w-11 rounded-full" disabled={!text.trim() || send.isPending} aria-label="Send">
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
