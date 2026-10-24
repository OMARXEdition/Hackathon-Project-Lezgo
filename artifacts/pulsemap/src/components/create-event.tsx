import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { addDays, format, setHours, setMinutes } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { Globe, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { getGetEventDetailQueryKey, useCreateEvent, useEditEvent, useGetEventDetail, type Event, type EventInputCategory, type EventInputLanguagesItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useApp, useRefreshEvent } from "@/lib/app-context";
import { apiError, CATEGORIES, LANGUAGES, QUICK_EMOJIS } from "@/lib/pulse";
import { Blank, Panel } from "@/components/bits";
import { PickerMap } from "@/components/map-view";
import { cn } from "@/lib/utils";

const input = "h-11 w-full rounded-xl border border-input bg-background px-3 text-[15px] outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span>}
    </label>
  );
}

export function CreateEvent() {
  return <EventForm />;
}

export function EditEvent({ id }: { id: number }) {
  const [, nav] = useLocation();
  const { me } = useApp();
  const q = useGetEventDetail(id, { query: { enabled: !!me && !!id, queryKey: getGetEventDetailQueryKey(id) } });
  const close = () => nav(`/events/${id}`);
  if (!me) return <EventForm />;
  if (q.isLoading) return <Panel title="Loading…" onClose={close} testId="panel-edit"><div className="space-y-3"><Skeleton className="h-11 w-full rounded-xl" /><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-11 w-full rounded-xl" /></div></Panel>;
  if (q.isError || !q.data) return <Panel title="Edit plan" onClose={close} testId="panel-edit"><Blank title="Couldn't load this plan" body={apiError(q.error, "It may have been removed.")} action={<Button variant="outline" onClick={() => q.refetch()}>Retry</Button>} /></Panel>;
  if (q.data.host.id !== me.id) return <Panel title="Edit plan" onClose={close} testId="panel-edit"><Blank title="Only the host can edit" body="Ask the host if something needs to change." /></Panel>;
  if (q.data.status === "canceled") return <Panel title="Edit plan" onClose={close} testId="panel-edit"><Blank title="This plan is canceled" body="Canceled plans are locked. History stays readable." /></Panel>;
  return <EventForm key={q.data.id} initial={q.data} />;
}

const toLocal = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd'T'HH:mm"); };

function EventForm({ initial }: { initial?: Event }) {
  const [, nav] = useLocation();
  const refresh = useRefreshEvent();
  const { toast } = useToast();
  const { me, openAuth } = useApp();
  const editing = !!initial;
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: (initial?.category ?? "coffee") as EventInputCategory,
    locationName: initial?.locationName ?? "",
    startsAt: initial ? toLocal(initial.startsAt) : format(setMinutes(setHours(addDays(new Date(), 1), 18), 30), "yyyy-MM-dd'T'HH:mm"),
    maxPeople: String(initial?.maxPeople ?? 6),
    minAge: String(initial?.minAge ?? 18),
    maxAge: String(initial?.maxAge ?? 35),
    emoji: initial?.emoji ?? "☕",
    allowMessages: initial?.allowMessages ?? true,
    isPrivate: initial?.isPrivate ?? false,
    isPaid: initial?.isPaid ?? false,
    price: initial?.isPaid ? String(initial.price) : "",
    costDetails: initial?.costDetails ?? "",
  });
  const [languages, setLanguages] = useState<EventInputLanguagesItem[]>(initial?.languages?.length ? initial.languages : ["English"]);
  const [questions, setQuestions] = useState<string[]>(initial?.screeningQuestions ?? []);
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const create = useCreateEvent({
    mutation: {
      onSuccess: (ev) => {
        refresh(ev.id);
        toast({ title: `${ev.emoji} It's on the map`, description: "You're counted as the first attendee." });
        nav(`/events/${ev.id}`);
      },
      onError: (e) => setServerErr(apiError(e)),
    },
  });
  const edit = useEditEvent({
    mutation: {
      onSuccess: (ev) => {
        refresh(ev.id);
        toast({ title: "Plan updated", description: "Everyone sees the changes right away." });
        nav(`/events/${ev.id}`);
      },
      onError: (e) => setServerErr(apiError(e)),
    },
  });
  const pending = create.isPending || edit.isPending;

  const close = () => nav(initial ? `/events/${initial.id}` : "/");

  if (!me)
    return (
      <Panel title="Host a plan" onClose={close} testId="panel-create">
        <Blank emoji="🗣️" title="Sign in to host" body="Plans are tied to a real neighbour profile — username, age and face. No email, no phone." action={<Button data-testid="button-create-signin" onClick={() => openAuth("login", "Sign in to host a plan.")}>Sign in or join</Button>} />
      </Panel>
    );

  const submit = () => {
    const e: Record<string, string> = {};
    const max = Number(f.maxPeople), minA = Number(f.minAge), maxA = Number(f.maxAge);
    if (f.title.trim().length < 3) e.title = "At least 3 characters.";
    if (f.locationName.trim().length < 2) e.locationName = "Name a public meeting spot.";
    if (lat == null || lng == null) e.map = "Tap the map to drop your pin.";
    if (!f.startsAt || isNaN(new Date(f.startsAt).getTime())) e.startsAt = "Pick a date and time.";
    if (!Number.isInteger(max) || max < 2 || max > 100) e.maxPeople = "Between 2 and 100.";
    if (!Number.isInteger(minA) || minA < 18 || minA > 120) e.minAge = "18–120.";
    if (!Number.isInteger(maxA) || maxA < 18 || maxA > 120) e.maxAge = "18–120.";
    else if (maxA < minA) e.maxAge = "Must be ≥ min age.";
    else if (me.age < minA || me.age > maxA) e.maxAge = `Include your own age (${me.age}).`;
    else if (initial && initial.attendees.some((a) => a.age < minA || a.age > maxA)) e.maxAge = "Some joined people fall outside this range.";
    if (initial && !e.maxPeople && max < initial.joinedCount) e.maxPeople = `${initial.joinedCount} already joined.`;
    if (!f.emoji) e.emoji = "Pick an emoji.";
    const price = Number(f.price);
    if (f.isPaid) {
      if (!f.price.trim() || !Number.isFinite(price) || price <= 0) e.price = "Enter a price above $0.";
      else if (price > 1000000) e.price = "That's too much.";
      if (!f.costDetails.trim()) e.costDetails = "Explain what the cost covers.";
    }
    if (!languages.length) e.languages = "Pick at least one language.";
    const qs = questions.map((x) => x.trim());
    if (f.isPrivate && qs.some((x) => !x)) e.questions = "Fill in or remove empty questions.";
    setErrs(e);
    setServerErr(null);
    if (Object.keys(e).length) return;
    const data = {
      title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        locationName: f.locationName.trim(),
        lat: lat as number,
        lng: lng as number,
        startsAt: new Date(f.startsAt).toISOString(),
        maxPeople: max,
        minAge: minA,
        maxAge: maxA,
        emoji: f.emoji,
        allowMessages: f.allowMessages,
        isPrivate: f.isPrivate,
        isPaid: f.isPaid,
        price: f.isPaid ? Math.round(price * 100) / 100 : 0,
        costDetails: f.isPaid ? f.costDetails.trim() : "",
        languages,
        screeningQuestions: f.isPrivate ? qs : [],
    };
    if (initial) edit.mutate({ id: initial.id, data });
    else create.mutate({ data });
  };

  return (
    <Panel
      title={editing ? "Edit your plan" : "Host a small plan"}
      onClose={close}
      testId={editing ? "panel-edit" : "panel-create"}
      footer={
        <div className="space-y-2">
          {serverErr && <p role="alert" data-testid="text-create-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{serverErr}</p>}
          <Button data-testid="button-submit-event" className="h-12 w-full rounded-2xl text-base" disabled={pending} onClick={submit}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save changes" : "Put it on the map"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="mb-1 block text-[13px] font-bold">Emoji</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                data-testid={`button-emoji-${em}`}
                onClick={() => set("emoji", em)}
                className={cn("grid h-11 w-11 place-items-center rounded-xl border text-2xl transition active:scale-90", f.emoji === em ? "border-primary bg-primary/10 shadow-[0_0_0_2px_hsl(var(--primary))]" : "border-border bg-background hover:-translate-y-0.5")}
              >
                {em}
              </button>
            ))}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button type="button" data-testid="button-emoji-more" aria-label="More emoji" className={cn("grid h-11 min-w-11 place-items-center rounded-xl border border-dashed px-2 text-2xl", !QUICK_EMOJIS.includes(f.emoji) ? "border-primary bg-primary/10" : "border-border")}>
                  {!QUICK_EMOJIS.includes(f.emoji) ? f.emoji : <Plus className="h-5 w-5" />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[3000] w-auto p-0" align="end">
                <EmojiPicker onEmojiClick={(d) => { set("emoji", d.emoji); setPickerOpen(false); }} width={320} height={380} lazyLoadEmojis />
              </PopoverContent>
            </Popover>
          </div>
          {errs.emoji && <span className="mt-1 block text-xs font-semibold text-destructive">{errs.emoji}</span>}
        </div>

        <Field label="What's the plan?" error={errs.title}>
          <input data-testid="input-title" className={input} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Sunset volleyball at Moda" />
        </Field>

        <div>
          <span className="mb-1 block text-[13px] font-bold">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" data-testid={`button-category-${c.id}`} onClick={() => set("category", c.id)}
                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", f.category === c.id ? "border-transparent text-[hsl(40_60%_98%)]" : "border-border bg-background")}
                style={f.category === c.id ? { background: `hsl(${c.hue})` } : undefined}>
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Details" hint="What to bring, how you'll find each other.">
          <textarea data-testid="input-description" maxLength={2000} rows={3} className={cn(input, "h-auto py-2")} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Beginners welcome. Look for the orange ball." />
        </Field>

        <div>
          <span className="mb-1 block text-[13px] font-bold">Pin the exact spot</span>
          <div className={cn("h-48 overflow-hidden rounded-2xl border", errs.map ? "border-destructive" : "border-border")}>
            <PickerMap lat={lat} lng={lng} emoji={f.emoji} onPick={(a, b) => { setLat(a); setLng(b); setErrs((p) => ({ ...p, map: "" })); }} />
          </div>
          <span className={cn("mt-1 block text-xs", errs.map ? "font-semibold text-destructive" : "text-muted-foreground")} data-testid="text-coords">
            {errs.map || (lat != null && lng != null ? `Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Tap anywhere on the map.")}
          </span>
        </div>

        <Field label="Meeting place name" error={errs.locationName}>
          <input data-testid="input-location" className={input} maxLength={160} value={f.locationName} onChange={(e) => set("locationName", e.target.value)} placeholder="Moda Sahili, by the tea garden" />
        </Field>

        <Field label="When" error={errs.startsAt}>
          <input data-testid="input-starts-at" type="datetime-local" className={input} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Max people" error={errs.maxPeople}>
            <input data-testid="input-max-people" type="number" min={2} max={100} className={input} value={f.maxPeople} onChange={(e) => set("maxPeople", e.target.value)} />
          </Field>
          <Field label="Min age" error={errs.minAge}>
            <input data-testid="input-min-age" type="number" min={18} max={120} className={input} value={f.minAge} onChange={(e) => set("minAge", e.target.value)} />
          </Field>
          <Field label="Max age" error={errs.maxAge}>
            <input data-testid="input-max-age" type="number" min={18} max={120} className={input} value={f.maxAge} onChange={(e) => set("maxAge", e.target.value)} />
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
          <span className="text-sm font-semibold">Let people message me<span className="block text-xs font-normal text-muted-foreground">You can switch this off any time.</span></span>
          <Switch data-testid="switch-allow-messages" checked={f.allowMessages} onCheckedChange={(v) => set("allowMessages", v)} />
        </label>

        <div>
          <span className="mb-1 block text-[13px] font-bold">Languages spoken</span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = languages.includes(l);
              return (
                <button key={l} type="button" data-testid={`button-language-${l}`} aria-pressed={on} onClick={() => setLanguages(on ? languages.filter((x) => x !== l) : [...languages, l])}
                  className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
                  {l}
                </button>
              );
            })}
          </div>
          {errs.languages && <span className="mt-1 block text-xs font-semibold text-destructive">{errs.languages}</span>}
        </div>

        <div className="space-y-2">
          <span className="block text-[13px] font-bold">Who can join</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {[false, true].map((priv) => (
              <button key={String(priv)} type="button" role="radio" aria-checked={f.isPrivate === priv} data-testid={`button-visibility-${priv ? "private" : "public"}`} onClick={() => set("isPrivate", priv)}
                className={cn("rounded-2xl border-2 p-3 text-left transition", f.isPrivate === priv ? (priv ? "border-purple-300 bg-purple-600 text-white shadow-[0_0_16px_#a855f7]" : "border-slate-900 bg-white text-slate-900") : "border-border bg-background")}>
                <span className="flex items-center gap-1.5 text-sm font-bold">{priv ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}{priv ? "Private" : "Public"}</span>
                <span className={cn("mt-0.5 block text-xs", f.isPrivate === priv ? "opacity-80" : "text-muted-foreground")}>{priv ? "Visible on the map, you approve each request." : "Anyone in the age range can join."}</span>
              </button>
            ))}
          </div>
          {f.isPrivate && (
            <div className="space-y-2 rounded-2xl border border-purple-300 bg-purple-50 p-3" data-testid="section-questions">
              <p className="text-[13px] font-bold text-purple-900">Screening questions <span className="font-normal text-purple-800/80">— applicants must answer all of them</span></p>
              {questions.map((qq, i) => (
                <div key={i} className="flex gap-2">
                  <input data-testid={`input-question-${i}`} className={input} maxLength={500} value={qq} placeholder="What position do you play?" onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" aria-label="Remove question" data-testid={`button-remove-question-${i}`} onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-background hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" data-testid="button-add-question" className="rounded-full" onClick={() => setQuestions([...questions, ""])}><Plus className="mr-1 h-4 w-4" />Add question</Button>
              {errs.questions && <span className="block text-xs font-semibold text-destructive">{errs.questions}</span>}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border border-border px-4 py-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Paid plan<span className="block text-xs font-normal text-muted-foreground">Cost is shared info only — you approve each request. No checkout.</span></span>
            <Switch data-testid="switch-paid" checked={f.isPaid} onCheckedChange={(v) => set("isPaid", v)} />
          </label>
          {f.isPaid && (
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <Field label="Price (USD)" error={errs.price}>
                <input data-testid="input-price" type="number" min={0.01} step="0.01" className={input} value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="15" />
              </Field>
              <Field label="What it covers" error={errs.costDetails}>
                <input data-testid="input-cost-details" maxLength={1000} className={input} value={f.costDetails} onChange={(e) => set("costDetails", e.target.value)} placeholder="Court rental & equipment" />
              </Field>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
