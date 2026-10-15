"use client";
// Runs guided tours (tours.ts): the welcome tour at a person's first sign-in and a module's tour at their first visit to
// it (when the workspace has help on and the person hasn't switched tours off), or any tour on request (help menu).
// Finished and skipped tours are saved to the account (preferences.tours.seen), so they don't come back on any device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCurrentUser, useUpdatePreferences } from "@/features/auth";
import { usePathname, useRouter } from "@/lib/navigation";
import type { TourKey } from "@/types/session";
import { availableTours, TOUR_BY_KEY, tourForPath, type TourMeta } from "../tours";
import { TourOverlay } from "./TourOverlay";

interface TourContextValue {
  /** Starts a tour now, going to its page first when needed */
  start: (key: TourKey) => void;
  /** Tours this person can take */
  available: TourMeta[];
  /** The tour that belongs to the current page, if any */
  current: TourMeta | null;
  /** Tours start by themselves (workspace on, person hasn't switched them off) */
  autoStart: boolean;
  setAutoStart: (on: boolean) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTours() {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTours must be used inside <TourProvider>.");
  return value;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const save = useUpdatePreferences();
  const [active, setActive] = useState<{ tour: TourMeta; index: number } | null>(null);
  const [pending, setPending] = useState<TourKey | null>(null);
  // Tours already shown in this tab: the saved list catches up a moment later.
  const shown = useRef(new Set<TourKey>());

  const available = useMemo(() => availableTours(user), [user]);
  const current = tourForPath(pathname);
  const help = user?.tenant.settings.help;
  const prefs = user?.preferences?.tours;
  const autoStart = Boolean(help?.enabled !== false && help?.autoStart !== false && !prefs?.off);

  const markSeen = useCallback(
    (key: TourKey) => {
      shown.current.add(key);
      const seen = new Set(prefs?.seen ?? []);
      if (seen.has(key)) return;
      seen.add(key);
      save.mutate({ tours: { ...prefs, seen: [...seen] } });
    },
    [prefs, save]
  );

  const setAutoStart = useCallback((on: boolean) => save.mutate({ tours: { ...prefs, off: !on } }), [prefs, save]);

  const start = useCallback(
    (key: TourKey) => {
      const tour = TOUR_BY_KEY.get(key);
      if (!tour) return;
      if (key === "welcome" || tour.paths.includes(pathname.split("/").filter(Boolean)[0] ?? "")) {
        setActive({ tour, index: 0 });
        return;
      }
      setPending(key);
      router.push(`/${tour.paths[0]}`);
    },
    [pathname, router]
  );

  // A tour asked for on another page starts once that page is open.
  useEffect(() => {
    if (!pending) return;
    const tour = TOUR_BY_KEY.get(pending);
    if (!tour || !tour.paths.includes(pathname.split("/").filter(Boolean)[0] ?? "")) return;
    const timer = window.setTimeout(() => {
      setPending(null);
      setActive({ tour, index: 0 });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pending, pathname]);

  // First sign-in: the welcome tour. First visit to a module: its tour (after the welcome tour, never both at once).
  useEffect(() => {
    if (!user || active || pending || !autoStart || user.mustChangePassword) return;
    const seen = new Set([...(prefs?.seen ?? []), ...shown.current]);
    const welcome = available.find(tour => tour.key === "welcome");
    let next: TourMeta | null = null;
    if (welcome && !seen.has("welcome")) next = welcome;
    else if (current && current.key !== "welcome" && available.includes(current) && !seen.has(current.key)) next = current;
    if (!next) return;
    const tour = next;
    // Let the page render first, so the tour can point at its controls.
    const timer = window.setTimeout(() => setActive({ tour, index: 0 }), 900);
    return () => window.clearTimeout(timer);
  }, [user, active, pending, autoStart, prefs, available, current]);

  const close = useCallback(
    (options: { stopAll?: boolean } = {}) => {
      if (!active) return;
      markSeen(active.tour.key);
      if (options.stopAll) save.mutate({ tours: { ...prefs, seen: [...new Set([...(prefs?.seen ?? []), active.tour.key])], off: true } });
      setActive(null);
    },
    [active, markSeen, prefs, save]
  );

  const value = useMemo(() => ({ start, available, current, autoStart, setAutoStart }), [start, available, current, autoStart, setAutoStart]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          key={`${active.tour.key}-${active.index}`}
          tour={active.tour}
          index={active.index}
          welcomeMessage={active.tour.key === "welcome" ? help?.welcomeMessage : undefined}
          workspaceName={user?.tenant.settings.branding.siteTitle || user?.tenant.name}
          onBack={() => setActive(state => (state && state.index > 0 ? { ...state, index: state.index - 1 } : state))}
          onNext={() => (active.index + 1 >= active.tour.steps.length ? close() : setActive({ ...active, index: active.index + 1 }))}
          onClose={close}
        />
      )}
    </TourContext.Provider>
  );
}
