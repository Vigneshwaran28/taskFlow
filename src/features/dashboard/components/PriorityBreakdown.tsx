import type { TaskPriority } from "@/features/tasks";

const ROWS: { key: TaskPriority; label: string; bar: string }[] = [
  { key: "urgent", label: "Urgent", bar: "bg-red-500" },
  { key: "high", label: "High", bar: "bg-amber-500" },
  { key: "medium", label: "Medium", bar: "bg-sky-500" },
  { key: "low", label: "Low", bar: "bg-slate-400" },
];

export function PriorityBreakdown({ byPriority }: { byPriority: Record<TaskPriority, number> }) {
  const total = ROWS.reduce((sum, row) => sum + byPriority[row.key], 0);
  return (
    <ul className="flex flex-col gap-3">
      {ROWS.map(row => {
        const value = byPriority[row.key];
        const percent = total ? Math.round((value / total) * 100) : 0;
        return (
          <li key={row.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {value} <span className="sr-only">tasks, </span>({percent}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
