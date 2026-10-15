// Client-side validation helpers for the sales forms. Rules mirror server/src/routes/sales.js (zod schemas).
import { useState } from "react";

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with the usual separators (+, spaces, dashes, dots, brackets, "x" for extensions), at least 5 digits. */
export const PHONE = /^\+?[\d\s().\-/x]+$/i;
export const isPhone = (value: string) => PHONE.test(value) && (value.match(/\d/g)?.length ?? 0) >= 5;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_MONEY = 1e12;

/** At most two decimal places ("12", "12.5", "12.50"). */
export const hasAtMostTwoDecimals = (value: string) => /^\d*(\.\d{0,2})?$/.test(value.trim());

/** Error message for an optional money input, or null when it's fine. */
export function moneyError(value: string, { required = false, label = "Amount" } = {}): string | null {
  const text = value.trim();
  if (!text) return required ? `${label} is required.` : null;
  const number = Number(text);
  if (Number.isNaN(number)) return `Enter a number.`;
  if (number < 0) return "Can't be negative.";
  if (number > MAX_MONEY) return "That amount is too large.";
  if (!hasAtMostTwoDecimals(text)) return "Use at most 2 decimal places.";
  return null;
}

/**
 * Client errors plus the server's 422 field errors. A field's error is cleared as soon as it's edited,
 * and the server's errors show again after the next submit.
 */
export function useFormErrors(serverErrors: Record<string, string>) {
  const [client, setClient] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const errorOf = (name: string): string | null => client[name] || (!dismissed.has(name) && serverErrors[name]) || null;

  function clear(name: string) {
    if (client[name]) {
      setClient(current => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
    if (!dismissed.has(name)) setDismissed(current => new Set(current).add(name));
  }

  /** Replaces the client errors (call on submit); returns true when there are none. */
  function report(found: Record<string, string>) {
    setClient(found);
    setDismissed(new Set());
    return Object.keys(found).length === 0;
  }

  return { errorOf, clear, report };
}
