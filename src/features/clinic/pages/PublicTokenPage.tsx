"use client";
// /q/[code]: a patient follows their clinic token on their phone. No sign-in, and no personal data (the API
// returns none). Live through the token's public channel, with a 30-second poll as the fallback.
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { CheckCircle2, DoorOpen, Hourglass, SearchX, Stethoscope, XCircle } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { usePublicChannel, type RealtimeStatus } from "@/realtime";
import { usePublicToken } from "../hooks/useClinic";
import type { PublicToken } from "../services/clinicService";

/** Token codes: 10 letters and digits without 0/O/1/I/L. */
const CODE = /^[2-9A-HJKMNP-Z]{10}$/;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function PublicTokenPage() {
  const params = useParams<{ code: string }>();
  const code = safeDecode(params.code ?? "").trim().toUpperCase();
  const valid = CODE.test(code);
  const { data, isPending, error, refetch, dataUpdatedAt } = usePublicToken(valid ? code : "");
  const live = usePublicChannel(valid && data ? `queue:${code}` : null, event => {
    if (event.type === "queue.updated") void refetch();
  });

  // A gentle buzz when the token is called (phones that support it).
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (data?.status === "called" && lastStatus.current && lastStatus.current !== "called") navigator.vibrate?.([300, 150, 300]);
    lastStatus.current = data?.status ?? null;
  }, [data?.status]);

  let content;
  if (!valid || (error instanceof ApiError && error.status === 404)) content = <NotFound />;
  else if (isPending) content = <LoadingState label="Finding your token…" />;
  else if (error) content = <ErrorState message="We couldn't load your token right now. Please try again." onRetry={() => void refetch()} />;
  else content = <TokenStatus token={data} live={live} updatedAt={dataUpdatedAt} />;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-md flex-col gap-5">{content}</main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="rounded-full bg-accent p-3">
        <SearchX className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">We couldn&apos;t find that token</h1>
      <p className="text-sm text-muted-foreground">Check the link on your token slip, or ask at the reception desk. Token links work on the day of your visit.</p>
    </div>
  );
}

const LIVE_LABELS: Record<RealtimeStatus, string> = {
  live: "Live: updates as soon as the queue moves",
  connecting: "Connecting to live updates…",
  offline: "Refreshing every 30 seconds",
};

function TokenStatus({ token, live, updatedAt }: { token: PublicToken; live: RealtimeStatus; updatedAt: number }) {
  const where = token.provider.room ?? token.provider.name;
  return (
    <>
      <header className="text-center">
        <p className="text-lg font-semibold">{token.clinicName}</p>
        <p className="text-sm text-muted-foreground">{formatDate(token.date)}</p>
      </header>

      <section aria-labelledby="token-heading" className="flex flex-col items-center gap-1 rounded-3xl border bg-card px-6 py-8 text-center shadow-sm">
        <h1 id="token-heading" className="text-lg font-medium text-muted-foreground">
          Your token
        </h1>
        <p className="text-8xl font-black leading-none tabular-nums">{token.token}</p>
        <p className="mt-3 text-lg font-semibold">{token.provider.name}</p>
        <p className="text-muted-foreground">{[token.provider.specialty, token.provider.room].filter(Boolean).join(" · ")}</p>
      </section>

      <div aria-live="polite">
        <StatusCard token={token} where={where} />
      </div>

      {(token.status === "waiting" || token.status === "called") && (
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">Now serving</dt>
            <dd className="text-3xl font-bold tabular-nums">{token.nowServing ?? "—"}</dd>
          </div>
          <div className="rounded-2xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">Ahead of you</dt>
            <dd className="text-3xl font-bold tabular-nums">{token.aheadOfYou}</dd>
          </div>
          <div className="rounded-2xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">Est. wait</dt>
            <dd className="text-3xl font-bold tabular-nums">{token.estimatedWaitMinutes == null ? "—" : `${token.estimatedWaitMinutes}m`}</dd>
          </div>
        </dl>
      )}

      <p role="status" aria-label={LIVE_LABELS[live]} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", live === "live" ? "bg-emerald-500" : live === "connecting" ? "animate-pulse bg-amber-500 motion-reduce:animate-none" : "bg-slate-400")} />
        {LIVE_LABELS[live]}
        {updatedAt ? ` · updated ${formatTime(new Date(updatedAt).toISOString())}` : ""}
      </p>
    </>
  );
}

function StatusCard({ token, where }: { token: PublicToken; where: string }) {
  const base = "flex items-start gap-3 rounded-2xl border p-5 text-lg";
  switch (token.status) {
    case "called":
      return (
        <div className={cn(base, "border-primary bg-primary text-primary-foreground motion-safe:animate-pulse")}>
          <DoorOpen className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
          <p>
            <strong className="block text-2xl">It&apos;s your turn</strong>
            Please go to {where} now.
            {token.calledAt && <span className="block text-sm opacity-90">Called at {formatTime(token.calledAt)}</span>}
          </p>
        </div>
      );
    case "in_progress":
      return (
        <div className={cn(base, "bg-card")}>
          <Stethoscope className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p>You&apos;re with the doctor now.</p>
        </div>
      );
    case "completed":
      return (
        <div className={cn(base, "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100")}>
          <CheckCircle2 className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
          <p>Your visit is complete. Thank you, and get well soon.</p>
        </div>
      );
    case "cancelled":
    case "no_show":
      return (
        <div className={cn(base, "bg-card")}>
          <XCircle className="mt-1 h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
          <p>This token is no longer active. Please ask at the reception desk.</p>
        </div>
      );
    default:
      return (
        <div className={cn(base, "bg-card")}>
          <Hourglass className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p>
            {token.aheadOfYou === 0 ? "You're next. Please stay close to " : `Please wait. ${token.aheadOfYou} ${token.aheadOfYou === 1 ? "patient is" : "patients are"} ahead of you for `}
            {where}.
          </p>
        </div>
      );
  }
}
