// Workspace address rules for new tenants, mirroring the server (routes/admin.js slug, services/tenants.js RESERVED_SLUGS).
import { APP_SECTIONS, RESERVED_SEGMENTS } from "@/lib/tenantPath";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
export const SLUG_MAX = 60;

/** The server also keeps "admin" for itself. */
export const isReservedSlug = (value: string) => RESERVED_SEGMENTS.has(value) || APP_SECTIONS.has(value) || value === "admin";

/** Inline error for a typed address ("" is fine: the server makes one from the name). */
export function slugError(value: string): string | undefined {
  const slug = value.trim().toLowerCase();
  if (!slug) return undefined;
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers, and dashes (not at the start or end).";
  if (isReservedSlug(slug)) return "That address is used by the app itself. Pick another one.";
  return undefined;
}

/** How the server makes an address from the name when none is given (it may add "-2" if taken). */
export function slugFromName(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "tenant";
  return isReservedSlug(base) ? `${base}-co` : base;
}
