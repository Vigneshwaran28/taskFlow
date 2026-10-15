"use client";
// Token status (everyone with clinic access): per doctor, the token being served now and the next few, live. Token
// numbers only, like the waiting-room board. A called token is highlighted for a few seconds.
import Link from "@/components/navigation/Link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, MonitorPlay, Ticket } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/cn";
import { formatDay, formatTime } from "@/lib/format";
import { LiveIndicator, useRealtimeEvent } from "@/realtime";
import { useQueueStatus } from "../hooks/useClinic";
import type { TokenCalledEvent } from "../services/clinicService";
import { accentClasses } from "../utils/clinicMeta";

const HIGHLIGHT_MS = 8_000;

export function TokenStatusPanel() {
  const { data, isPending, error, refetch } = useQueueStatus();
  const [called, setCalled] = useState<TokenCalledEvent | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useRealtimeEvent<TokenCalledEvent>("clinic.token.called", event => {
    setCalled(event.data);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCalled(null), HIGHLIGHT_MS);
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (isPending) return <LoadingState label="Loading token status…" />;
  if (error) return <ErrorState message="Unable to load the token status." onRetry={() => void refetch()} />;

  return (
    <section aria-labelledby="token-status-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="token-status-heading" className="font-semibold">
            Token status
          </h2>
          <p className="text-sm text-muted-foreground">{formatDay(data.date)} · updates as soon as a doctor calls the next token</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveIndicator />
          <Link href="/clinic-display" target="_blank" rel="noopener" className={buttonClass("secondary")}>
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            Display board
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {called ? `Token ${called.token} called to ${called.room ?? called.providerName}` : ""}
      </div>
      {data.providers.length === 0 ? (
        <EmptyState title="No doctors set up" message="Doctors appear here once they're set up in the Practitioners tab." icon={Ticket} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.providers.map(item => {
            const highlighted = called?.providerId === item.provider.userId;
            return (
              <li key={item.provider.userId} className={cn("flex flex-col overflow-hidden rounded-xl border-2 bg-card shadow-sm transition-colors", highlighted ? "border-primary" : "border-border")}>
                <div className={cn("flex items-center justify-between gap-3 border-b-4 px-4 py-2.5", accentClasses(item.provider.color).block)}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.provider.name}</p>
                    {item.provider.specialty && <p className="truncate text-xs opacity-80">{item.provider.specialty}</p>}
                  </div>
                  {item.provider.room && <p className="shrink-0 text-lg font-bold">{item.provider.room}</p>}
                </div>
                <div className="flex flex-1 items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Now serving</p>
                    <p className={cn("text-6xl font-black leading-none tabular-nums", highlighted && "text-primary motion-safe:animate-pulse")} aria-label={item.nowServing ? `Now serving token ${item.nowServing.token}` : "Nobody being served"}>
                      {item.nowServing?.token ?? "—"}
                    </p>
                    {item.nowServing && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.nowServing.status === "in_progress" ? "With the doctor" : "Called"}
                        {item.nowServing.calledAt ? ` · ${formatTime(item.nowServing.calledAt)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Next</p>
                    {item.next.length ? (
                      <ol className="mt-1 flex flex-wrap justify-end gap-1.5" aria-label="Next tokens">
                        {item.next.map(token => (
                          <li key={token} className="min-w-9 rounded-md bg-muted px-2 py-0.5 text-center text-lg font-semibold tabular-nums">
                            {token}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {item.waiting} waiting · {item.done} done
                  {item.averageConsultMinutes != null ? ` · ~${Math.round(item.averageConsultMinutes)} min each` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
