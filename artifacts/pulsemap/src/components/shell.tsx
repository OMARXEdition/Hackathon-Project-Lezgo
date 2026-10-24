import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Inbox, List, LogOut, Map as MapIcon, Monitor, Plus, RotateCw, Smartphone, UserRound, Users } from "lucide-react";
import { getGetEventsQueryKey, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useApp, useEvents } from "@/lib/app-context";
import { apiError, EMPTY_FILTERS, filterEvents, ISTANBUL, type Filters } from "@/lib/pulse";
import { Blank, Face } from "@/components/bits";
import { EventCard, FilterBar } from "@/components/event-bits";
import { EventsMap } from "@/components/map-view";
import { AuthModal, DemoList } from "@/components/auth";
import { inboxBadge, useInbox } from "@/components/inbox-chat";
import { cn } from "@/lib/utils";
import { LezgoLogo } from "@/components/logo";

function Logo() {
  return (
    <Link href="/" data-testid="link-home" className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <LezgoLogo size={30} />
      <span className="sr-only">Lezgo home</span>
    </Link>
  );
}

function DeviceToggle() {
  const { preview, setPreview, narrowWindow, me } = useApp();
  if (narrowWindow || me?.username !== "Admin") return null;
  const b = (on: boolean) => cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition", on ? "brand-grad text-white shadow-brand" : "text-muted-foreground hover:bg-white hover:text-fuchsia-700");
  return (
    <div className="flex rounded-full border border-fuchsia-200 bg-white/70 p-1" role="group" aria-label="Preview layout">
      <button data-testid="button-preview-desktop" aria-pressed={preview === "desktop"} className={b(preview === "desktop")} onClick={() => setPreview("desktop")}><Monitor className="h-3.5 w-3.5" />Desktop</button>
      <button data-testid="button-preview-mobile" aria-pressed={preview === "mobile"} className={b(preview === "mobile")} onClick={() => setPreview("mobile")}><Smartphone className="h-3.5 w-3.5" />Mobile</button>
    </div>
  );
}

function AccountMenu({ trigger }: { trigger: ReactNode }) {
  const { me, openAuth, onIdentityChange, auth } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [auth, me?.id]);
  const { toast } = useToast();
  const logout = useLogout({ mutation: { onSuccess: () => { onIdentityChange(); toast({ title: "Signed out", description: "You're browsing as a guest." }); }, onError: (e) => toast({ title: "Couldn't sign out", description: apiError(e), variant: "destructive" }) } });
  return (
    <DropdownMenu open={menuOpen && !auth} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[3000] w-72 rounded-2xl p-3" onCloseAutoFocus={(e) => { if (auth) e.preventDefault(); }}>
        {me ? (
          <div className="flex items-center gap-3 pb-2">
            <Face user={me} size={44} ring={false} />
            <div><p className="font-bold" data-testid="text-me">@{me.username}</p><p className="text-xs text-muted-foreground">{me.age} years{me.isDemo ? " · demo account" : ""}</p></div>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            <p className="text-sm text-muted-foreground">Browsing as a guest.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" data-testid="button-menu-signin" onClick={() => openAuth("login")}>Sign in</Button>
              <Button size="sm" variant="outline" data-testid="button-menu-register" onClick={() => openAuth("register")}>Join</Button>
            </div>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-0 text-xs uppercase tracking-wider text-muted-foreground">Switch demo neighbour</DropdownMenuLabel>
        <DemoList />
        {me && (
          <>
            <DropdownMenuSeparator />
            <button data-testid="button-logout" onClick={() => logout.mutate()} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MeButton() {
  const { me, meLoading } = useApp();
  return (
    <AccountMenu
      trigger={
        <button data-testid="button-account" aria-label="Account and demo switcher" className="pill-pop flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 py-1 pl-1 pr-3 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {meLoading ? <Skeleton className="h-8 w-8 rounded-full" /> : me ? <Face user={me} size={32} ring={false} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary"><UserRound className="h-4 w-4" /></span>}
          <span className="text-sm font-bold">{me ? `@${me.username}` : "Guest"}</span>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      }
    />
  );
}

function EventList({ events, all, loading, error, retry, selectedId, open, reset }: { events: ReturnType<typeof filterEvents>; all: number; loading: boolean; error: unknown; retry: () => void; selectedId: number | null; open: (id: number) => void; reset: () => void }) {
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-3xl" />)}</div>;
  if (error) return <Blank title="The map didn't load" body={apiError(error)} action={<Button variant="outline" onClick={retry}><RotateCw className="mr-2 h-4 w-4" />Retry</Button>} />;
  if (!all) return <Blank emoji="🧘" title="Quiet neighbourhood" body="No plans yet. Be the first to put one on the map." />;
  if (!events.length) return <Blank emoji="🔍" title="Nothing matches" body="Try a different word or loosen a filter." action={<Button variant="outline" data-testid="button-reset-filters" onClick={reset}>Clear filters</Button>} />;
  return (
    <div className="space-y-3" data-testid="list-events">
      {events.map((e) => <EventCard key={e.id} event={e} active={e.id === selectedId} onOpen={() => open(e.id)} />)}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { mobile, preview, narrowWindow, me, meLoading, requireAuth, invite, clearInvite, openAuth, auth } = useApp();
  const { toast } = useToast();
  const [location, nav] = useLocation();
  const [, params] = useRoute("/events/:id");
  const selectedId = params ? Number(params.id) : null;
  const qc = useQueryClient();
  const q = useEvents();
  const inbox = useInbox();
  const unread = me ? inboxBadge(inbox.data) : 0;
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [mView, setMView] = useState<"map" | "list">("map");
  const [center, setCenter] = useState<[number, number]>(ISTANBUL);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateTick, setLocateTick] = useState(0);
  const origin = userLoc ?? center;
  const visible = useMemo(() => filterEvents(q.data ?? [], filters, me, origin), [q.data, filters, me, origin]);
  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) { toast({ title: "Location unavailable", description: "Using the map center instead." }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setUserLoc([p.coords.latitude, p.coords.longitude]); setLocateTick((t) => t + 1); },
      () => { setLocating(false); setUserLoc(null); toast({ title: "Location permission denied", description: "Distances use the current map center instead." }); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [toast]);
  const setF = (f: Filters) => {
    if ((f.nearby && !filters.nearby) || (f.sort === "nearest" && filters.sort !== "nearest")) { if (!userLoc) locate(); }
    setFilters(f);
  };
  const originLabel = userLoc ? "your location" : "the map center";

  // Invite flow: /?invite=ID → auth first, then open the event automatically.
  const inviteAsked = useRef(false);
  useEffect(() => {
    if (!invite || meLoading) return;
    if (!me) {
      if (!inviteAsked.current && !auth) { inviteAsked.current = true; openAuth("register", "You've been invited to a Lezgo plan. Join or sign in to see it."); }
      return;
    }
    const id = Number(invite);
    clearInvite();
    if (Number.isFinite(id) && id > 0) nav(`/events/${id}`);
    else toast({ title: "Invite link looks broken", description: "Ask the host for a fresh link.", variant: "destructive" });
  }, [invite, me, meLoading, auth, openAuth, clearInvite, nav, toast]);
  const open = (id: number) => { setMView("map"); nav(`/events/${id}`); };
  const goCreate = () => { if (requireAuth("Sign in to host a plan.")) nav("/create"); };
  const retry = () => qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  const reset = () => setFilters(EMPTY_FILTERS);
  const list = <EventList events={visible} all={q.data?.length ?? 0} loading={q.isLoading} error={q.error} retry={retry} selectedId={selectedId} open={open} reset={reset} />;

  const app = (
    <div className={cn("relative flex flex-col overflow-hidden bg-background", preview === "mobile" && !narrowWindow ? "h-full w-full" : "h-[100dvh] w-full")}>
      <header className={cn("glass rainbow-strip relative z-[1300] flex items-center justify-between gap-3 border-b border-pink-200/70 shadow-[0_8px_24px_-16px_rgba(236,72,153,.5)]", mobile ? "h-14 px-3" : "h-16 px-5")}>
        <Logo />
        <div className="flex items-center gap-2">
          {!mobile && <DeviceToggle />}
          {!mobile && (
            <>
              <Link href="/inbox" data-testid="link-inbox" className="pill-pop relative grid h-10 w-10 place-items-center rounded-full border border-sky-200 bg-white/80 text-sky-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100" aria-label={`Inbox, ${unread} unread`}>
                <Inbox className="h-4 w-4" />
                {unread > 0 && <span data-testid="badge-inbox-unread" className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-1 text-[10px] font-bold text-accent-foreground">{unread}</span>}
              </Link>
              <Button data-testid="button-create" onClick={goCreate} className="cta-sunset rounded-full px-5 font-bold">+ Create Event</Button>
              <MeButton />
            </>
          )}
          {mobile && preview === "mobile" && !narrowWindow && <DeviceToggle />}
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {mobile ? (
          <>
            <div className="absolute inset-0"><EventsMap events={visible} selectedId={selectedId} onSelect={open} onCenter={setCenter} userLoc={userLoc} locateTick={locateTick} /></div>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 pb-6">
              <div className="glass rainbow-strip pointer-events-auto overflow-hidden rounded-3xl border border-white/70 p-2.5 pt-3.5 shadow-[0_12px_30px_-12px_rgba(168,85,247,.45)]"><FilterBar filters={filters} setFilters={setF} originLabel={originLabel} onLocate={locate} locating={locating} floating /></div>
            </div>
            {!q.isLoading && (
              <button onClick={() => setMView("list")} data-testid="button-count" className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 brand-grad rounded-full px-4 py-2 text-sm font-bold text-white shadow-brand">
                {visible.length} {visible.length === 1 ? "plan" : "plans"} nearby
              </button>
            )}
            {mView === "list" && (
              <div className="absolute inset-0 z-[1050] overflow-y-auto bg-background p-3 animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-3"><FilterBar filters={filters} setFilters={setF} originLabel={originLabel} onLocate={locate} locating={locating} /></div>
                <h2 className="mb-2 font-display text-lg font-bold">{visible.length} plans around Kadıköy</h2>
                {list}
              </div>
            )}
          </>
        ) : (
          <div className="grid h-full grid-cols-[400px_1fr]">
            <section className="flex min-h-0 flex-col border-r border-border bg-sidebar">
              <div className="space-y-3 p-4 pb-3">
                <div>
                  <h1 className="font-display text-[28px] font-extrabold leading-none">Small plans,<br /><span className="lz-word">real neighbours.</span></h1>
                  <p className="mt-2 text-sm text-muted-foreground">Kadıköy, Moda, Beşiktaş & the campuses — pick a pin, show up, meet people.</p>
                </div>
                <FilterBar filters={filters} setFilters={setF} originLabel={originLabel} onLocate={locate} locating={locating} />
                <p className="text-sm font-bold text-fuchsia-700" data-testid="text-result-count">{q.isLoading ? "Loading plans…" : `${visible.length} of ${q.data?.length ?? 0} plans`}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{list}</div>
            </section>
            <div className="relative"><EventsMap events={visible} selectedId={selectedId} onSelect={open} onCenter={setCenter} userLoc={userLoc} locateTick={locateTick} /></div>
          </div>
        )}
        <AnimatePresence>{children}</AnimatePresence>
      </main>

      {mobile && (
        <nav className="glass relative z-[1300] grid h-16 grid-cols-5 items-center border-t border-pink-200/70 px-1" aria-label="Main">
          {[
            { k: "map", icon: MapIcon, label: "Map", on: mView === "map" && location === "/", act: () => { setMView("map"); nav("/"); } },
            { k: "list", icon: List, label: "List", on: mView === "list" && location === "/", act: () => { setMView("list"); nav("/"); } },
          ].map((t) => (
            <button key={t.k} data-testid={`nav-${t.k}`} onClick={t.act} className={cn("flex flex-col items-center gap-0.5 text-[11px] font-bold", t.on ? (t.k === "map" ? "text-teal-600" : "text-sky-600") : "text-muted-foreground")}>
              <t.icon className="h-5 w-5" />{t.label}
            </button>
          ))}
          <button data-testid="nav-create" onClick={goCreate} aria-label="Create Event" className="cta-sunset mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full ring-4 ring-white">
            <Plus className="h-6 w-6" />
          </button>
          <button data-testid="nav-inbox" onClick={() => nav("/inbox")} className={cn("relative flex flex-col items-center gap-0.5 text-[11px] font-bold", location.startsWith("/inbox") || location.startsWith("/chat") || location.startsWith("/group") ? "text-pink-600" : "text-muted-foreground")}>
            <Inbox className="h-5 w-5" />Inbox
            {unread > 0 && <span data-testid="badge-inbox-unread-mobile" className="absolute -top-1 right-[22%] grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-accent-foreground">{unread}</span>}
          </button>
          <AccountMenu
            trigger={
              <button data-testid="nav-me" className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-muted-foreground">
                {me ? <Face user={me} size={22} ring={false} /> : <UserRound className="h-5 w-5" />}{me ? "Me" : "Sign in"}
              </button>
            }
          />
        </nav>
      )}
      <AuthModal />
    </div>
  );

  if (preview === "mobile" && !narrowWindow) {
    return (
      <div className="tile-bg flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-secondary py-6">
        <div className="relative h-[min(844px,calc(100dvh-48px))] w-[390px] overflow-hidden rounded-[44px] border-[10px] border-[#3b0764] shadow-brand" data-testid="frame-mobile">
          {app}
        </div>
      </div>
    );
  }
  return app;
}
