"use client";
// /<workspace>/patient: the signed-in patient's portal. Today's tokens, live (now serving, how many ahead, the expected
// time), an alert when they're next and when they're called (banner, vibration, a chime and a browser notification once
// alerts are on), today's and upcoming bookings, and their past visits and prescriptions (printable).
import { useEffect, useRef, useState } from "react";
import { BellOff, BellRing, CalendarClock, LogOut, Phone, Stethoscope } from "lucide-react";
import { Redirect } from "@/app-shell/guards";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useRouter } from "@/lib/navigation";
import { formatClock, formatDay, formatTime } from "@/lib/format";
import { PortalTokenCard } from "../components/portal/PortalTokenCard";
import { PortalVisits } from "../components/portal/PortalVisits";
import { usePortalLogout, usePortalSession, usePortalTokens } from "../hooks/usePatientPortal";
import type { PortalProfile, PortalToken } from "../services/patientPortalService";
import { chime, createAudio } from "../utils/chime";
import { formatPatientNumber, typeLabel } from "../utils/clinicMeta";

/** The fallback poll; live updates come through each token's public channel. */
const POLL_MS = 30_000;

export function PatientPortalPage() {
  const session = usePortalSession();
  if (session.isPending) return <LoadingState className="min-h-screen" label="Opening your portal…" />;
  if (session.error) return <ErrorState message="We couldn't open the patient portal right now. Please try again." onRetry={() => void session.refetch()} />;
  if (!session.data) return <Redirect to="/patient/login" />;
  return <Portal profile={session.data} />;
}

type AlertState = "off" | "on" | "blocked";

/** Shows a system notification when allowed (some mobile browsers only allow it from a service worker: then skip). */
function notify(title: string, body: string, tag: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, tag });
  } catch {
    // the in-page banner, sound and vibration still alert the patient
  }
}

function Portal({ profile }: { profile: PortalProfile }) {
  const router = useRouter();
  const tokens = usePortalTokens(POLL_MS);
  const logout = usePortalLogout();
  const [alerts, setAlerts] = useState<AlertState>("off");
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef(new Map<number, { status: string; nextInLine: boolean }>());

  // Alerts are side effects of a token changing (called, next in line): sound, vibration, notification.
  useEffect(() => {
    for (const token of tokens.data?.tokens ?? []) {
      const before = seen.current.get(token.appointmentId);
      seen.current.set(token.appointmentId, { status: token.status, nextInLine: token.nextInLine });
      if (!before) continue;
      const where = token.provider.room ?? token.provider.name;
      if (token.status === "called" && before.status !== "called") {
        navigator.vibrate?.([400, 150, 400, 150, 400]);
        if (audio.current) chime(audio.current);
        notify(`Token ${token.token}: it's your turn`, `Please go to ${where} now.`, `token-${token.appointmentId}`);
      } else if (token.status === "waiting" && token.nextInLine && !before.nextInLine) {
        navigator.vibrate?.(250);
        if (audio.current) chime(audio.current);
        notify(`Token ${token.token}: you're next`, `Please stay close to ${where}.`, `token-${token.appointmentId}`);
      }
    }
  }, [tokens.data]);

  async function enableAlerts() {
    // Created on a click, so the browser lets it play later.
    audio.current ??= createAudio();
    if (audio.current) chime(audio.current);
    if (typeof Notification === "undefined") return setAlerts("on");
    const permission = Notification.permission === "default" ? await Notification.requestPermission().catch(() => "denied" as NotificationPermission) : Notification.permission;
    setAlerts(permission === "denied" ? "blocked" : "on");
  }

  function signOut() {
    logout.mutate(undefined, { onSettled: () => router.replace("/patient/login") });
  }

  const { patient, clinic } = profile;
  const list = tokens.data?.tokens ?? [];
  const called = list.find(token => token.status === "called");
  const next = list.find(token => token.status === "waiting" && token.nextInLine);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <Stethoscope className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {clinic.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">Patient portal</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} loading={logout.isPending}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <div className="no-print flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">Hello, {patient.firstName}</h1>
            <p className="text-sm text-muted-foreground">
              Patient no. <span className="font-mono">{formatPatientNumber(patient.patientNumber)}</span>
              {patient.allergies ? ` · Allergies: ${patient.allergies}` : ""}
            </p>
          </div>
          {alerts === "on" ? (
            <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              Alerts on
            </p>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void enableAlerts()} title="Sound, vibration and a notification when you're next and when you're called">
              {alerts === "blocked" ? <BellOff className="h-4 w-4" aria-hidden="true" /> : <BellRing className="h-4 w-4" aria-hidden="true" />}
              {alerts === "blocked" ? "Notifications blocked: sound only" : "Turn on alerts"}
            </Button>
          )}
        </div>

        <div aria-live="assertive" className="no-print">
          {called ? (
            <Banner tone="called" token={called} />
          ) : next ? (
            <Banner tone="next" token={next} />
          ) : null}
        </div>

        <section aria-labelledby="portal-today" className="no-print flex flex-col gap-3">
          <h2 id="portal-today" className="font-semibold">
            Today{tokens.data ? `, ${formatDay(tokens.data.date)}` : ""}
          </h2>
          {tokens.isPending ? (
            <LoadingState label="Loading your tokens…" />
          ) : tokens.error ? (
            <ErrorState message="We couldn't load your tokens. Please try again." onRetry={() => void tokens.refetch()} />
          ) : (
            <>
              {list.map(token => (
                <PortalTokenCard key={token.appointmentId} token={token} onChanged={() => void tokens.refetch()} />
              ))}
              {tokens.data.today.map(booking => (
                <p key={booking.appointmentId} className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    You have a {typeLabel(booking.type).toLowerCase()} with {booking.provider.name} at <strong>{formatClock(booking.time)}</strong>
                    {booking.provider.room ? ` (${booking.provider.room})` : ""}. Please check in at reception to get your token.
                  </span>
                </p>
              ))}
              {list.length === 0 && tokens.data.today.length === 0 && (
                <p className="rounded-2xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                  You don&apos;t have a token today. Once reception gives you one, it appears here and updates live.
                </p>
              )}
              {tokens.dataUpdatedAt > 0 && <p className="text-xs text-muted-foreground">Updated {formatTime(new Date(tokens.dataUpdatedAt).toISOString())}</p>}
            </>
          )}
        </section>

        {tokens.data && tokens.data.upcoming.length > 0 && (
          <section aria-labelledby="portal-upcoming" className="no-print flex flex-col gap-2">
            <h2 id="portal-upcoming" className="font-semibold">
              Upcoming appointments
            </h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {tokens.data.upcoming.map(booking => (
                <li key={booking.appointmentId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">
                    {formatDay(booking.date)}, {formatClock(booking.time)}
                  </span>
                  <span className="text-muted-foreground">
                    {booking.provider.name}
                    {booking.provider.room ? ` · ${booking.provider.room}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="portal-visits" className="flex flex-col gap-3">
          <h2 id="portal-visits" className="no-print font-semibold">
            Visits and prescriptions
          </h2>
          <PortalVisits />
        </section>

        {clinic.phone && (
          <p className="no-print flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Questions? Call the clinic:{" "}
            <a href={`tel:${clinic.phone}`} className="font-medium text-foreground hover:underline">
              {clinic.phone}
            </a>
          </p>
        )}
      </main>
    </div>
  );
}

function Banner({ tone, token }: { tone: "called" | "next"; token: PortalToken }) {
  const where = token.provider.room ?? token.provider.name;
  if (tone === "called") {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground motion-safe:animate-pulse">
        <BellRing className="h-6 w-6 shrink-0" aria-hidden="true" />
        <p>
          <strong className="block text-lg">Token {token.token}: it&apos;s your turn</strong>
          Please go to {where} now.
        </p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        <strong>Token {token.token}: you&apos;re next.</strong> Please stay close to {where}.
      </p>
    </div>
  );
}
