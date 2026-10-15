"use client";
// Waiting-room TV board (/clinic-display): per doctor and room, the token being served (large) and the next
// three. A called token flashes (clinic.token.called), with an optional chime once someone turns sound on.
// Shows token numbers only, never patient names.
import Link from "@/components/navigation/Link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useModuleSettings, useSiteTitle } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { LiveIndicator, useRealtimeEvent } from "@/realtime";
import { useQueue } from "../hooks/useClinic";
import type { TokenCalledEvent } from "../services/clinicService";
import { chime } from "../utils/chime";
import { accentClasses } from "../utils/clinicMeta";

const FLASH_MS = 10_000;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function QueueDisplayPage() {
  const company = useModuleSettings("company");
  const siteTitle = useSiteTitle();
  const clinicName = company.legalName?.trim() || siteTitle;
  const { data, isPending, error, refetch } = useQueue();
  const now = useClock();
  const [flash, setFlash] = useState<TokenCalledEvent | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  useRealtimeEvent<TokenCalledEvent>("clinic.token.called", event => {
    setFlash(event.data);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
    if (sound && audio.current) chime(audio.current);
  });

  // Fullscreen is an external browser state; keep the button in sync when the user presses Esc.
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.clearTimeout(flashTimer.current);
      void audio.current?.close();
    };
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  function toggleSound() {
    if (!sound) {
      // Created on a click, so the browser lets it play.
      audio.current ??= new AudioContext();
      void audio.current.resume();
      chime(audio.current);
    }
    setSound(!sound);
  }

  const providers = data?.providers ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{clinicName}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(data?.date ?? null) || "Today"} · Please wait for your token to be called</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-4xl font-semibold tabular-nums sm:text-5xl" aria-label="Current time">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="flex items-center gap-1">
            <LiveIndicator />
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Turn chime off" : "Turn chime on"} title={sound ? "Chime on" : "Chime off"}>
              {sound ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
            </Button>
            <Button variant="secondary" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
              {fullscreen ? "Exit full screen" : "Full screen"}
            </Button>
            {!fullscreen && (
              <Link href="/clinic?tab=reception" className="rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back to the clinic" title="Back to the clinic">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <div aria-live="assertive" className="sr-only">
        {flash ? `Token ${flash.token}, please go to ${flash.room ?? flash.providerName}` : ""}
      </div>
      {flash && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 bg-primary px-6 py-5 text-primary-foreground motion-safe:animate-pulse">
          <span className="text-3xl font-semibold sm:text-4xl">Token</span>
          <span className="text-6xl font-black tabular-nums sm:text-7xl">{flash.token}</span>
          <span className="text-3xl font-semibold sm:text-4xl">→ {flash.room ?? flash.providerName}</span>
        </div>
      )}

      <main className="flex-1 p-6">
        {isPending ? (
          <LoadingState label="Loading the queues…" />
        ) : error ? (
          <ErrorState message="Unable to load the queues." onRetry={() => void refetch()} />
        ) : providers.length === 0 ? (
          <p className="py-20 text-center text-2xl text-muted-foreground">No doctors are set up yet.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {providers.map(queue => {
              const highlighted = flash?.providerId === queue.provider.userId;
              const upNext = queue.waiting.filter(item => !item.calledAt).slice(0, 3);
              return (
                <li key={queue.provider.userId} className={cn("flex flex-col overflow-hidden rounded-2xl border-2 bg-card shadow-sm transition-colors", highlighted ? "border-primary" : "border-border")}>
                  <div className={cn("flex items-center justify-between gap-3 border-b-4 px-5 py-3", accentClasses(queue.provider.color).block)}>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold">{queue.provider.name}</p>
                      {queue.provider.specialty && <p className="truncate text-sm opacity-80">{queue.provider.specialty}</p>}
                    </div>
                    {queue.provider.room && <p className="shrink-0 text-2xl font-bold">{queue.provider.room}</p>}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 px-5 py-6">
                    <div>
                      <p className="text-sm uppercase tracking-widest text-muted-foreground">Now serving</p>
                      <p className={cn("text-8xl font-black leading-none tabular-nums", highlighted && "text-primary motion-safe:animate-pulse")}>{queue.nowServing?.token ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm uppercase tracking-widest text-muted-foreground">Next</p>
                      {upNext.length ? (
                        <ol className="mt-1 flex flex-col gap-1">
                          {upNext.map(item => (
                            <li key={item.id} className="text-3xl font-semibold tabular-nums">
                              {item.token}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-xl text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                  <p className="border-t px-5 py-2 text-sm text-muted-foreground">{queue.waiting.length} waiting</p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
