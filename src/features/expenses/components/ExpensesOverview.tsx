"use client";
// Home widget: the signed-in person's claims (expenses.submit), plus the month's payouts for approvers and payers.
// Claims waiting for approval or payment are counted in the home page's "Needs your attention" strip instead.
import { BadgeCheck, CheckCircle2, Clock, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useCan } from "@/features/auth";
import { formatMoney } from "@/lib/format";
import { useExpenseSummary } from "../hooks/useExpenses";
import type { Total } from "../services/expenseService";

const hint = (total: Total) => `${total.count} ${total.count === 1 ? "claim" : "claims"}`;

/** Quiet while loading. */
export function ExpensesOverview() {
  const { data } = useExpenseSummary();
  const submits = useCan("expenses.submit");
  const approves = useCan("expenses.approve");
  const pays = useCan("expenses.pay");
  if (!data) return null;
  const team = data.team;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {submits && (
        <>
          <StatCard label="My claims pending" value={formatMoney(data.mine.pending.amount)} hint={hint(data.mine.pending)} icon={Clock} tone="warning" href="/expenses" />
          <StatCard label="My claims approved" value={formatMoney(data.mine.approved.amount)} hint={hint(data.mine.approved)} icon={BadgeCheck} tone="info" href="/expenses" />
          <StatCard label="Paid to me" value={formatMoney(data.mine.paid.amount)} hint={hint(data.mine.paid)} icon={CheckCircle2} tone="success" href="/expenses" />
        </>
      )}
      {team && (approves || pays) && (
        <StatCard label="Paid this month" value={formatMoney(team.paidThisMonth.amount)} hint={hint(team.paidThisMonth)} icon={Wallet} tone="success" href="/expenses?tab=approvals" />
      )}
    </div>
  );
}
