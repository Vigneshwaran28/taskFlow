import { BarChart3, Building2, Database, HardDrive, KeyRound, LayoutDashboard, Megaphone, ScrollText, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";

/** needsTenant: the view shows one tenant's data, so it asks for a tenant first. */
export const ADMIN_VIEWS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, needsTenant: false },
  { id: "tenants", label: "Tenants", icon: Building2, needsTenant: false },
  { id: "announcements", label: "Announcements", icon: Megaphone, needsTenant: false },
  { id: "maintenance", label: "Maintenance", icon: Wrench, needsTenant: false },
  { id: "databases", label: "Databases", icon: HardDrive, needsTenant: false },
  { id: "users", label: "Users", icon: Users, needsTenant: true },
  { id: "roles", label: "Roles", icon: KeyRound, needsTenant: true },
  { id: "data", label: "Data", icon: Database, needsTenant: true },
  { id: "insights", label: "Insights", icon: BarChart3, needsTenant: false },
  { id: "audit", label: "Audit log", icon: ScrollText, needsTenant: false },
] as const;

export type AdminView = (typeof ADMIN_VIEWS)[number]["id"];

export const isAdminView = (value: string | null): value is AdminView => ADMIN_VIEWS.some(item => item.id === value);

export const viewNeedsTenant = (view: AdminView) => ADMIN_VIEWS.find(item => item.id === view)?.needsTenant ?? false;

/** Presentational: switches between the console's views. Tenant views are marked while no tenant is chosen. */
export function AdminNav({ view, hasTenant, onChange }: { view: AdminView; hasTenant: boolean; onChange: (view: AdminView) => void }) {
  return (
    <>
      {/* Phones: one menu instead of ten tabs scrolling out of sight. */}
      <label className="flex flex-col gap-1.5 sm:hidden">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View</span>
        <select
          value={view}
          onChange={event => onChange(event.target.value as AdminView)}
          className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ADMIN_VIEWS.map(({ id, label, needsTenant }) => (
            <option key={id} value={id}>
              {label}
              {needsTenant && !hasTenant ? " (choose a tenant)" : ""}
            </option>
          ))}
        </select>
      </label>
    <nav aria-label="Console views" className="hidden min-w-0 max-w-full rounded-xl border bg-card p-1 sm:block">
      {/* Tablets and up: every view visible, wrapping onto a second row when the screen is narrow. */}
      <ul className="flex flex-wrap gap-1">
        {ADMIN_VIEWS.map(({ id, label, icon: Icon, needsTenant }) => {
          const active = id === view;
          const waiting = needsTenant && !hasTenant;
          return (
            <li key={id} className="flex-auto">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(id)}
                title={waiting ? `${label}: choose a tenant first` : undefined}
                className={cn(
                  "flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  waiting && !active && "opacity-60"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}
