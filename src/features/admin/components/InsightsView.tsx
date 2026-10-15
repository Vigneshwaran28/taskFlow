"use client";
import { BellDot, CheckCircle2, ListTodo, TriangleAlert, UserPlus, Users } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useAdminInsights } from "../hooks/useAdmin";
import { BreakdownBars } from "./BreakdownBars";
import { DailyBarChart } from "./DailyBarChart";

const STATUS_LABELS: Record<string, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const PRIORITY_LABELS: Record<string, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

/** Feature component: totals, task breakdowns, and 14-day activity for one tenant (or summed over every tenant). */
export function InsightsView({ tenantId, tenantName }: { tenantId?: number; tenantName?: string }) {
  const { data, isPending, error, refetch } = useAdminInsights(tenantId);

  if (isPending) return <LoadingState label="Loading insights…" />;
  if (error) return <ErrorState message="Unable to load insights." onRetry={() => void refetch()} />;

  const { totals } = data;
  return (
    <div className="flex flex-col gap-6">
      {!tenantId && <p className="text-sm text-muted-foreground">Totals summed over every tenant. Choose a tenant to see its own numbers.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Users" value={totals.users} icon={Users} />
        <StatCard label="New users (7 days)" value={totals.newUsers} icon={UserPlus} tone="success" />
        <StatCard label="Open tasks" value={totals.open} icon={ListTodo} />
        <StatCard label="Overdue tasks" value={totals.overdue} icon={TriangleAlert} tone="danger" />
        <StatCard label="Completed (7 days)" value={totals.completedWeek} icon={CheckCircle2} tone="success" />
        <StatCard label="Unread notifications" value={totals.unread} icon={BellDot} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailyBarChart title="Tasks created per day" unit="created" data={data.daily.map(item => ({ day: item.day, value: item.created }))} />
        <DailyBarChart title="Tasks completed per day" unit="completed" data={data.daily.map(item => ({ day: item.day, value: item.completed }))} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownBars title="Tasks by status" items={data.byStatus.map(item => ({ ...item, label: STATUS_LABELS[item.name] ?? item.name }))} />
        <BreakdownBars title="Tasks by priority" items={data.byPriority.map(item => ({ ...item, label: PRIORITY_LABELS[item.name] ?? item.name }))} />
      </div>
      <p className="text-xs text-muted-foreground">
        Days are UTC calendar days. Totals: {totals.tasks} tasks across {totals.users} users{tenantName ? ` in ${tenantName}` : " in every tenant"}.
      </p>
    </div>
  );
}
