"use client";
// Page: owns the active tab in the URL (?tab=mine|approvals). Approvals need approve or pay permission.
import { ClipboardCheck, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { Tabs } from "@/components/ui/Tabs";
import { useSearchParamsState } from "@/lib/navigation";
import { useCurrentUser } from "@/features/auth";
import { ExpenseApprovals } from "../components/ExpenseApprovals";
import { MyClaims } from "../components/MyClaims";

const TABS = [
  { id: "mine", label: "My claims", icon: ReceiptText, permissions: ["expenses.submit"] },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck, permissions: ["expenses.approve", "expenses.pay"] },
] as const;

export function ExpensesPage() {
  const { data: user } = useCurrentUser();
  const [params, setParams] = useSearchParamsState();
  const tabs = TABS.filter(tab => tab.permissions.some(permission => user?.permissions?.includes(permission)));
  const requested = params.get("tab");
  const tab = tabs.find(item => item.id === requested)?.id ?? tabs[0]?.id;
  // No expense permission at all: show nothing rather than an approvals panel the server will refuse.
  const panel = tab === "mine" ? <MyClaims /> : tab === "approvals" ? <ExpenseApprovals /> : <EmptyState title="No access to expenses" message="Ask an admin for permission to submit or review claims." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Expenses" description="Claim back what you spent for work, and follow each claim until it's paid." />
      {tabs.length > 1 && tab ? (
        <Tabs name="expenses" label="Expense sections" tabs={tabs} active={tab} onChange={id => setParams(id === "mine" ? {} : { tab: id }, { push: true })}>
          {panel}
        </Tabs>
      ) : (
        <div id="expenses-panel">{panel}</div>
      )}
    </div>
  );
}
