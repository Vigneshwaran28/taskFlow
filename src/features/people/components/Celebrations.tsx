"use client";
import { Cake, PartyPopper } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/format";
import { useCelebrations } from "../hooks/usePeople";

const ordinal = new Intl.PluralRules(undefined, { type: "ordinal" });
const SUFFIX: Partial<Record<Intl.LDMLPluralRule, string>> = { one: "st", two: "nd", few: "rd", other: "th" };

/**
 * Feature component: birthdays and work anniversaries in the next two weeks. Renders nothing when there are none
 * (or celebrations are turned off for the workspace).
 */
export function Celebrations() {
  const { data } = useCelebrations(14);
  if (!data?.length) return null;
  return (
    <section aria-labelledby="celebrations-heading" className="rounded-xl border bg-card p-5">
      <h2 id="celebrations-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <PartyPopper className="h-4 w-4" aria-hidden="true" />
        Celebrations
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.map(item => (
          <li key={`${item.kind}-${item.user.id}`} className={cn("flex items-center gap-3 rounded-lg px-3 py-2", item.isToday ? "bg-accent/60" : "bg-muted/40")}>
            <Avatar name={item.user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.kind === "birthday" ? "Birthday" : `${item.years ?? 0}${SUFFIX[ordinal.select(item.years ?? 0)] ?? "th"} work anniversary`}
                {" · "}
                {item.isToday ? <span className="font-semibold text-primary">Today</span> : formatDay(item.date)}
              </p>
            </div>
            {item.kind === "birthday" ? (
              <Cake className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <PartyPopper className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
