import { addDays, isSameDay, startOfDay } from "@/lib/dates";

const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** Completed tasks per local day for the last 7 days. */
export function WeeklyChart({ completedAt }: { completedAt: string[] }) {
  const today = startOfDay();
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    const count = completedAt.filter(iso => isSameDay(new Date(iso), day)).length;
    return { day, count };
  });
  const max = Math.max(1, ...days.map(item => item.count));

  return (
    <figure>
      <div className="flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label={`Completed tasks per day: ${days.map(d => `${dayLabel.format(d.day)} ${d.count}`).join(", ")}`}>
        {days.map(({ day, count }) => (
          <div key={day.getTime()} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
            <div className="flex h-28 w-full items-end">
              <div
                className="w-full rounded-t-md bg-primary/80 transition-[height] duration-500 motion-reduce:transition-none"
                style={{ height: `${Math.max((count / max) * 100, count ? 8 : 2)}%` }}
              />
            </div>
            <span className={isSameDay(day, today) ? "text-xs font-semibold" : "text-xs text-muted-foreground"}>{dayLabel.format(day)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
