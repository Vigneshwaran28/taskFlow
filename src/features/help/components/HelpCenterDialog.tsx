"use client";
// The help centre: a guide per module this person can use (what it's for, tips) with a button to take its tour.
import { useState } from "react";
import { CheckCircle2, Lightbulb, PlayCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { MODULES } from "@/app-shell/modules";
import { useCurrentUser } from "@/features/auth";
import { useTours } from "./TourProvider";

export function HelpCenterDialog({ onClose }: { onClose: () => void }) {
  const { data: user } = useCurrentUser();
  const { available, start } = useTours();
  const [term, setTerm] = useState("");
  const seen = new Set(user?.preferences?.tours?.seen ?? []);
  const query = term.trim().toLowerCase();
  const guides = available.filter(tour => !query || [tour.title, tour.summary, ...tour.tips, ...tour.steps.map(step => `${step.title} ${step.body}`)].join(" ").toLowerCase().includes(query));

  return (
    <Dialog open onClose={onClose} size="lg" title="Help centre" description="Guides for the parts of the workspace you can use. Take a tour to see each one in place.">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            autoFocus
            aria-label="Search help"
            placeholder="Search help, e.g. leave, invoice, reminder"
            value={term}
            onChange={event => setTerm(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {!guides.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches &ldquo;{term}&rdquo;. Try another word.</p>}
        <ul className="flex flex-col gap-3">
          {guides.map(tour => {
            const Icon = tour.feature ? MODULES[tour.feature].icon : Lightbulb;
            return (
              <li key={tour.key} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                      {tour.title}
                      {seen.has(tour.key) && (
                        <Badge tone="success">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Taken
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{tour.summary}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => {
                      onClose();
                      start(tour.key);
                    }}
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="max-sm:sr-only">Take the tour</span>
                  </Button>
                </div>
                {tour.tips.length > 0 && (
                  <ul className="ml-1 flex flex-col gap-1 border-l-2 border-primary/20 pl-3 text-sm">
                    {tour.tips.map(tip => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
