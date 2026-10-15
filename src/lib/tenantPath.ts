// Workspace-scoped URLs: every signed-in page lives under its workspace's address, e.g. /acme/billing/12.
// Code keeps writing app paths ("/billing/12"); the Link and router wrappers add the workspace prefix.

/** Top-level paths that are not workspace addresses (the server refuses these as tenant slugs too). */
export const RESERVED_SEGMENTS = new Set([
  "login",
  "register",
  "setup",
  "bunny",
  "track",
  "q",
  "w",
  "reset-password",
  "api",
  "_next",
  "favicon.svg",
]);

/** First segments of app pages (old un-prefixed links to these are redirected into the workspace). */
export const APP_SECTIONS = new Set([
  "tasks",
  "lists",
  "calendar",
  "tickets",
  "teams",
  "people",
  "messages",
  "announcements",
  "inventory",
  "sales",
  "billing",
  "logistics",
  "attendance",
  "expenses",
  "clinic",
  "clinic-display",
  "notes",
  "users",
  "roles",
  "audit",
  "settings",
  "admin",
]);

const firstSegment = (path: string) => path.split(/[/?#]/)[1] ?? "";

/** Workspace addresses as the server accepts them (server/src/routes/publicWorkspace.js SLUG). */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export const isWorkspaceSlug = (value: string) => SLUG.test(value) && !RESERVED_SEGMENTS.has(value) && !APP_SECTIONS.has(value);

/**
 * The workspace of the page this browser tab shows (/acme/... -> "acme"), or null outside workspace pages.
 * Every API request carries it, so each workspace open in this browser uses its own sign-in.
 */
export function currentWorkspace(): string | null {
  if (typeof window === "undefined") return null;
  const first = decodeURIComponent(firstSegment(window.location.pathname)).toLowerCase();
  return isWorkspaceSlug(first) ? first : null;
}

/** "/billing/12" -> "/acme/billing/12"; public, already-prefixed, and external URLs are left alone. */
export function withTenant(slug: string | null | undefined, href: string) {
  if (!slug || !href.startsWith("/") || href.startsWith("//")) return href;
  const first = firstSegment(href);
  if (first === slug || RESERVED_SEGMENTS.has(first)) return href;
  if (href === "/") return `/${slug}`;
  if (href.startsWith("/?") || href.startsWith("/#")) return `/${slug}${href.slice(1)}`;
  return `/${slug}${href}`;
}

/** "/acme/billing/12" -> "/billing/12" (and "/acme" -> "/"). */
export function stripTenant(slug: string | null | undefined, pathname: string) {
  if (!slug) return pathname;
  if (pathname === `/${slug}`) return "/";
  return pathname.startsWith(`/${slug}/`) ? pathname.slice(slug.length + 1) : pathname;
}

/** The workspace's own sign-in page. */
export const tenantLoginPath = (slug: string) => `/${slug}/login`;
