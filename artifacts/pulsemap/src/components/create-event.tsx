import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, setHours, setMinutes } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { Loader2, Plus } from "lucide-react";
import { getGetEventsQueryKey, useCreateEvent, type EventInputCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/app-context";
import { apiError, CATEGORIES, QUICK_EMOJIS } from "@/lib/pulse";
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
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { me, openAuth } = useApp();
  const [f, setF] = useState({
    title: "",
    description: "",
    category: "coffee" as EventInputCategory,
    locationName: "",
    startsAt: format(setMinutes(setHours(addDays(new Date(), 1), 18), 30), "yyyy-MM-dd'T'HH:mm"),
    maxPeople: "6",
    minAge: "18",
    maxAge: "35",
    emoji: "☕",
    allowMessages: true,
  });
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const create = useCreateEvent({
    mutation: {
      onSuccess: (ev) => {
        qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
        toast({ title: `${ev.emoji} It's on the map`, description: "You're counted as the first attendee." });
        nav(`/events/${ev.id}`);
      },
      onError: (e) => setServerErr(apiError(e)),
    },
  });

  const close = () => nav("/");

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
    if (!f.emoji) e.emoji = "Pick an emoji.";
    setErrs(e);
    setServerErr(null);
    if (Object.keys(e).length) return;
    create.mutate({
      data: {
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
      },
    });
  };

  return (
    <Panel
      title="Host a small plan"
      onClose={close}
      testId="panel-create"
      footer={
        <div className="space-y-2">
          {serverErr && <p role="alert" data-testid="text-create-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{serverErr}</p>}
          <Button data-testid="button-submit-event" className="h-12 w-full rounded-2xl text-base" disabled={create.isPending} onClick={submit}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Put it on the map
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
      </div>
    </Panel>
  );
}
