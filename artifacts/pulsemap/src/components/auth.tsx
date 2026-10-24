import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import {
  getGetDemoUsersQueryKey,
  useGetDemoUsers,
  useLogin,
  useRegister,
  useSwitchDemoUser,
  type User,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApp, type AuthTab } from "@/lib/app-context";
import { apiError, AVATAR_SEEDS } from "@/lib/pulse";
import { Face } from "@/components/bits";
import { cn } from "@/lib/utils";
import { LezgoLogo } from "@/components/logo";

const input = "h-11 w-full rounded-full px-4 border border-input bg-background px-3 text-[15px] outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

export function useDemoSwitch() {
  const { onIdentityChange, closeAuth } = useApp();
  const { toast } = useToast();
  return useSwitchDemoUser({
    mutation: {
      onSuccess: (u) => { onIdentityChange(); closeAuth(); toast({ title: `Now viewing as @${u.username}`, description: "Demo switch — for judging only." }); },
      onError: (e) => toast({ title: "Couldn't switch", description: apiError(e), variant: "destructive" }),
    },
  });
}

export function DemoList({ onPicked }: { onPicked?: () => void }) {
  const { me } = useApp();
  const q = useGetDemoUsers({ query: { queryKey: getGetDemoUsersQueryKey() } });
  const sw = useDemoSwitch();
  if (q.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  if (q.isError) return <p className="text-sm text-destructive">{apiError(q.error)} <button className="underline" onClick={() => q.refetch()}>Retry</button></p>;
  if (!q.data?.length) return <p className="text-sm text-muted-foreground">No demo accounts are seeded yet.</p>;
  return (
    <div className="space-y-2">
      {q.data.map((u: User) => (
        <button
          key={u.id}
          data-testid={`button-demo-${u.id}`}
          disabled={sw.isPending}
          onClick={() => sw.mutate({ data: { userId: u.id } }, { onSuccess: () => onPicked?.() })}
          className={cn("flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-muted/50", me?.id === u.id ? "border-primary bg-primary/5" : "border-border")}
        >
          <Face user={u} size={40} ring={false} />
          <span className="flex-1"><span className="block font-bold">@{u.username}</span><span className="text-xs text-muted-foreground">{u.age} years</span></span>
          {me?.id === u.id ? <Check className="h-4 w-4 text-primary" /> : sw.isPending && sw.variables?.data.userId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </button>
      ))}
    </div>
  );
}

function Err({ children }: { children: ReactNode }) {
  return <p role="alert" data-testid="text-auth-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{children}</p>;
}

export function AuthModal() {
  const { auth, closeAuth, openAuth, onIdentityChange, mobile } = useApp();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [seed, setSeed] = useState(AVATAR_SEEDS[0]);
  const [err, setErr] = useState<string | null>(null);

  const done = (u: User, verb: string) => { onIdentityChange(); closeAuth(); setPassword(""); setErr(null); toast({ title: `${verb}, @${u.username}` }); };
  const login = useLogin({ mutation: { onSuccess: (u) => done(u, "Welcome back"), onError: (e) => setErr(apiError(e)) } });
  const reg = useRegister({ mutation: { onSuccess: (u) => done(u, "Welcome to the neighbourhood"), onError: (e) => setErr(apiError(e)) } });

  if (!auth) return null;
  const tab = auth.tab;
  const setTab = (t: AuthTab) => { setErr(null); openAuth(t, auth.reason); };

  const validate = (full: boolean) => {
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return "Username: 3–24 letters, numbers or underscores.";
    if (password.length < 8) return "Password needs at least 8 characters.";
    if (full) {
      const a = Number(age);
      if (!Number.isInteger(a) || a < 18 || a > 120) return "Lezgo is for adults 18 and over.";
    }
    return null;
  };
  const submit = () => {
    const v = validate(tab === "register");
    setErr(v);
    if (v) return;
    if (tab === "login") login.mutate({ data: { username, password } });
    else reg.mutate({ data: { username, password, age: Number(age), avatarSeed: seed } });
  };
  const pending = login.isPending || reg.isPending;

  return (
    <div className={cn("absolute inset-0 z-[2000] grid bg-[hsl(222_45%_10%/.45)] backdrop-blur-[2px]", mobile ? "place-items-end" : "place-items-center")} onClick={closeAuth} data-testid="modal-auth">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={cn("rainbow-strip relative max-h-[92%] w-full max-w-[420px] overflow-y-auto bg-card p-6 shadow-2xl", mobile ? "rounded-t-[28px]" : "rounded-[28px]")}
      >
        <button aria-label="Close" data-testid="button-close-auth" onClick={closeAuth} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        <div className="mb-3" aria-label="Lezgo"><LezgoLogo size={44} /></div>
        <h2 className="font-display text-2xl font-extrabold">{tab === "register" ? "Make your face" : tab === "demo" ? "Try a demo neighbour" : "Hey again"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{auth.reason ?? "No email. No phone. Just a username, your age and a face."}</p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-pink-100 bg-gradient-to-r from-violet-50 via-pink-50 to-orange-50 p-1">
          {(["login", "register", "demo"] as AuthTab[]).map((t) => (
            <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={cn("rounded-full py-2 text-sm font-bold transition", tab === t ? "brand-grad text-white shadow-brand" : "text-muted-foreground hover:bg-white hover:text-pink-600")}>
              {t === "login" ? "Sign in" : t === "register" ? "Join" : "Demo"}
            </button>
          ))}
        </div>

        {tab === "demo" ? (
          <div className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">Demo switching is a judging tool, not identity verification.</p>
            <DemoList />
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {tab === "register" && (
              <div>
                <span className="mb-2 block text-[13px] font-bold">Pick your face</span>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_SEEDS.map((s) => (
                    <button type="button" key={s} data-testid={`button-avatar-${s}`} onClick={() => setSeed(s)} aria-pressed={seed === s}
                      className={cn("rounded-2xl p-1 transition active:scale-95", seed === s ? "bg-pink-100 shadow-[0_0_0_2px_#ec4899]" : "hover:bg-amber-50")}>
                      <Face user={{ avatarSeed: s, username: s }} size={64} ring={false} className="mx-auto h-auto w-full" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input data-testid="input-username" className={input} placeholder="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input data-testid="input-password" className={input} type="password" placeholder="password (8+ characters)" autoComplete={tab === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {tab === "register" && (
              <>
                <input data-testid="input-age" className={input} type="number" min={18} max={120} placeholder="age" value={age} onChange={(e) => setAge(e.target.value)} />
                <p className="text-xs text-muted-foreground">Adults 18+ only. Age is self-reported and shown on your profile.</p>
              </>
            )}
            {err && <Err>{err}</Err>}
            <Button data-testid="button-auth-submit" type="submit" className="cta-sunset h-12 w-full rounded-full text-base font-bold" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tab === "login" ? "Sign in" : "Create my profile"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
