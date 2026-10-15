"use client";
import { CheckCircle2, Clock, Inbox, Smile, TriangleAlert, UserCheck } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useTicketStats } from "../hooks/useTickets";

/**
 * Feature component: queue health for staff, or "my requests" counts for everyone else. Quiet while loading.
 * `home`: leaves out what the home page's "Needs your attention" strip already counts (assigned to me, past target, waiting on me).
 */
export function HelpdeskStats({ home = false }: { home?: boolean }) {
  const { data } = useTicketStats();
  if (!data) return null;

  if (!data.staff) {
    return (
      <div className={home ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
        {!home && <StatCard label="Assigned to me" value={data.assignedToMe} icon={UserCheck} href="/tickets?scope=assigned" />}
        <StatCard label="My open requests" value={data.myOpen} icon={Inbox} href="/tickets?scope=mine" />
        {!home && <StatCard label="Waiting on my reply" value={data.waitingOnMe} icon={Clock} tone="warning" href="/tickets?scope=mine&status=waiting" />}
        <StatCard label="Resolved" value={data.resolved} icon={CheckCircle2} tone="success" href="/tickets?scope=mine&status=resolved" />
      </div>
    );
  }

  const satisfaction = data.satisfaction.average == null ? "—" : `${data.satisfaction.average} / 5`;
  return (
    <div className={home ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"}>
      <StatCard label="Open tickets" value={data.open} icon={Inbox} href="/tickets?scope=all" />
      <StatCard label="Unassigned" value={data.unassigned} icon={Inbox} tone="warning" href="/tickets?scope=unassigned" />
      {!home && <StatCard label="Assigned to me" value={data.assignedToMe} icon={UserCheck} href="/tickets?scope=assigned" />}
      {!home && <StatCard label="Overdue" value={data.breached} icon={TriangleAlert} tone="danger" href="/tickets?scope=all&breached=true" />}
      <StatCard label="Resolved today" value={data.resolvedToday} icon={CheckCircle2} tone="success" href="/tickets?scope=all&status=resolved" />
      <StatCard label={`Satisfaction (${data.satisfaction.count} ratings, 30 days)`} value={satisfaction} icon={Smile} tone="success" />
    </div>
  );
}
