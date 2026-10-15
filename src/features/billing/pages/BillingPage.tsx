"use client";
import { useRouter, useSearchParamsState } from "@/lib/navigation";
import { Suspense, useState } from "react";
import { useActionParam } from "@/lib/actionParam";
import { FilePlus2, FileText, LayoutDashboard, Receipt, ScrollText } from "lucide-react";
import { canOpenModule } from "@/app-shell/modules";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { useCan, useCurrentUser } from "@/features/auth";
import { DocumentEditorDialog } from "../components/DocumentEditorDialog";
import { DocumentsPanel } from "../components/DocumentsPanel";
import { FromOrderDialog } from "../components/FromOrderDialog";
import { SummaryPanel } from "../components/SummaryPanel";
import type { BillingDocumentDetail, DocumentKind } from "../services/billingService";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "quotes", label: "Quotes", icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Creating = { type: "document"; kind: DocumentKind } | { type: "order" } | null;

function BillingPageContent() {
  const router = useRouter();
  const [params, setParams] = useSearchParamsState();
  const { data: user } = useCurrentUser();
  const canEdit = useCan("billing.edit");
  const canInvoiceOrders = canEdit && canOpenModule(user, "sales");
  const [creating, setCreating] = useState<Creating>(null);
  useActionParam("new-invoice", () => setCreating({ type: "document", kind: "invoice" }), canEdit);

  const tabParam = params.get("tab");
  const tab: TabId = TABS.some(item => item.id === tabParam) ? (tabParam as TabId) : "overview";

  const openDocument = (doc: BillingDocumentDetail) => router.push(`/billing/${doc.id}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Quotes, tax invoices, payments, and what customers still owe."
        actions={
          canEdit && (
            <>
              {canInvoiceOrders && (
                <Button variant="secondary" onClick={() => setCreating({ type: "order" })}>
                  <Receipt className="h-4 w-4" aria-hidden="true" />
                  From sales order
                </Button>
              )}
              <Button variant="secondary" onClick={() => setCreating({ type: "document", kind: "quote" })}>
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                New quote
              </Button>
              <Button onClick={() => setCreating({ type: "document", kind: "invoice" })}>
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                New invoice
              </Button>
            </>
          )
        }
      />
      <Tabs name="billing" label="Billing sections" tabs={TABS} active={tab} onChange={id => setParams(id === "overview" ? {} : { tab: id }, { push: true })}>
        <div className="pt-6">
          {tab === "overview" && <SummaryPanel />}
          {tab === "invoices" && <DocumentsPanel key="invoice" kind="invoice" />}
          {tab === "quotes" && <DocumentsPanel key="quote" kind="quote" />}
        </div>
      </Tabs>
      {creating?.type === "document" && <DocumentEditorDialog kind={creating.kind} onClose={() => setCreating(null)} onSaved={openDocument} />}
      {creating?.type === "order" && <FromOrderDialog onClose={() => setCreating(null)} onCreated={openDocument} />}
    </div>
  );
}

/** Page: billing overview, invoices, and quotes (?tab=overview|invoices|quotes). */
export function BillingPage() {
  // useSearchParams needs a Suspense boundary so the route can prerender.
  return (
    <Suspense fallback={<LoadingState />}>
      <BillingPageContent />
    </Suspense>
  );
}
