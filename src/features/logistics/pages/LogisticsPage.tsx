"use client";
// /logistics: the module's tabs live in ?tab= and are shown by permission.
import { useRouter, useSearchParamsState } from "@/lib/navigation";
import { useState } from "react";
import { useActionParam } from "@/lib/actionParam";
import { Building2, LayoutDashboard, Package, Plus, Truck, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useCan } from "@/features/auth";
import { CarriersPanel } from "../components/CarriersPanel";
import { FleetPanel } from "../components/FleetPanel";
import { MyDeliveriesPanel } from "../components/MyDeliveriesPanel";
import { OverviewPanel } from "../components/OverviewPanel";
import { ShipmentFormDialog } from "../components/ShipmentFormDialog";
import { ShipmentsPanel } from "../components/ShipmentsPanel";
import { useLogisticsSummary } from "../hooks/useLogistics";

type TabId = "overview" | "shipments" | "mine" | "fleet" | "carriers";

export function LogisticsPage() {
  const router = useRouter();
  const [params, setParams] = useSearchParamsState();
  const seesAll = useCan("logistics.view", "logistics.edit", "logistics.dispatch", "logistics.fleet.manage");
  const delivers = useCan("logistics.deliver");
  const managesFleet = useCan("logistics.fleet.manage");
  const canEdit = useCan("logistics.edit");
  const summary = useLogisticsSummary({ enabled: seesAll || delivers });
  const [booking, setBooking] = useState(false);
  useActionParam("new", () => setBooking(true), canEdit);

  const tabs: (TabItem & { id: TabId })[] = [
    ...(seesAll
      ? [
          { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
          { id: "shipments" as const, label: "Shipments", icon: Package, count: summary.data?.open },
        ]
      : []),
    ...(delivers ? [{ id: "mine" as const, label: "My deliveries", icon: UserRound, count: summary.data?.myDeliveries }] : []),
    ...(managesFleet
      ? [
          { id: "fleet" as const, label: "Fleet", icon: Truck },
          { id: "carriers" as const, label: "Carriers", icon: Building2 },
        ]
      : []),
  ];
  const requested = params.get("tab");
  const active: TabId = tabs.find(tab => tab.id === requested)?.id ?? tabs[0]?.id ?? "mine";

  // Switching tabs drops the previous tab's filters.
  const changeTab = (id: string) => setParams(id === tabs[0]?.id ? {} : { tab: id }, { push: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logistics"
        description="Book shipments, dispatch them to carriers or your own drivers, and follow every delivery to the door."
        actions={
          canEdit && (
            <Button onClick={() => setBooking(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Book shipment
            </Button>
          )
        }
      />
      <Tabs name="logistics" label="Logistics sections" tabs={tabs} active={active} onChange={changeTab}>
        <div className="pt-6">
          {active === "overview" && <OverviewPanel />}
          {active === "shipments" && <ShipmentsPanel />}
          {active === "mine" && <MyDeliveriesPanel />}
          {active === "fleet" && <FleetPanel />}
          {active === "carriers" && <CarriersPanel />}
        </div>
      </Tabs>
      {booking && <ShipmentFormDialog onClose={() => setBooking(false)} onSaved={saved => router.push(`/logistics/${saved.id}`)} />}
    </div>
  );
}
