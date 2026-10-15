"use client";
import { useState, type ReactNode } from "react";
import { Mail, Phone, Plus, Search, SearchX, Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { useCan } from "@/features/auth";
import { useCustomers } from "../hooks/useSales";
import type { Customer } from "../services/salesService";
import { CustomerFormDialog } from "./CustomerFormDialog";

/** Feature component: searchable customer list with add and edit. */
export function CustomersPanel() {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 300);
  const { data: customers, isPending, isPlaceholderData, error, refetch } = useCustomers(debounced || undefined);
  const [dialog, setDialog] = useState<{ key: number; customer: Customer | null } | null>(null);
  const canEdit = useCan("sales.edit");

  const openNew = () => setDialog({ key: Date.now(), customer: null });

  let body: ReactNode;
  if (isPending) body = <LoadingState label="Loading customers…" />;
  else if (error) body = <ErrorState message="Unable to load customers." onRetry={() => void refetch()} />;
  else if (!customers.length) {
    body = debounced ? (
      <EmptyState title="No customers match" message="Try a different name, company, or email." icon={SearchX} />
    ) : (
      <EmptyState
        title="No customers yet"
        message="Add the people and companies you sell to."
        icon={Users}
        action={
          canEdit ? (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New customer
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Customers</caption>
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">Customer</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Contact</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Owner</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Open deals</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Ordered</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map(customer => (
              <tr key={customer.id} className="hover:bg-muted/40">
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => setDialog({ key: Date.now(), customer })} className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                    {customer.name}
                  </button>
                  {customer.company && <span className="block text-xs text-muted-foreground">{customer.company}</span>}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {customer.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="select-all">{customer.email}</span>
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="select-all">{customer.phone}</span>
                    </span>
                  )}
                  {!customer.email && !customer.phone && "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{customer.owner?.name ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{customer.openDeals}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(customer.totalOrdered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search name, company, or email"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {canEdit && (
          <Button variant="secondary" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New customer
          </Button>
        )}
      </div>
      {body}
      {dialog && <CustomerFormDialog key={dialog.key} customer={dialog.customer} onClose={() => setDialog(null)} />}
    </div>
  );
}
