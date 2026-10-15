// Number and day formatting shared by the business modules.
let moneyFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let currencyCode: string | null = null;

type Numeric = number | string | null | undefined;

/** Use the workspace's currency for every amount. Called when the session loads; unknown codes keep plain numbers. */
export function setCurrency(code: string | null | undefined) {
  if (!code || code === currencyCode) return;
  try {
    moneyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    currencyCode = code;
  } catch {
    // Not a currency Intl knows: keep the plain format.
  }
}

/** The workspace currency code once the session has loaded. */
export const getCurrency = () => currencyCode;

const compactFormat = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat();
const decimalFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

/** 1234.5 -> "₹1,234.50" in the workspace currency (plain "1,234.50" until one is set). */
export const formatMoney = (value: Numeric) => moneyFormat.format(Number(value) || 0);

/** 125000 -> "125K", for tight spaces such as pipeline column totals. */
export const formatCompact = (value: Numeric) => compactFormat.format(Number(value) || 0);

/** 12345 -> "12,345" */
export const formatInteger = (value: Numeric) => integerFormat.format(Number(value) || 0);

/** 2.5 -> "2.5", 3 -> "3" */
export const formatNumber = (value: Numeric) => decimalFormat.format(Number(value) || 0);

/** A local calendar day as YYYY-MM-DD (not UTC), for dates the server stores as plain days. */
export function localDay(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const longDayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** "2026-10-01" -> "Thu, Oct 1" (the string is a calendar day, so read it as local midnight). */
export const formatDay = (value: string | null | undefined) => (value ? dayFormat.format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "");

/** "2026-10-01" -> "1 Oct 2026", for documents (invoices, prescriptions). */
export const formatDate = (value: string | null | undefined) => (value ? longDayFormat.format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "");

/** ISO timestamp -> "9:05 AM" */
export const formatTime = (iso: string | null | undefined) => (iso ? timeFormat.format(new Date(iso)) : "");

/** "14:30" (a clinic-local clock time) -> "2:30 PM" */
export const formatClock = (hhmm: string | null | undefined) => (hhmm ? timeFormat.format(new Date(`2000-01-01T${hhmm}:00`)) : "");
