"use client";
import Link from "@/components/navigation/Link";
import { useRouter, useSearchParamsState } from "@/lib/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Download, FileText, Search, X } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Button, buttonClass } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { useBillingDocuments, useBillingExportUrl } from "../hooks/useBilling";
import type { DocumentFilters, DocumentKind, DocumentStatus } from "../services/billingService";
import { KIND_META, statusOptions } from "../utils/billingMeta";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 25;

/** Feature component: the Invoices or Quotes tab. Filters live in the URL (?status, q, overdue, from, to, page). */
export function DocumentsPanel({ kind }: { kind: DocumentKind }) {
  const router = useRouter();
  const [params, setParams] = useSearchParamsState();
  const meta = KIND_META[kind];
  const options = statusOptions(kind);
  const toggleId = useId();

  const statusParam = params.get("status") ?? "";
  const status = options.some(option => option.value === statusParam) ? statusParam : "";
  const overdue = kind === "invoice" && params.get("overdue") === "1";
  const from = DAY.test(params.get("from") ?? "") ? params.get("from")! : "";
  const to = DAY.test(params.get("to") ?? "") ? params.get("to")! : "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const urlSearch = params.get("q") ?? "";

  const [searchText, setSearchText] = useState(urlSearch);
  const search = useDebounce(searchText.trim(), 300);

  // The debounced search goes into the URL (and back to page 1) only when it changes, so clearing the
  // filters can't be undone by a still-pending debounced value.
  const lastSearch = useRef(search);
  useEffect(() => {
    if (search === lastSearch.current) return;
    lastSearch.current = search;
    setParams(current => {
      if (search) current.set("q", search);
      else current.delete("q");
      current.delete("page");
      return current;
    });
  }, [search, setParams]);

  function setFilter(name: string, value: string | null) {
    setParams(current => {
      if (value) current.set(name, value);
      else current.delete(name);
      current.delete("page");
      return current;
    });
  }

  const filters: DocumentFilters = {
    kind,
    status: (status || undefined) as DocumentStatus | undefined,
    search: urlSearch || undefined,
    overdue: overdue || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useBillingDocuments(filters);
  const exportUrl = useBillingExportUrl(filters);
  const filtered = Boolean(status || urlSearch || overdue || from || to);

  // A page past the end (e.g. after the last draft on it was deleted) steps back to the last page.
  const lastPage = data && !isPlaceholderData ? data.totalPages : null;
  useEffect(() => {
    if (lastPage == null || page <= lastPage) return;
    setParams(current => {
      if (lastPage > 1) current.set("page", String(lastPage));
      else current.delete("page");
      return current;
    });
  }, [lastPage, page, setParams]);

  function clearFilters() {
    setSearchText("");
    setParams(current => {
      ["status", "q", "overdue", "from", "to", "page"].forEach(name => current.delete(name));
      return current;
    });
  }

  let body;
  if (isPending) body = <LoadingState label={`Loading ${meta.plural.toLowerCase()}…`} />;
  else if (error) body = <ErrorState message={`Unable to load ${meta.plural.toLowerCase()}.`} onRetry={() => void refetch()} />;
  else if (!data.items.length) {
    body = filtered ? (
      <EmptyState
        title={`No ${meta.plural.toLowerCase()} match these filters`}
        icon={Search}
        action={
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={`No ${meta.plural.toLowerCase()} yet`}
        message={kind === "invoice" ? "Create an invoice, issue it to the customer, and record payments as they come in." : "Send a quote, mark it accepted, and convert it into an invoice."}
        icon={FileText}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-2" aria-busy={isFetching}>
        <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{meta.plural}</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Number
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Customer
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Issued
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  {meta.dueLabel}
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Total
                </th>
                {kind === "invoice" && (
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Balance
                  </th>
                )}
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map(doc => {
                const late = doc.isOverdue || doc.isExpired;
                return (
                  <tr key={doc.id} onClick={() => router.push(`/billing/${doc.id}`)} className="cursor-pointer hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        href={`/billing/${doc.id}`}
                        onClick={event => event.stopPropagation()}
                        className="font-mono font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {doc.number}
                      </Link>
                    </td>
                    <td className="max-w-[16rem] px-3 py-2.5">
                      <p className="truncate">{doc.billTo.name}</p>
                      {doc.customer?.company && doc.customer.company !== doc.billTo.name && <p className="truncate text-xs text-muted-foreground">{doc.customer.company}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">{formatDate(doc.issueDate)}</td>
                    <td className={cn("whitespace-nowrap px-3 py-2.5 tabular-nums", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {doc.dueDate ? formatDate(doc.dueDate) : "—"}
                      {late && <span className="sr-only"> ({doc.isOverdue ? "overdue" : "expired"})</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(doc.total)}</td>
                    {kind === "invoice" && (
                      <td className={cn("whitespace-nowrap px-3 py-2.5 text-right tabular-nums", doc.balance > 0 ? "font-medium" : "text-muted-foreground")}>{formatMoney(doc.balance)}</td>
                    )}
                    <td className="px-3 py-2.5">
                      <DocumentStatusBadge doc={doc} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={next => setFilter("page", next > 1 ? String(next) : null)} disabled={isFetching} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <TextField
            label="Search"
            type="search"
            placeholder="Number, customer, or email"
            value={searchText}
            maxLength={100}
            onChange={event => setSearchText(event.target.value)}
          />
          <SelectField label="Status" value={status} options={options} onChange={event => setFilter("status", event.target.value || null)} />
          <TextField label="Issued from" type="date" value={from} max={to || undefined} onChange={event => setFilter("from", event.target.value || null)} />
          <TextField label="Issued to" type="date" value={to} min={from || undefined} onChange={event => setFilter("to", event.target.value || null)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {kind === "invoice" ? (
            <label htmlFor={toggleId} className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                id={toggleId}
                type="checkbox"
                checked={overdue}
                onChange={event => setFilter("overdue", event.target.checked ? "1" : null)}
                className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              Only overdue
            </label>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            )}
            <a href={exportUrl} download className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </a>
          </div>
        </div>
      </div>
      {body}
    </div>
  );
}
