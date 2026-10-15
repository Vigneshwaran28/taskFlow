import { useSiteTitle } from "@/features/auth";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { BillingDocumentDetail } from "../services/billingService";
import { KIND_META } from "../utils/billingMeta";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

function Lines({ lines }: { lines: (string | null | undefined)[] }) {
  return (
    <>
      {lines
        .filter((line): line is string => Boolean(line && line.trim()))
        .map((line, index) => (
          <p key={index} className="whitespace-pre-line">
            {line}
          </p>
        ))}
    </>
  );
}

/** The printable invoice or quotation (wrapped in .print-area so printing gives a clean document). */
export function DocumentSheet({ doc }: { doc: BillingDocumentDetail }) {
  const siteTitle = useSiteTitle();
  const meta = KIND_META[doc.kind];
  const company = doc.company;
  const companyName = company?.legalName?.trim() || siteTitle;
  const showDiscount = doc.discountTotal > 0 || doc.items.some(item => item.discountPct > 0);

  return (
    <article aria-labelledby="billing-doc-title" className="print-area rounded-xl border bg-card p-6 shadow-sm sm:p-10 print:p-0">
      <header className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-sm text-muted-foreground">
          <p className="text-lg font-semibold text-foreground">{companyName}</p>
          <Lines lines={[company?.address]} />
          {company?.taxId && <p>Tax ID: {company.taxId}</p>}
          <Lines lines={[[company?.email, company?.phone].filter(Boolean).join(" · "), company?.website]} />
        </div>
        <div className="sm:text-right">
          <h1 id="billing-doc-title" className="text-2xl font-semibold uppercase tracking-wide">
            {meta.title}
          </h1>
          <p className="mt-1 font-mono text-lg">{doc.number}</p>
          <div className="mt-2 sm:flex sm:justify-end">
            <DocumentStatusBadge doc={doc} />
          </div>
        </div>
      </header>

      <section className="grid gap-6 border-b py-6 sm:grid-cols-2">
        <div className="text-sm">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{doc.kind === "quote" ? "Prepared for" : "Bill to"}</h2>
          <p className="font-medium">{doc.billTo.name}</p>
          <div className="text-muted-foreground">
            {doc.customer?.company && doc.customer.company !== doc.billTo.name && <p>{doc.customer.company}</p>}
            <Lines lines={[doc.billTo.address, [doc.billTo.email, doc.billTo.phone].filter(Boolean).join(" · ")]} />
            {doc.billTo.taxId && <p>Tax ID: {doc.billTo.taxId}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm sm:justify-self-end">
          <dt className="text-muted-foreground">Issue date</dt>
          <dd className="tabular-nums sm:text-right">{formatDate(doc.issueDate)}</dd>
          {doc.dueDate && (
            <>
              <dt className="text-muted-foreground">{meta.dueLabel}</dt>
              <dd className={doc.isOverdue || doc.isExpired ? "font-medium tabular-nums text-destructive sm:text-right" : "tabular-nums sm:text-right"}>{formatDate(doc.dueDate)}</dd>
            </>
          )}
          {doc.order && (
            <>
              <dt className="text-muted-foreground">Sales order</dt>
              <dd className="font-mono sm:text-right">{doc.order.key}</dd>
            </>
          )}
          {doc.sourceQuote && (
            <>
              <dt className="text-muted-foreground">Quote</dt>
              <dd className="font-mono sm:text-right">{doc.sourceQuote.number}</dd>
            </>
          )}
        </dl>
      </section>

      <div className="relative overflow-x-auto py-6">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Line items</caption>
          <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-8 py-2 pr-2 font-semibold">
                #
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Description
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Unit price
              </th>
              {showDiscount && (
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Disc.
                </th>
              )}
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                {doc.taxLabel}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {doc.items.map((item, index) => (
              <tr key={item.id} className="align-top">
                <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="py-2.5 pr-3">
                  <p>{item.description}</p>
                  {item.sku && <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">
                  {formatNumber(item.quantity)}
                  {item.unit && <span className="text-muted-foreground"> {item.unit}</span>}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                {showDiscount && <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">{item.discountPct ? `${formatNumber(item.discountPct)}%` : "—"}</td>}
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">
                  <span>{formatNumber(item.taxRate)}%</span>
                  <span className="block text-xs text-muted-foreground">{formatMoney(item.lineTax)}</span>
                </td>
                <td className="whitespace-nowrap py-2.5 text-right font-medium tabular-nums">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t pt-4 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right tabular-nums">{formatMoney(doc.subtotal)}</dd>
        {doc.discountTotal > 0 && (
          <>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="text-right tabular-nums">−{formatMoney(doc.discountTotal)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{doc.taxLabel}</dt>
        <dd className="text-right tabular-nums">{formatMoney(doc.taxTotal)}</dd>
        <dt className="border-t pt-1.5 font-semibold">Total</dt>
        <dd className="border-t pt-1.5 text-right text-lg font-semibold tabular-nums">{formatMoney(doc.total)}</dd>
        {doc.kind === "invoice" && doc.status !== "void" && (
          <>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-right tabular-nums">{formatMoney(doc.amountPaid)}</dd>
            <dt className="font-semibold">Balance due</dt>
            <dd className={doc.balance > 0 ? "text-right font-semibold tabular-nums" : "text-right font-semibold tabular-nums text-success"}>{formatMoney(doc.balance)}</dd>
          </>
        )}
      </dl>

      {(doc.notes || doc.terms) && (
        <footer className="mt-8 grid gap-6 border-t pt-6 text-sm sm:grid-cols-2">
          {doc.notes && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
              <p className="whitespace-pre-line">{doc.notes}</p>
            </div>
          )}
          {doc.terms && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</h2>
              <p className="whitespace-pre-line">{doc.terms}</p>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
