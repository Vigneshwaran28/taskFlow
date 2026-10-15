const dayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const label = (day: string) => dayLabel.format(new Date(`${day}T00:00:00Z`));

export interface DailyBarChartProps {
  title: string;
  /** e.g. "created" */
  unit: string;
  /** Oldest first */
  data: { day: string; value: number }[];
}

/** Presentational: one count per UTC day as vertical bars, with a hover/focus tooltip on each bar. */
export function DailyBarChart({ title, unit, data }: DailyBarChartProps) {
  const max = Math.max(1, ...data.map(item => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const labelled = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <figure className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{total} in 14 days</span>
      </figcaption>
      <div role="img" aria-label={`${title}: ${data.map(item => `${label(item.day)} ${item.value}`).join(", ")}`} className="relative flex h-36 items-end gap-0.5 border-b border-border pl-7">
        {/* Recessive guide at the maximum value, labelled in the left gutter */}
        <div aria-hidden="true" className="absolute left-7 right-0 top-0 border-t border-dashed border-border" />
        <span aria-hidden="true" className="absolute -top-2 left-0 w-6 text-right text-[0.6875rem] tabular-nums text-muted-foreground">
          {max}
        </span>
        {data.map(item => (
          <div key={item.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-primary/85 transition-[height] duration-500 group-hover:bg-primary motion-reduce:transition-none"
              style={{ height: item.value ? `${(item.value / max) * 100}%` : "2px", opacity: item.value ? 1 : 0.35 }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs shadow-md group-hover:block"
            >
              <span className="font-medium tabular-nums">{item.value}</span> {unit} · {label(item.day)}
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-0.5 pl-7 text-[0.6875rem] text-muted-foreground">
        {data.map((item, index) => (
          <span key={item.day} className="flex-1 text-center">
            {labelled.has(index) ? label(item.day) : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
