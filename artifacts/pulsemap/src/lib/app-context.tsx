import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetEventsQueryKey,
  getGetInboxQueryKey,
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
  const onIdentityChange = useCallback(() => {
    qc.removeQueries({ queryKey: getGetInboxQueryKey() });
    qc.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/messages") });
    qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  }, [qc]);

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
    }),
    [narrowWindow, preview, me, meQ.isLoading, auth, openAuth, closeAuth, requireAuth, onIdentityChange],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export function useEvents() {
  return useGetEvents({ query: { queryKey: getGetEventsQueryKey(), refetchInterval: 4000 } });
}
