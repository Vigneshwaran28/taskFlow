"use client";
import { useState } from "react";
import { Building2, Globe, Search, Square, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useMaintenanceOverview, useSetPlatformMaintenance, useSetTenantMaintenance } from "../hooks/useAdmin";
import type { MaintenanceSetting, MaintenanceState } from "../services/adminService";
import { MaintenanceDialog, type MaintenanceTarget } from "./MaintenanceDialog";

const STATE: Record<MaintenanceState, { label: string; tone: Tone }> = {
  off: { label: "Running", tone: "success" },
  ended: { label: "Running (window ended)", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "In maintenance", tone: "warning" },
};

/** One line about a window: when, until when, who gets in. */
function summary(window: MaintenanceSetting) {
  if (window.state === "scheduled") return `Starts ${formatDateTime(window.startsAt)} (${formatTimeAgo(window.startsAt!)})${window.endsAt ? `, ends ${formatDateTime(window.endsAt)}` : ""}`;
  if (window.state === "active") return `${window.endsAt ? `Ends ${formatDateTime(window.endsAt)} (${formatTimeAgo(window.endsAt)})` : "Until you end it"}${window.allowAdmins ? " · owners and admins can sign in" : " · nobody can sign in"}`;
  if (window.state === "ended") return `Last window ended ${formatDateTime(window.endsAt)}`;
  return "No maintenance planned";
}

const isLive = (window: MaintenanceSetting) => window.state === "active" || window.state === "scheduled";

/** Feature component: maintenance windows for the whole platform and for each tenant. */
export function MaintenanceView() {
  const toast = useToast();
  const { data, isPending, error, refetch } = useMaintenanceOverview();
  const setPlatform = useSetPlatformMaintenance();
  const setTenant = useSetTenantMaintenance();
  const [editing, setEditing] = useState<{ key: number; target: MaintenanceTarget; current: MaintenanceSetting } | null>(null);
  const [ending, setEnding] = useState<{ target: MaintenanceTarget; current: MaintenanceSetting } | null>(null);
  const [query, setQuery] = useState("");

  if (isPending) return <LoadingState label="Loading maintenance…" />;
  if (error || !data) return <ErrorState message="Unable to load maintenance windows." onRetry={() => void refetch()} />;

  const open = (target: MaintenanceTarget, current: MaintenanceSetting) => setEditing({ key: Date.now(), target, current });
  const term = query.trim().toLowerCase();
  const tenants = data.tenants.filter(tenant => !term || tenant.name.toLowerCase().includes(term) || tenant.slug.includes(term));
  const inMaintenance = data.tenants.filter(tenant => tenant.maintenance.state === "active").length;
  const scheduled = data.tenants.filter(tenant => tenant.maintenance.state === "scheduled").length;

  function confirmEnd() {
    if (!ending) return;
    const { target, current } = ending;
    const input = { enabled: false, message: current.message, startsAt: null, endsAt: null, allowAdmins: current.allowAdmins };
    const done = {
      onSuccess: () => {
        setEnding(null);
        toast.success(current.state === "scheduled" ? "Scheduled maintenance cancelled" : "Maintenance ended", "Everyone can use the app again.");
      },
      onError: (err: Error) => toast.error("Couldn't change maintenance", err.message),
    };
    if (target.kind === "platform") setPlatform.mutate(input, done);
    else setTenant.mutate({ id: target.id, input }, done);
  }

  const platform = data.platform;
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="platform-maintenance"
        className={cn("flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:flex-row sm:items-center", platform.state === "active" ? "border-amber-500/40 bg-amber-500/10" : "bg-card")}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="rounded-xl bg-accent p-2.5 text-accent-foreground">
            <Globe className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="platform-maintenance" className="flex flex-wrap items-center gap-2 font-semibold">
              Whole platform
              <Badge tone={STATE[platform.state].tone}>{STATE[platform.state].label}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">{summary(platform)}</p>
            {isLive(platform) && platform.message && <p className="mt-1 text-sm">“{platform.message}”</p>}
            <p className="mt-1 text-xs text-muted-foreground">Closes every workspace at once. This console always stays available.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLive(platform) && (
            <Button variant="secondary" onClick={() => setEnding({ target: { kind: "platform" }, current: platform })}>
              <Square className="h-4 w-4" aria-hidden="true" />
              {platform.state === "scheduled" ? "Cancel" : "End now"}
            </Button>
          )}
          <Button variant={platform.state === "active" ? "secondary" : "primary"} onClick={() => open({ kind: "platform" }, platform)}>
            <Wrench className="h-4 w-4" aria-hidden="true" />
            {isLive(platform) ? "Edit" : "Start or schedule"}
          </Button>
        </div>
      </section>

      <section aria-labelledby="tenant-maintenance" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="tenant-maintenance" className="text-lg font-semibold tracking-tight">
              Tenants
            </h2>
            <p className="text-sm text-muted-foreground">
              {inMaintenance} in maintenance · {scheduled} scheduled · {data.tenants.length} total
            </p>
          </div>
          <label className="relative block w-full sm:w-60">
            <span className="sr-only">Filter tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter tenants"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        {tenants.length ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {tenants.map(tenant => {
              const window = tenant.maintenance;
              const target: MaintenanceTarget = { kind: "tenant", id: tenant.id, name: tenant.name };
              return (
                <li key={tenant.id} className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", window.state === "active" && "bg-amber-500/5")}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{tenant.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">/{tenant.slug}</span>
                        <Badge tone={STATE[window.state].tone}>{STATE[window.state].label}</Badge>
                        {tenant.status === "suspended" && <Badge tone="danger">Suspended</Badge>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {summary(window)}
                        {isLive(window) && window.message ? ` · “${window.message}”` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {isLive(window) && (
                      <Button variant="ghost" size="sm" onClick={() => setEnding({ target, current: window })}>
                        {window.state === "scheduled" ? "Cancel" : "End now"}
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => open(target, window)}>
                      <Wrench className="h-4 w-4" aria-hidden="true" />
                      {isLive(window) ? "Edit" : "Maintenance"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={data.tenants.length ? "No tenant matches" : "No tenants yet"} icon={Building2} />
        )}
      </section>

      {editing && <MaintenanceDialog key={editing.key} target={editing.target} current={editing.current} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(ending)}
        title={ending?.current.state === "scheduled" ? "Cancel the scheduled maintenance?" : "End maintenance now?"}
        message={ending?.target.kind === "platform" ? "Every workspace opens again right away." : `${ending?.target.kind === "tenant" ? ending.target.name : "The workspace"} opens again right away.`}
        confirmLabel={ending?.current.state === "scheduled" ? "Cancel maintenance" : "End maintenance"}
        tone="primary"
        pending={setPlatform.isPending || setTenant.isPending}
        onConfirm={confirmEnd}
        onCancel={() => setEnding(null)}
      />
    </div>
  );
}
