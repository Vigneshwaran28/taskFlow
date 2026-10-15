// Public API of the billing feature (quotes, tax invoices, payments, receivables).
export { BillingPage } from "./pages/BillingPage";
export { BillingDocumentPage } from "./pages/BillingDocumentPage";
export { BillingOverview } from "./components/BillingOverview";
export { DocumentStatusBadge } from "./components/DocumentStatusBadge";
export { billingKeys, useBillingSummary, useBillingDocuments, useBillingDocument } from "./hooks/useBilling";
export { INVOICE_STATUS_META, QUOTE_STATUS_META, KIND_META, PAYMENT_METHOD_LABELS, paymentMethodLabel, statusMeta } from "./utils/billingMeta";
export type { BillingDocument, BillingDocumentDetail, BillingSummary, DocumentKind, DocumentStatus, LineItem, Payment } from "./services/billingService";
