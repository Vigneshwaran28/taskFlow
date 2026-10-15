// Client-side validation helpers for the billing forms. Rules mirror server/src/routes/billing.js (zod schemas).
import { useState } from "react";

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with the usual separators (+, spaces, dashes, dots, brackets, "x" for extensions), at least 5 digits. */
export const isPhone = (value: string) => /^\+?[\d\s().\-/x]+$/i.test(value) && (value.match(/\d/g)?.length ?? 0) >= 5;
export const MAX_MONEY = 1e12;

/** At most two decimal places ("12", "12.5", "12.50"). */
export const hasAtMostTwoDecimals = (value: string) => /^\d*(\.\d{0,2})?$/.test(value.trim());

/** Contact fields shared by one-off bill-to and new customers; returns errors keyed by field. */
export function contactErrors(values: { name: string; email: string; phone: string }, { nameMessage = "Name is required." } = {}) {
  const found: Record<string, string> = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  if (!name) found.name = nameMessage;
  else if (name.length > 160) found.name = "Keep the name under 160 characters.";
  if (email && !EMAIL.test(email)) found.email = "Enter a valid email address.";
  if (phone.length > 40) found.phone = "Keep the phone number under 40 characters.";
  else if (phone && !isPhone(phone)) found.phone = "Enter a valid phone number.";
  return found;
}

/**
 * Client errors plus the server's 422 field errors. A field's error is cleared as soon as it's edited,
 * and the server's errors show again after the next submit.
 */
export function useFormErrors(serverErrors: Record<string, string>) {
  const [client, setClient] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const errorOf = (name: string): string | null => client[name] || (!dismissed.has(name) && serverErrors[name]) || null;

  function clear(...names: string[]) {
    if (names.some(name => client[name])) {
      setClient(current => {
        const next = { ...current };
        for (const name of names) delete next[name];
        return next;
      });
    }
    if (names.some(name => !dismissed.has(name))) setDismissed(current => new Set([...current, ...names]));
  }

  /** Replaces the client errors (call on submit); returns true when there are none. */
  function report(found: Record<string, string>) {
    setClient(found);
    setDismissed(new Set());
    return Object.keys(found).length === 0;
  }

  return { errorOf, clear, report };
}
