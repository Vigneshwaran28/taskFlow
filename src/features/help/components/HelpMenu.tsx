"use client";
// The "?" in the top bar: a tour of the page you're on, the welcome tour, the help centre, and whether tours start by
// themselves. Hidden when the workspace switched help off.
import { useEffect, useRef, useState } from "react";
import { BookOpen, CircleHelp, Compass, PlayCircle } from "lucide-react";
import { useCurrentUser } from "@/features/auth";
import { cn } from "@/lib/cn";
import { HelpCenterDialog } from "./HelpCenterDialog";
import { useTours } from "./TourProvider";

export function HelpMenu() {
  const { data: user } = useCurrentUser();
  const { start, current, available, autoStart, setAutoStart } = useTours();
  const [open, setOpen] = useState(false);
  const [center, setCenter] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const help = user?.tenant.settings.help;

  // Closes on a click outside or Esc (a document listener is an external system: an effect is right).
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user || help?.enabled === false || !available.length) return null;
  const pageTour = current && current.key !== "welcome" && available.includes(current) ? current : null;
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

  return (
    <div ref={ref} className="relative" data-tour="help">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Help"
        title="Help"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-xl border bg-card p-1 shadow-xl">
          {pageTour && (
            <button type="button" role="menuitem" className={item} onClick={run(() => start(pageTour.key))}>
              <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
              Tour of {pageTour.title}
            </button>
          )}
          {available.some(tour => tour.key === "welcome") && (
            <button type="button" role="menuitem" className={item} onClick={run(() => start("welcome"))}>
              <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
              Welcome tour
            </button>
          )}
          {help?.helpCenter !== false && (
            <button type="button" role="menuitem" className={item} onClick={run(() => setCenter(true))}>
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              Help centre
            </button>
          )}
          <div className="my-1 border-t" />
          <label className={cn(item, "cursor-pointer justify-between")}>
            <span>Start tours automatically</span>
            <input type="checkbox" checked={autoStart} disabled={help?.autoStart === false} onChange={event => setAutoStart(event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
          </label>
        </div>
      )}
      {center && <HelpCenterDialog onClose={() => setCenter(false)} />}
    </div>
  );
}
