import { apiClient } from "@/lib/apiClient";
import type { Task, TaskPriority } from "@/features/tasks";

export interface DashboardStats {
  open: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
  byPriority: Record<TaskPriority, number>;
  /** ISO timestamps of tasks completed since weekStart */
  completedAt: string[];
  nextUp: Task[];
}

/** Local-day boundaries as ISO */
export interface StatsRange {
  todayStart: string;
  todayEnd: string;
  weekStart: string;
}

export const statsService = {
  async getStats(range: StatsRange, { signal }: { signal?: AbortSignal } = {}): Promise<DashboardStats> {
    const data = await apiClient.get<Partial<DashboardStats> | null>("/stats", { params: { ...range }, signal });
    return {
      open: data?.open ?? 0,
      dueToday: data?.dueToday ?? 0,
      overdue: data?.overdue ?? 0,
      completedThisWeek: data?.completedThisWeek ?? 0,
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0, ...data?.byPriority },
      completedAt: data?.completedAt ?? [],
      nextUp: data?.nextUp ?? [],
    };
  },
};
