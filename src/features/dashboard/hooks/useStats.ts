import { useQuery } from "@tanstack/react-query";
import { addDays, endOfDay, startOfDay } from "@/lib/dates";
import { statsService, type StatsRange } from "../services/statsService";

export const statsKeys = {
  all: ["stats"] as const,
  range: (range: StatsRange) => [...statsKeys.all, range] as const,
};

/** Local-day boundaries; stable for the whole day so the query key doesn't churn. */
export function currentRange(): StatsRange {
  const todayStart = startOfDay();
  return {
    todayStart: todayStart.toISOString(),
    todayEnd: endOfDay().toISOString(),
    weekStart: addDays(todayStart, -6).toISOString(),
  };
}

export function useStats() {
  const range = currentRange();
  return useQuery({
    queryKey: statsKeys.range(range),
    queryFn: ({ signal }) => statsService.getStats(range, { signal }),
  });
}
