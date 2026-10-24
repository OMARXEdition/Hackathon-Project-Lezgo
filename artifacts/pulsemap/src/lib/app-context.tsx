import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDemoUsersQueryKey,
  getGetEventDetailQueryKey,
  getGetEventRequestsQueryKey,
  getGetGroupMessagesQueryKey,
  getGetInboxQueryKey,
  getGetEventsQueryKey,
  getGetMapConfigQueryKey,
  getGetMeQueryKey,
  useGetEvents,
  useGetMe,
  type User,
} from "@workspace/api-client-react";

export type AuthTab = "login" | "register" | "demo";
type AuthState = { tab: AuthTab; reason?: string } | null;

type Ctx = {
  mobile: boolean;
  narrowWindow: boolean;
  preview: "desktop" | "mobile";
  setPreview: (p: "desktop" | "mobile") => void;
  me: User | null;
  meLoading: boolean;
  auth: AuthState;
  openAuth: (tab?: AuthTab, reason?: string) => void;
  closeAuth: () => void;
  requireAuth: (reason: string) => boolean;
  onIdentityChange: () => void;
  invite: string | null;
  clearInvite: () => void;
};

const KEEP = new Set<string>([getGetMeQueryKey()[0], getGetMapConfigQueryKey()[0], getGetDemoUsersQueryKey()[0]]);
const readInvite = () => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("invite");
  return v && v.trim() ? v.trim() : null;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [narrowWindow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [auth, setAuth] = useState<AuthState>(null);

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 768);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const meQ = useGetMe({ query: { queryKey: getGetMeQueryKey(), refetchInterval: 30000 } });
  const me = meQ.data?.user ?? null;
  const isAdmin = me?.username === "Admin";
  useEffect(() => { if (!isAdmin) setPreview("desktop"); }, [isAdmin]);

  const openAuth = useCallback((tab: AuthTab = "login", reason?: string) => setAuth({ tab, reason }), []);
  const closeAuth = useCallback(() => setAuth(null), []);
  const requireAuth = useCallback(
    (reason: string) => {
      if (me) return true;
      setAuth({ tab: "login", reason });
      return false;
    },
    [me],
  );
  const [invite, setInvite] = useState<string | null>(readInvite);
  const clearInvite = useCallback(() => {
    setInvite(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("invite")) {
      url.searchParams.delete("invite");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, []);

  // Every session-specific cache (events, details, requests, groups, inbox, DMs) is wiped on identity change.
  const resetSession = useCallback(() => {
    const pred = (q: { queryKey: readonly unknown[] }) => !KEEP.has(String(q.queryKey[0]));
    qc.cancelQueries({ predicate: pred });
    qc.resetQueries({ predicate: pred });
  }, [qc]);
  const onIdentityChange = useCallback(() => {
    resetSession();
    qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  }, [qc, resetSession]);

  // Also catch identity changes we didn't trigger (expired session, other tab).
  const lastId = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (meQ.isLoading) return;
    const id = me?.id ?? null;
    if (lastId.current !== undefined && lastId.current !== id) resetSession();
    lastId.current = id;
  }, [me?.id, meQ.isLoading, resetSession]);

  const value = useMemo<Ctx>(
    () => ({
      mobile: narrowWindow || preview === "mobile",
      narrowWindow,
      preview,
      setPreview,
      me,
      meLoading: meQ.isLoading,
      auth,
      openAuth,
      closeAuth,
      requireAuth,
      onIdentityChange,
      invite,
      clearInvite,
    }),
    [narrowWindow, preview, me, meQ.isLoading, auth, openAuth, closeAuth, requireAuth, onIdentityChange, invite, clearInvite],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export function useEvents() {
  return useGetEvents({ query: { queryKey: getGetEventsQueryKey(), refetchInterval: 3500 } });
}

export function useRefreshEvent() {
  const qc = useQueryClient();
  return useCallback(
    (id?: number) => {
      qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetInboxQueryKey() });
      if (id != null) {
        qc.invalidateQueries({ queryKey: getGetEventDetailQueryKey(id) });
        qc.invalidateQueries({ queryKey: getGetEventRequestsQueryKey(id) });
        qc.invalidateQueries({ queryKey: getGetGroupMessagesQueryKey(id) });
      }
    },
    [qc],
  );
}
