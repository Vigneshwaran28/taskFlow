// Client-side checks that mirror the zod schemas in server/src/routes/logistics.js,
// so obviously invalid forms are caught before they reach the API.
export type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{6,40}$/;

/** An optional email: empty is fine. */
export const emailError = (value: string) => (value.trim() && !EMAIL.test(value.trim()) ? "Enter a valid email address." : null);

/** An optional phone number: digits, spaces, + ( ) - . and at least 6 digits. */
export function phoneError(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (!PHONE.test(text) || text.replace(/\D/g, "").length < 6) return "Enter a valid phone number.";
  return null;
}

/** An optional amount of money: a number >= 0 with at most 2 decimals. */
export function moneyError(value: string) {
  const text = value.trim();
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return "Enter a number.";
  if (amount < 0) return "Can't be negative.";
  if (amount > 1e12) return "That amount is too large.";
  if (!/^\d*(\.\d{0,2})?$/.test(text)) return "Use at most 2 decimal places.";
  return null;
}

/** An optional positive number (weight, capacity), up to 1,000,000. */
export function positiveError(value: string, message: string) {
  const text = value.trim();
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return "Enter a number.";
  if (amount <= 0) return message;
  if (amount > 1e6) return "That's too large.";
  return null;
}

/** A required whole number from 1 to 10,000. */
export function packagesError(value: string) {
  const text = value.trim();
  if (!text) return "At least 1 package.";
  const count = Number(text);
  if (!Number.isInteger(count)) return "Use a whole number.";
  if (count < 1) return "At least 1 package.";
  if (count > 10000) return "At most 10,000 packages.";
  return null;
}

/** A datetime-local value must not be in the future (the server allows 5 minutes of clock drift). */
export function pastTimeError(value: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Enter a valid date and time.";
  return time > Date.now() + 5 * 60_000 ? "That time is in the future." : null;
}

/** Drops empty entries so `Object.keys(errors).length` means "has errors". */
export function compact(errors: Record<string, string | null | undefined>): Errors {
  return Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

/** Removes the errors for the fields a patch touches (clears an error once the user edits that field). */
export function without(errors: Errors, keys: string[]): Errors {
  if (!keys.some(key => key in errors)) return errors;
  const next = { ...errors };
  keys.forEach(key => delete next[key]);
  return next;
}

export interface ShipmentValidationValues {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  packages: string;
  weightKg: string;
  declaredValue: string;
  shippingCost: string;
  codAmount: string;
  shipDate: string;
  expectedOn: string;
}

export function validateShipment(values: ShipmentValidationValues): Errors {
  // A linked sales order fills in the recipient from its customer on the server.
  const linked = Boolean(values.orderId);
  return compact({
    recipientName: !linked && !values.recipientName.trim() ? "Who is it going to?" : null,
    recipientAddress: !linked && !values.recipientAddress.trim() ? "Add the delivery address." : null,
    recipientPhone: phoneError(values.recipientPhone),
    packages: packagesError(values.packages),
    weightKg: positiveError(values.weightKg, "Enter a weight above zero."),
    declaredValue: moneyError(values.declaredValue),
    shippingCost: moneyError(values.shippingCost),
    codAmount: moneyError(values.codAmount),
    expectedOn: values.shipDate && values.expectedOn && values.expectedOn < values.shipDate ? "The expected date can't be before the ship date." : null,
  });
}
