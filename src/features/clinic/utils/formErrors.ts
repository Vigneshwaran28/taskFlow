// Shared client-side checks and error feedback for clinic forms.
import type { ToastApi } from "@/components/shared/Toaster";
import { ApiError } from "@/lib/apiClient";

/** A toast for conflicts (409) and rejected input (422); the form shows the field details. */
export function toastFormError(toast: ToastApi, error: unknown) {
  if (!(error instanceof ApiError)) return;
  if (error.status === 409) toast.error("Couldn't save", error.message);
  else if (error.status === 422) toast.error("Please check the form", Object.values(error.fieldErrors)[0] ?? error.message);
}

/** Digits, spaces and + - ( ) . only, with at least 6 digits (the server accepts the same characters). */
export const PHONE_PATTERN = /^[0-9+()\-.\s]*$/;
export function phoneProblem(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (!PHONE_PATTERN.test(text)) return "Use digits, spaces, and + - ( ) only.";
  if (text.replace(/\D/g, "").length < 6) return "Enter a full phone number.";
  if (text.length > 40) return "At most 40 characters.";
  return null;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function emailProblem(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  return EMAIL_PATTERN.test(text) ? null : "Enter a valid email address.";
}
