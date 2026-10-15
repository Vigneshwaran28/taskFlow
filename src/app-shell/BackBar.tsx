"use client";
// "← Back to …" above every page except Home: one level up the page hierarchy (not browser history,
// so it always goes somewhere sensible, even from a shared link).
import Link from "@/components/navigation/Link";
import { usePathname } from "@/lib/navigation";
import { ArrowLeft } from "lucide-react";

const LABELS: Record<string, string> = {
  "/": "Home",
  "/lists": "Lists",
  "/tickets": "Help desk",
  "/inventory": "Inventory",
  "/billing": "Billing",
  "/logistics": "Logistics",
  "/messages": "Messages",
  "/clinic": "Clinic",
  "/clinic?tab=patients": "Patients",
  "/logistics?tab=shipments": "Shipments",
  "/sales": "Sales",
  "/attendance": "Attendance",
  "/settings": "Settings",
};

/** Section paths that have no page of their own: where their children go back to instead. */
const SECTION_PARENTS: Record<string, string> = {
  "/clinic/patients": "/clinic?tab=patients",
  "/tasks": "/",
};

/** Detail pages that open from a specific tab of their section go back to that tab. */
const DETAIL_PARENTS: Record<string, string> = {
  "/logistics": "/logistics?tab=shipments",
};

/** Pages that render their own, more specific back link (a billing document knows whether it is a quote or an invoice). */
const OWN_BACK_LINK = [/^\/billing\/[^/]+$/];

export function parentOf(pathname: string) {
  if (pathname === "/" || !pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  const parent = `/${segments.slice(0, -1).join("/")}`;
  return SECTION_PARENTS[parent] ?? (segments.length === 2 ? DETAIL_PARENTS[parent] : undefined) ?? parent;
}

export function BackBar() {
  const pathname = usePathname();
  const parent = parentOf(pathname);
  if (!parent || OWN_BACK_LINK.some(pattern => pattern.test(pathname))) return null;
  const label = LABELS[parent] ?? "previous page";
  return (
    <nav aria-label="Back" className="no-print -mt-3 mb-4">
      <Link
        href={parent}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {label}
      </Link>
    </nav>
  );
}
