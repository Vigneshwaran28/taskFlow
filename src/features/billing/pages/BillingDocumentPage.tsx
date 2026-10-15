"use client";
import Link from "@/components/navigation/Link";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Ban, Check, Copy, CreditCard, FileX, Link2, Pencil, Printer, Send, Trash2, X } from "lucide-react";
import { canOpenModule } from "@/app-shell/modules";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { useCan, useCurrentUser } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { DocumentEditorDialog } from "../components/DocumentEditorDialog";
import { DocumentSheet } from "../components/DocumentSheet";
import { RecordPaymentDialog, VoidDialog } from "../components/PaymentDialogs";
import {
  useBillingDocument,
  useConvertQuote,
  useDeleteDocument,
  useDuplicateDocument,
  useRemovePayment,
  useSendDocument,
  useSetQuoteStatus,
} from "../hooks/useBilling";
import type { BillingDocumentDetail, Payment } from "../services/billingService";
import { KIND_META, paymentMethodLabel } from "../utils/billingMeta";

type Pending = { type: "send" } | { type: "delete" } | { type: "decline" } | { type: "removePayment"; payment: Payment } | { type: "edit" } | { type: "pay" } | { type: "void" } | null;

function Callout({ tone, icon: Icon, children }: { tone: "danger" | "warning" | "info"; icon: typeof AlertTriangle; children: ReactNode }) {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  };
  return (
    <div role={tone === "info" ? "status" : "alert"} className={`no-print flex items-start gap-3 rounded-xl border p-4 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function PaymentsCard({ doc, canRemove, onRemove }: { doc: BillingDocumentDetail; canRemove: boolean; onRemove: (payment: Payment) => void }) {
  return (
    <section aria-labelledby="billing-payments-title" className="no-print rounded-xl border bg-card p-5 shadow-sm">
      <h2 id="billing-payments-title" className="font-semibold">
        Payments
      </h2>
      {doc.payments.length ? (
        <div className="relative mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Payments received</caption>
            <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Paid on
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Method
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Reference
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Amount
                </th>
                {canRemove && (
                  <th scope="col" className="py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {doc.payments.map(payment => (
                <tr key={payment.id} className="align-top">
                  <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums">{formatDate(payment.paidOn)}</td>
                  <td className="py-2.5 pr-3">{paymentMethodLabel(payment.method)}</td>
                  <td className="py-2.5 pr-3">
                    <p>{payment.reference || <span className="text-muted-foreground">—</span>}</p>
                    {payment.notes && <p className="text-xs text-muted-foreground">{payment.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      Recorded {payment.recordedBy ? `by ${payment.recordedBy.name} ` : ""}
                      {formatDateTime(payment.createdAt)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-right font-medium tabular-nums">{formatMoney(payment.amount)}</td>
                  {canRemove && (
                    <td className="py-1.5 text-right">
                      <Button variant="ghost" size="icon" aria-label={`Remove payment of ${formatMoney(payment.amount)} on ${formatDate(payment.paidOn)}`} onClick={() => onRemove(payment)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{doc.status === "draft" ? "Issue the invoice to start recording payments." : "No payments recorded yet."}</p>
      )}
    </section>
  );
}

/** Page: one invoice or quote as a printable document, with the actions its status allows. */
export function BillingDocumentPage() {
  const params = useParams<{ documentId: string }>();
  const id = Number(params.documentId);
  const validId = Number.isInteger(id) && id > 0;
  const router = useRouter();
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const canEdit = useCan("billing.edit");
  const canIssue = useCan("billing.issue");
  const canPay = useCan("billing.payments.record");
  const canDelete = useCan("billing.delete");
  const canOpenSales = canOpenModule(user, "sales");
  const { data: doc, isPending, error, refetch } = useBillingDocument(validId ? id : null);

  const sendDocument = useSendDocument();
  const deleteDocument = useDeleteDocument();
  const setQuoteStatus = useSetQuoteStatus();
  const convertQuote = useConvertQuote();
  const duplicateDocument = useDuplicateDocument();
  const removePayment = useRemovePayment();
  const [pending, setPending] = useState<Pending>(null);

  const notFound = !validId || (error instanceof ApiError && error.status === 404);
  if (notFound) {
    return (
      <EmptyState
        title="Invoice or quote not found"
        message="It may have been deleted, or the link is wrong."
        icon={FileX}
        action={
          <Link href="/billing" className="text-sm font-medium text-primary hover:underline">
            Back to billing
          </Link>
        }
      />
    );
  }
  if (isPending) return <LoadingState label="Loading document…" />;
  if (error || !doc) return <ErrorState message="Unable to load this document." onRetry={() => void refetch()} />;

  const meta = KIND_META[doc.kind];
  const isInvoice = doc.kind === "invoice";
  const isDraft = doc.status === "draft";
  const tab = isInvoice ? "invoices" : "quotes";
  const actionError = (err: unknown) => toast.error(err instanceof Error ? err.message : "Something went wrong.");

  const canRecordPayment = canPay && isInvoice && (doc.status === "sent" || doc.status === "partially_paid") && doc.balance > 0;
  const canVoid = canIssue && isInvoice && (doc.status === "draft" || doc.status === "sent") && doc.payments.length === 0;
  const canDecide = canIssue && !isInvoice && doc.status === "sent";
  const canConvert = canIssue && !isInvoice && (doc.status === "sent" || doc.status === "accepted");

  function duplicate() {
    if (!doc) return;
    duplicateDocument.mutate(doc.id, {
      onSuccess: copy => {
        toast.success(`${copy.number} created`, `A draft copy of ${doc.number}.`);
        router.push(`/billing/${copy.id}`);
      },
      onError: actionError,
    });
  }

  function convert() {
    if (!doc) return;
    convertQuote.mutate(doc.id, {
      onSuccess: invoice => {
        toast.success(`${invoice.number} drafted from ${doc.number}`, "Review it, then issue it.");
        router.push(`/billing/${invoice.id}`);
      },
      onError: actionError,
    });
  }

  function accept() {
    if (!doc) return;
    setQuoteStatus.mutate({ id: doc.id, status: "accepted" }, { onSuccess: saved => toast.success(`${saved.number} accepted`), onError: actionError });
  }

  function confirmPending() {
    if (!doc || !pending) return;
    const done = () => setPending(null);
    const onError = (err: unknown) => {
      done();
      actionError(err);
    };
    const succeed = (message: string) => {
      done();
      toast.success(message);
    };
    if (pending.type === "send") {
      sendDocument.mutate(doc.id, { onSuccess: saved => succeed(isInvoice ? `${saved.number} issued` : `${saved.number} sent`), onError });
    } else if (pending.type === "decline") {
      setQuoteStatus.mutate({ id: doc.id, status: "declined" }, { onSuccess: saved => succeed(`${saved.number} declined`), onError });
    } else if (pending.type === "delete") {
      deleteDocument.mutate(doc.id, {
        onSuccess: () => {
          toast.success(`${doc.number} deleted`);
          router.push(`/billing?tab=${tab}`);
        },
        onError,
      });
    } else if (pending.type === "removePayment") {
      removePayment.mutate({ id: doc.id, paymentId: pending.payment.id }, { onSuccess: () => succeed("Payment removed"), onError });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="no-print flex flex-col gap-4">
        <Link href={`/billing?tab=${tab}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {meta.plural}
        </Link>
        <div role="toolbar" aria-label={`${meta.label} actions`} className="flex flex-wrap items-center gap-2">
          {isDraft && canEdit && (
            <Button variant="secondary" onClick={() => setPending({ type: "edit" })}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}
          {isDraft && canIssue && (
            <Button onClick={() => setPending({ type: "send" })}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {isInvoice ? "Issue invoice" : "Send quote"}
            </Button>
          )}
          {canRecordPayment && (
            <Button onClick={() => setPending({ type: "pay" })}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Record payment
            </Button>
          )}
          {canDecide && (
            <>
              <Button variant="secondary" onClick={accept} loading={setQuoteStatus.isPending && setQuoteStatus.variables?.status === "accepted"}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Mark accepted
              </Button>
              <Button variant="secondary" onClick={() => setPending({ type: "decline" })}>
                <X className="h-4 w-4" aria-hidden="true" />
                Mark declined
              </Button>
            </>
          )}
          {canConvert && (
            <Button onClick={convert} loading={convertQuote.isPending}>
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              Convert to invoice
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" onClick={duplicate} loading={duplicateDocument.isPending}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Duplicate
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
          {canVoid && (
            <Button variant="ghost" className="text-destructive" onClick={() => setPending({ type: "void" })}>
              <Ban className="h-4 w-4" aria-hidden="true" />
              Void
            </Button>
          )}
          {isDraft && canDelete && (
            <Button variant="ghost" className="text-destructive" onClick={() => setPending({ type: "delete" })}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete draft
            </Button>
          )}
        </div>
      </div>

      {doc.isOverdue && (
        <Callout tone="danger" icon={AlertTriangle}>
          This invoice was due on <strong>{formatDate(doc.dueDate)}</strong>. <strong>{formatMoney(doc.balance)}</strong> is overdue.
        </Callout>
      )}
      {doc.isExpired && (
        <Callout tone="warning" icon={AlertTriangle}>
          This quote expired on <strong>{formatDate(doc.dueDate)}</strong>. Duplicate it to send a fresh one, or convert it if the customer still agrees.
        </Callout>
      )}
      {doc.status === "void" && (
        <Callout tone="danger" icon={Ban}>
          Voided{doc.voidedAt ? ` on ${formatDateTime(doc.voidedAt)}` : ""}. It no longer counts as owed.
        </Callout>
      )}
      {(doc.sourceQuote || doc.convertedInvoice || doc.order) && (
        <Callout tone="info" icon={Link2}>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {doc.sourceQuote && (
              <span>
                From quote{" "}
                <Link href={`/billing/${doc.sourceQuote.id}`} className="font-mono font-medium underline-offset-2 hover:underline">
                  {doc.sourceQuote.number}
                </Link>
              </span>
            )}
            {doc.convertedInvoice && (
              <span>
                Converted to invoice{" "}
                <Link href={`/billing/${doc.convertedInvoice.id}`} className="font-mono font-medium underline-offset-2 hover:underline">
                  {doc.convertedInvoice.number}
                </Link>
              </span>
            )}
            {doc.order && (
              <span>
                From sales order{" "}
                {canOpenSales ? (
                  <Link href="/sales?tab=orders" className="font-mono font-medium underline-offset-2 hover:underline">
                    {doc.order.key}
                  </Link>
                ) : (
                  <span className="font-mono font-medium">{doc.order.key}</span>
                )}
              </span>
            )}
          </span>
        </Callout>
      )}

      <DocumentSheet doc={doc} />

      {isInvoice && <PaymentsCard doc={doc} canRemove={canPay} onRemove={payment => setPending({ type: "removePayment", payment })} />}

      <p className="no-print text-xs text-muted-foreground">
        Created {doc.createdBy ? `by ${doc.createdBy.name} ` : ""}
        {formatDateTime(doc.createdAt)}
        {doc.sentAt && ` · ${isInvoice ? "Issued" : "Sent"} ${formatDateTime(doc.sentAt)}`}
        {doc.paidAt && ` · Paid ${formatDateTime(doc.paidAt)}`}
      </p>

      {pending?.type === "edit" && <DocumentEditorDialog kind={doc.kind} doc={doc} onClose={() => setPending(null)} />}
      {pending?.type === "pay" && <RecordPaymentDialog doc={doc} onClose={() => setPending(null)} />}
      {pending?.type === "void" && <VoidDialog doc={doc} onClose={() => setPending(null)} />}
      <ConfirmDialog
        open={pending?.type === "send"}
        title={isInvoice ? `Issue ${doc.number}?` : `Send ${doc.number}?`}
        message={isInvoice ? `It will count as owed (${formatMoney(doc.total)}) and can no longer be edited or deleted. You can still void it.` : "It can no longer be edited. You can then mark it accepted or declined."}
        confirmLabel={isInvoice ? "Issue invoice" : "Mark as sent"}
        tone="primary"
        pending={sendDocument.isPending}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.type === "decline"}
        title={`Mark ${doc.number} declined?`}
        message="A declined quote can't be converted to an invoice. Duplicate it to send a revised one."
        confirmLabel="Mark declined"
        pending={setQuoteStatus.isPending}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.type === "delete"}
        title={`Delete ${doc.number}?`}
        message="This draft will be removed permanently."
        confirmLabel="Delete draft"
        pending={deleteDocument.isPending}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.type === "removePayment"}
        title="Remove this payment?"
        message={
          pending?.type === "removePayment"
            ? `${formatMoney(pending.payment.amount)} paid on ${formatDate(pending.payment.paidOn)} by ${paymentMethodLabel(pending.payment.method)} will be removed and the balance recalculated.`
            : ""
        }
        confirmLabel="Remove payment"
        pending={removePayment.isPending}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
