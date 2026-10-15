"use client";
// Page: owns URL state (queue, filters, search, page) and the "new ticket" dialog.
import { useState } from "react";
import { useActionParam } from "@/lib/actionParam";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParamsState } from "@/lib/navigation";
import { NewTicketDialog } from "../components/NewTicketDialog";
import { TicketsBoard, type TicketParamName, type TicketsBoardState } from "../components/TicketsBoard";

const DEFAULTS: Partial<Record<TicketParamName, string>> = { status: "active", sort: "updated" };

export function TicketsPage() {
  const [params, setParams] = useSearchParamsState();
  const [dialogKey, setDialogKey] = useState(0); // 0 = closed; a new key resets the form
  const state: TicketsBoardState = {
    scope: params.get("scope") ?? undefined,
    status: params.get("status") ?? "active",
    priority: params.get("priority") ?? "",
    category: params.get("category") ?? "",
    search: params.get("q") ?? "",
    sort: params.get("sort") ?? "updated",
    breached: params.get("breached") === "true",
    page: Number(params.get("page")) || 1,
  };
  const debouncedSearch = useDebounce(state.search, 300);

  function handleChange(name: TicketParamName, value: string) {
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== DEFAULTS[name]) next.set(name, value);
        else next.delete(name);
        if (name === "scope") next.delete("breached");
        next.delete("page");
        return next;
      },
      { push: name !== "q" }
    );
  }

  function handlePageChange(page: number) {
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (page > 1) next.set("page", String(page));
        else next.delete("page");
        return next;
      },
      { push: true }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const openDialog = () => setDialogKey(key => key + 1);
  useActionParam("new", openDialog);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Help desk"
        description="Raise a request with IT, HR, facilities, or finance, and follow it to resolution."
        actions={
          <Button onClick={openDialog}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New ticket
          </Button>
        }
      />
      <TicketsBoard state={state} debouncedSearch={debouncedSearch} onChange={handleChange} onPageChange={handlePageChange} onNewTicket={openDialog} />
      {dialogKey > 0 && <NewTicketDialog key={dialogKey} open onClose={() => setDialogKey(0)} />}
    </div>
  );
}
