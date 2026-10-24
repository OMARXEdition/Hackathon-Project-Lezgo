import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Event, User } from "@workspace/api-client-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { avatarUrl, catOf, spotsLeft } from "@/lib/pulse";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export function Face({ user, size = 36, ring = true, className }: { user: Pick<User, "avatarSeed" | "username">; size?: number; ring?: boolean; className?: string }) {
  return (
    <img
      src={avatarUrl(user.avatarSeed)}
      alt={user.username}
      width={size}
      height={size}
      className={cn("rounded-full bg-[hsl(38_70%_88%)] object-cover", ring && "ring-2 ring-card", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function FaceStack({ users, max = 5, size = 30, hostId }: { users: User[]; max?: number; size?: number; hostId?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <Tooltip key={u.id}>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              data-testid={`avatar-attendee-${u.id}`}
              className="relative rounded-full outline-none transition-transform hover:-translate-y-1 hover:z-10 focus-visible:ring-2 focus-visible:ring-ring"
              style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: max - i }}
              onClick={(e) => e.stopPropagation()}
            >
              <Face user={u} size={size} />
            </span>
          </TooltipTrigger>
          <TooltipContent className="z-[3000]">
            <span className="font-semibold">@{u.username}</span> · {u.age}
            {hostId === u.id && " · host"}
          </TooltipContent>
        </Tooltip>
      ))}
      {users.length > max && (
        <span className="-ml-2 grid place-items-center rounded-full bg-secondary text-[11px] font-bold ring-2 ring-card" style={{ width: size, height: size }}>
          +{users.length - max}
        </span>
      )}
    </div>
  );
}

export function EmojiTile({ event, size = 52 }: { event: Pick<Event, "emoji" | "category">; size?: number }) {
  const c = catOf(event.category);
  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl"
      style={{ width: size, height: size, fontSize: size * 0.52, background: `hsl(${c.hue} / .14)`, boxShadow: `inset 0 0 0 1.5px hsl(${c.hue} / .25)` }}
    >
      {event.emoji}
    </div>
  );
}

export function CapacityBar({ event }: { event: Event }) {
  const left = spotsLeft(event);
  const pct = Math.min(100, (event.joinedCount / Math.max(1, event.maxPeople)) * 100);
  return (
    <div className="flex items-center gap-2" data-testid={`capacity-${event.id}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          style={{ background: left === 0 ? "hsl(222 10% 60%)" : "hsl(150 62% 38%)" }}
        />
      </div>
      <span className={cn("whitespace-nowrap text-xs font-bold", left === 0 ? "text-muted-foreground" : "text-[hsl(150_62%_30%)]")}>
        {left === 0 ? "Full" : `${event.joinedCount}/${event.maxPeople} · ${left} left`}
      </span>
    </div>
  );
}

export function AgeBadge({ event, fits }: { event: Event; fits?: boolean | null }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        fits === false ? "bg-destructive/10 text-destructive" : fits ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
      )}
    >
      {event.minAge}–{event.maxAge} yrs
    </span>
  );
}

export function Panel({ title, onClose, children, footer, testId }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; testId: string }) {
  const { mobile } = useApp();
  return (
    <motion.aside
      data-testid={testId}
      initial={mobile ? { y: "100%" } : { x: 30, opacity: 0 }}
      animate={mobile ? { y: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 32, stiffness: 340 }}
      className={cn(
        "absolute z-[1200] flex flex-col overflow-hidden border border-card-border bg-card shadow-[0_30px_60px_-20px_hsl(222_45%_16%/.45)]",
        mobile ? "inset-x-0 bottom-0 max-h-[90%] rounded-t-[28px]" : "bottom-4 right-4 top-4 w-[440px] rounded-[28px]",
      )}
    >
      {mobile && <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-border" />}
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
        <div className="min-w-0 font-display text-lg font-bold">{title}</div>
        <button
          onClick={onClose}
          data-testid="button-close-panel"
          aria-label="Close"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary transition hover:rotate-90 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      {footer && <div className="border-t border-border bg-card/95 px-5 py-3">{footer}</div>}
    </motion.aside>
  );
}

export function Blank({ emoji, title, body, action }: { emoji?: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="tile-bg flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-10 text-center">
      {emoji && <div className="mb-3 text-4xl">{emoji}</div>}
      <div className="font-display text-lg font-bold">{title}</div>
      <p className="mt-1 max-w-[30ch] text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
