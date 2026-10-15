"use client";
// "Needs your attention": one count per thing waiting on this person, each linking to where it's handled.
// Each item mounts only when the person may see its data (so no request is made without permission) and renders
// nothing at zero; the whole strip hides when no item shows. The module sections below don't repeat these numbers.
import Link from "@/components/navigation/Link";
import type { ComponentType } from "react";
import { AlarmClock, ClipboardCheck, FileWarning, HandCoins, Hourglass, MessageSquareReply, Siren, TriangleAlert, Truck, UserCheck } from "lucide-react";
import { canOpenModule } from "@/app-shell/modules";
import { useLeaves } from "@/features/attendance";
import { useBillingSummary } from "@/features/billing";
import { useClinicSummary } from "@/features/clinic";
import { useExpenseSummary } from "@/features/expenses";
import { useLogisticsSummary } from "@/features/logistics";
import { useTicketStats } from "@/features/tickets";
import { cn } from "@/lib/cn";
import { formatInteger } from "@/lib/format";
import type { SessionUser } from "@/types/session";
import { useStats } from "../hooks/useStats";

type Tone = "danger" | "warning" | "primary";
const TONES: Record<Tone, string> = {
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  primary: "bg-accent text-accent-foreground",
};

function Item({ count, label, href, icon: Icon, tone = "primary" }: { count: number | undefined; label: string; href: string; icon: ComponentType<{ className?: string }>; tone?: Tone }) {
  if (!count) return null;
  return (
    <li>
      <Link
        href={href}
        className="flex h-full items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn("rounded-lg p-2", TONES[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-semibold leading-tight tabular-nums">{formatInteger(count)}</span>
          <span className="block text-xs text-muted-foreground">{label}</span>
        </span>
      </Link>
    </li>
  );
}

function OverdueTasks() {
  const { data } = useStats();
  return <Item count={data?.overdue} label="Overdue tasks" href="/tasks/overdue" icon={TriangleAlert} tone="danger" />;
}

function Tickets() {
  const { data } = useTicketStats();
  if (!data) return null;
  return (
    <>
      <Item count={data.assignedToMe} label="Tickets assigned to you" href="/tickets?scope=assigned" icon={UserCheck} />
      {data.staff ? (
        <Item count={data.breached} label="Tickets past their target" href="/tickets?scope=all&breached=true" icon={Siren} tone="danger" />
      ) : (
        <Item count={data.waitingOnMe} label="Tickets waiting on your reply" href="/tickets?scope=mine&status=waiting" icon={MessageSquareReply} tone="warning" />
      )}
    </>
  );
}

function LeaveApprovals({ userId }: { userId: number }) {
  const { data } = useLeaves({ scope: "all", status: "pending" });
  const count = data?.filter(leave => leave.user?.id !== userId).length;
  return <Item count={count} label="Leave requests to approve" href="/attendance?tab=approvals" icon={ClipboardCheck} tone="warning" />;
}

function ExpenseApprovals({ approves, pays }: { approves: boolean; pays: boolean }) {
  const { data } = useExpenseSummary();
  return (
    <>
      {approves && <Item count={data?.team?.pending.count} label="Expense claims to approve" href="/expenses?tab=approvals" icon={ClipboardCheck} tone="warning" />}
      {pays && <Item count={data?.team?.toPay.count} label="Approved claims to pay" href="/expenses?tab=approvals" icon={HandCoins} />}
    </>
  );
}

function OverdueInvoices() {
  const { data } = useBillingSummary();
  return <Item count={data?.overdue.count} label="Invoices overdue" href="/billing?tab=invoices&overdue=1" icon={FileWarning} tone="danger" />;
}

function PatientsWaiting({ reception }: { reception: boolean }) {
  const { data } = useClinicSummary();
  return (
    <Item
      count={data?.byStatus.checked_in}
      label={reception ? "Patients waiting" : "Your patients waiting"}
      href={reception ? "/clinic?tab=reception" : "/clinic?tab=my-queue"}
      icon={Hourglass}
      tone="warning"
    />
  );
}

function Deliveries() {
  const { data } = useLogisticsSummary();
  return <Item count={data?.myDeliveries} label="Deliveries assigned to you" href="/logistics?tab=mine" icon={Truck} />;
}

function OverdueShipments() {
  const { data } = useLogisticsSummary();
  return <Item count={data?.overdue} label="Shipments overdue" href="/logistics?tab=shipments&overdue=true" icon={AlarmClock} tone="danger" />;
}

export function AttentionStrip({ user }: { user: SessionUser }) {
  const can = (...permissions: string[]) => permissions.some(permission => user.permissions?.includes(permission));
  const has = (feature: Parameters<typeof canOpenModule>[1]) => canOpenModule(user, feature);
  const reception = can("clinic.schedule.view", "clinic.appointments.manage");
  return (
    <section aria-labelledby="attention-title" className="flex flex-col gap-3 [&:not(:has(li))]:hidden">
      <h2 id="attention-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Needs your attention
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3">
        {has("tasks") && can("tasks.use") && <OverdueTasks />}
        {has("helpdesk") && can("helpdesk.use", "helpdesk.work") && <Tickets />}
        {has("clinic") && (reception || can("clinic.practitioner")) && <PatientsWaiting reception={reception} />}
        {has("attendance") && can("attendance.leave.approve") && <LeaveApprovals userId={user.id} />}
        {has("expenses") && can("expenses.approve", "expenses.pay") && <ExpenseApprovals approves={can("expenses.approve")} pays={can("expenses.pay")} />}
        {has("billing") && can("billing.view") && <OverdueInvoices />}
        {has("logistics") && can("logistics.deliver") && <Deliveries />}
        {has("logistics") && can("logistics.view") && <OverdueShipments />}
      </ul>
    </section>
  );
}
