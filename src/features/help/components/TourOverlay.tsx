"use client";
// One step of a tour: a spotlight on the element it explains (or none, for a centred card) and a card with the words,
// progress, and Back / Next / Skip. On phones the card sits at the bottom of the screen. Esc skips; arrow keys move.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { TourMeta } from "../tours";

const PAD = 6;
const CARD_WIDTH = 352;

/** The first match that is on screen (the desktop and mobile sidebars both exist; only one shows). */
function findTarget(selector: string | undefined) {
  if (!selector) return null;
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none") return element;
  }
  return null;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourOverlayProps {
  tour: TourMeta;
  index: number;
  welcomeMessage?: string;
  workspaceName?: string;
  onBack: () => void;
  onNext: () => void;
  onClose: (options?: { stopAll?: boolean }) => void;
}

export function TourOverlay({ tour, index, welcomeMessage, workspaceName, onBack, onNext, onClose }: TourOverlayProps) {
  const step = tour.steps[index];
  const cardRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  // Phones: a sheet pinned to the bottom (or top) edge, so its height never pushes the buttons off screen.
  const [card, setCard] = useState<{ top?: number; bottom?: number; left: number; width: number; sheet: boolean } | null>(null);
  const last = index === tour.steps.length - 1;

  const measure = useCallback(() => {
    const element = findTarget(step.target);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const sheet = viewport.width < 640;
    const width = Math.min(CARD_WIDTH, viewport.width - 24);
    const cardHeight = cardRef.current?.offsetHeight ?? 220;
    if (!element) {
      setBox(null);
      setCard(sheet ? { sheet, width, bottom: 12, left: 12 } : { sheet, width, top: Math.max(12, (viewport.height - cardHeight) / 2), left: (viewport.width - width) / 2 });
      return;
    }
    const rect = element.getBoundingClientRect();
    const target = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
    setBox(target);
    if (sheet) {
      // Bottom sheet, or the top of the screen when the element itself is low down.
      const low = rect.top > viewport.height / 2;
      setCard(low ? { sheet, width, top: 12, left: 12 } : { sheet, width, bottom: 12, left: 12 });
      return;
    }
    const below = target.top + target.height + 12;
    const above = target.top - cardHeight - 12;
    const top = below + cardHeight < viewport.height - 12 ? below : above > 12 ? above : Math.max(12, viewport.height - cardHeight - 12);
    // Beside a tall element (the sidebar): to its right.
    const tall = target.height > viewport.height * 0.6;
    const left = tall ? Math.min(target.left + target.width + 12, viewport.width - width - 12) : Math.min(Math.max(12, target.left + target.width / 2 - width / 2), viewport.width - width - 12);
    setCard({ sheet, width, top: tall ? Math.max(12, Math.min(viewport.height - cardHeight - 12, rect.top + 40)) : top, left });
  }, [step.target]);

  // Bring the element into view, then measure on the next frames (the second once the card has its real height).
  useLayoutEffect(() => {
    const element = findTarget(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.top < 64 || rect.bottom > window.innerHeight) element.scrollIntoView({ block: "center" });
    }
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      measure();
      second = window.requestAnimationFrame(measure);
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [measure, step.target]);

  // The card's height decides where it fits (above or below the element): measure again when it changes.
  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  // Focus the card (screen readers announce the step); keyboard: Esc, arrows.
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") onNext();
      else if (event.key === "ArrowLeft" && index > 0) onBack();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onBack, onClose, onNext]);

  const greeting = index === 0 && tour.key === "welcome";
  const body = greeting && welcomeMessage ? welcomeMessage : step.body;
  const title = greeting && workspaceName ? `Welcome to ${workspaceName}!` : step.title;

  return (
    <div className="no-print fixed inset-0 z-[60]" data-tf="tour">
      {/* Blocks the page while the tour runs; the spotlight's shadow darkens everything but the element. */}
      <div className={cn("absolute inset-0", !box && "bg-slate-950/55")} />
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300 ease-out"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgb(2 6 23 / 0.55)" }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-body"
        tabIndex={-1}
        className={cn("absolute flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl outline-none transition-[top,left] duration-300 ease-out", !card && "invisible")}
        style={card ? { top: card.top, bottom: card.bottom, left: card.left, width: card.sheet ? "calc(100vw - 24px)" : card.width, maxHeight: "calc(100dvh - 24px)", overflowY: "auto" } : undefined}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tour.title} · {index + 1} of {tour.steps.length}
            </p>
            <h2 id="tour-step-title" className="text-base font-semibold">
              {title}
            </h2>
          </div>
          <button type="button" onClick={() => onClose()} aria-label="Close the tour" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p id="tour-step-body" className="text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {tour.steps.map((_, at) => (
            <span key={at} className={cn("h-1.5 rounded-full transition-all", at === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {index === 0 ? (
            <button type="button" onClick={() => onClose({ stopAll: true })} className="mr-auto text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
              Don&apos;t show tours
            </button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-auto">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          )}
          {!last && (
            <Button variant="ghost" size="sm" onClick={() => onClose()}>
              Skip
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {last ? "Done" : "Next"}
            {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
