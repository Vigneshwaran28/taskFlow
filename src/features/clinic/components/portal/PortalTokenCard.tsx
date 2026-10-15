"use client";
// One of the patient's tokens today in the portal: the token, their doctor and room, the token being served, how many
// are ahead, and the expected time to be called (a clock time and minutes). Live through the token's public channel
// (queue:<code>); the page also polls as a fallback.
import { BellRing, CheckCircle2, DoorOpen, Hourglass, Stethoscope, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock, formatTime } from "@/lib/format";
import { usePublicChannel, type RealtimeStatus } from "@/realtime";
import type { PortalToken } from "../../services/patientPortalService";

const ACTIVE = new Set(["waiting", "called", "in_progress"]);

const LIVE_LABELS: Record<RealtimeStatus, string> = {
  live: "Live",
  connecting: "Connecting…",
  offline: "Refreshing every 30 seconds",
};

export function PortalTokenCard({ token, onChanged }: { token: PortalToken; onChanged: () => void }) {
  const live = usePublicChannel(token.publicCode && ACTIVE.has(token.status) ? `queue:${token.publicCode}` : null, event => {
    if (event.type === "queue.updated") onChanged();
  });
  const where = token.provider.room ?? token.provider.name;
  const waiting = token.status === "waiting";

  return (
    <article aria-label={`Token ${token.token}`} className={cn("flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm", token.status === "called" && "border-primary ring-2 ring-primary")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Your token</p>
          <p className="text-7xl font-black leading-none tabular-nums">{token.token}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate font-semibold">{token.provider.name}</p>
          {token.provider.specialty && <p className="truncate text-sm text-muted-foreground">{token.provider.specialty}</p>}
          {token.provider.room && <p className="text-lg font-bold">{token.provider.room}</p>}
        </div>
      </div>

      <div aria-live="polite">
        <TokenState token={token} where={where} />
      </div>

      {(waiting || token.status === "called") && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border p-2.5">
            <dt className="text-xs text-muted-foreground">Now serving</dt>
            <dd className="text-2xl font-bold tabular-nums">{token.nowServing ?? "—"}</dd>
          </div>
          <div className="rounded-2xl border p-2.5">
            <dt className="text-xs text-muted-foreground">Ahead of you</dt>
            <dd className="text-2xl font-bold tabular-nums">{waiting ? token.aheadOfYou : 0}</dd>
          </div>
          <div className="rounded-2xl border p-2.5">
            <dt className="text-xs text-muted-foreground">Expected at</dt>
            <dd className="text-2xl font-bold tabular-nums">{waiting && token.expectedAt ? formatClock(token.expectedAt) : "—"}</dd>
            {waiting && token.estimatedWaitMinutes != null && <dd className="text-xs text-muted-foreground">{token.estimatedWaitMinutes < 1 ? "any moment" : `in about ${token.estimatedWaitMinutes} min`}</dd>}
          </div>
        </dl>
      )}

      {ACTIVE.has(token.status) && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", live === "live" ? "bg-emerald-500" : live === "connecting" ? "animate-pulse bg-amber-500 motion-reduce:animate-none" : "bg-slate-400")} />
          {LIVE_LABELS[live]}
        </p>
      )}
    </article>
  );
}

function TokenState({ token, where }: { token: PortalToken; where: string }) {
  const base = "flex items-start gap-3 rounded-2xl border p-4";
  switch (token.status) {
    case "called":
      return (
        <div className={cn(base, "border-primary bg-primary text-primary-foreground motion-safe:animate-pulse")}>
          <DoorOpen className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <p>
            <strong className="block text-xl">It&apos;s your turn</strong>
            Please go to {where} now.
            {token.calledAt && <span className="block text-sm opacity-90">Called at {formatTime(token.calledAt)}</span>}
          </p>
        </div>
      );
    case "in_progress":
      return (
        <div className={base}>
          <Stethoscope className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p>You&apos;re with the doctor now.</p>
        </div>
      );
    case "completed":
      return (
        <div className={cn(base, "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100")}>
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <p>Your visit is complete. Your prescription is below once the doctor has written it.</p>
        </div>
      );
    case "cancelled":
    case "no_show":
      return (
        <div className={base}>
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
          <p>This token is no longer active. Please ask at the reception desk.</p>
        </div>
      );
    default:
      return token.nextInLine ? (
        <div className={cn(base, "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100")}>
          <BellRing className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <p>
            <strong className="block">You&apos;re next</strong>
            Please stay close to {where}.
          </p>
        </div>
      ) : (
        <div className={base}>
          <Hourglass className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Please wait. {token.aheadOfYou} {token.aheadOfYou === 1 ? "patient is" : "patients are"} ahead of you for {where}.
          </p>
        </div>
      );
  }
}
