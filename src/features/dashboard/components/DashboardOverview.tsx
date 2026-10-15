"use client";
// Feature component: loads dashboard stats and renders cards, charts, and the next-up list.
// Overdue tasks are counted in the home page's "Needs your attention" strip, so they aren't a card here.
import Link from "@/components/navigation/Link";
import type { ReactNode } from "react";
import { CalendarDays, CheckCircle2, ListTodo, PartyPopper } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { TaskRow, useTaskDialog, useToggleTask, type Task } from "@/features/tasks";
import { useStats } from "../hooks/useStats";
import { PriorityBreakdown } from "./PriorityBreakdown";
import { WeeklyChart } from "./WeeklyChart";

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DashboardOverview() {
  const toast = useToast();
  const { openEdit } = useTaskDialog();
  const { data, isPending, error, refetch } = useStats();
  const toggleTask = useToggleTask();

  if (isPending) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState message="Unable to load the dashboard." onRetry={() => void refetch()} />;

  function handleToggle(task: Task, done: boolean) {
    toggleTask.mutate({ id: task.id, done }, { onError: () => toast.error("Couldn't update the task", "Please try again.") });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open tasks" value={data.open} icon={ListTodo} href="/tasks/all" />
        <StatCard label="Due today" value={data.dueToday} icon={CalendarDays} tone="warning" href="/tasks/today" />
        <StatCard label="Done this week" value={data.completedThisWeek} icon={CheckCircle2} tone="success" href="/tasks/completed" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel
            title="Next up"
            action={
              <Link href="/tasks/upcoming" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {data.nextUp.length ? (
              <ul className="-m-5 divide-y">
                {data.nextUp.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={handleToggle} onOpen={openEdit} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={PartyPopper} title="Nothing scheduled" message="Tasks with a due date will appear here." />
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Completed this week">
            <WeeklyChart completedAt={data.completedAt} />
          </Panel>
          <Panel title="Open by priority">
            <PriorityBreakdown byPriority={data.byPriority} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
