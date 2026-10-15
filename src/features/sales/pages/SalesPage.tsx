"use client";
// Page: owns the active tab in the URL (?tab=pipeline|customers|orders).
import { Receipt, Target, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useSearchParamsState } from "@/lib/navigation";
import { CustomersPanel } from "../components/CustomersPanel";
import { OrdersPanel } from "../components/OrdersPanel";
import { PipelineBoard } from "../components/PipelineBoard";
import { SalesOverview } from "../components/SalesOverview";

const TABS = [
  { id: "pipeline", label: "Pipeline", icon: Target },
  { id: "customers", label: "Customers", icon: Users },
  { id: "orders", label: "Orders", icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SalesPage() {
  const [params, setParams] = useSearchParamsState();
  const requested = params.get("tab");
  const tab: TabId = TABS.find(item => item.id === requested)?.id ?? "pipeline";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sales" description="Move deals from lead to won, keep customer details in one place, and turn agreements into orders." />
      <SalesOverview />
      <Tabs name="sales" label="Sales sections" tabs={TABS} active={tab} onChange={id => setParams(id === "pipeline" ? {} : { tab: id }, { push: true })}>
        {tab === "pipeline" && <PipelineBoard />}
        {tab === "customers" && <CustomersPanel />}
        {tab === "orders" && <OrdersPanel />}
      </Tabs>
    </div>
  );
}
