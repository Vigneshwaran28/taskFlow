export interface BreakdownItem {
  name: string;
  label: string;
  count: number;
}

/** Presentational: labelled horizontal bars for a small set of counts (one hue, length = magnitude). */
export function BreakdownBars({ title, items }: { title: string; items: BreakdownItem[] }) {
  const max = Math.max(1, ...items.map(item => item.count));
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <figure className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{total} total</span>
      </figcaption>
      <ul className="flex flex-col gap-3">
        {items.map(item => (
          <li key={item.name} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="h-2.5 rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary/85 transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: item.count ? `${Math.max((item.count / max) * 100, 3)}%` : 0 }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{item.count}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
