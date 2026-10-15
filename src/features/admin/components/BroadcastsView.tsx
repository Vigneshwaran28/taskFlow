"use client";
// Feature component: the console's announcements to tenants. Sent, scheduled, and ended broadcasts with who they
// reach and how many have read them; compose, edit before publish, duplicate, retract. Automatic subscription
// notices can be shown too.
import { useState } from "react";
import { CalendarClock, Copy, Eye, Megaphone, Pencil, Plus, Undo2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { useBroadcasts, useRetractBroadcast } from "../hooks/useAdmin";
import type { Broadcast, BroadcastSeverity, BroadcastState } from "../services/adminService";
import { BroadcastComposeDialog, type BroadcastComposeDialogProps } from "./BroadcastComposeDialog";

type Filter = "all" | "scheduled" | "live" | "ended";

const STATE_META: Record<BroadcastState, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  live: { label: "Live", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  retracted: { label: "Retracted", tone: "neutral" },
};
const SEVERITY_META: Record<BroadcastSeverity, { label: string; tone: Tone }> = {
  info: { label: "Info", tone: "info" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
};

const inFilter = (item: Broadcast, filter: Filter) =>
  filter === "all" || (filter === "ended" ? item.state === "expired" || item.state === "retracted" : item.state === filter);

/** "All tenants · admins only", "3 tenants · everyone", "2 people" */
export function audienceSummary(item: Broadcast): string {
  const who = item.recipients === "admins" ? "admins only" : "everyone";
  if (item.audience === "all") return `All tenants · ${who}`;
  if (item.audience === "tenants") {
    const names = item.targets.map(target => target.tenantName ?? `#${target.tenantId}`);
    return `${names.length <= 2 ? names.join(", ") : `${names.length} tenants`} · ${who}`;
  }
  const names = item.targets.map(target => target.userName ?? `#${target.userId}`);
  return names.length <= 2 ? names.join(", ") : `${names.length} people`;
}

export function BroadcastsView() {
  const toast = useToast();
  const { data, isPending, error, refetch } = useBroadcasts();
  const retract = useRetractBroadcast();
  const [filter, setFilter] = useState<Filter>("all");
  const [compose, setCompose] = useState<{ key: number; source: BroadcastComposeDialogProps["source"] } | null>(null);
  const [retracting, setRetracting] = useState<Broadcast | null>(null);

  if (isPending) return <LoadingState label="Loading announcements…" />;
  if (error) return <ErrorState message="Unable to load announcements." onRetry={() => void refetch()} />;

  const open = (source: BroadcastComposeDialogProps["source"] = null) => setCompose(current => ({ key: (current?.key ?? 0) + 1, source }));
  const items = data.filter(item => inFilter(item, filter));
  const count = (value: Filter) => data.filter(item => inFilter(item, value)).length;
  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "scheduled", label: "Scheduled" },
    { id: "live", label: "Live" },
    { id: "ended", label: "Ended" },
  ];

  function confirmRetract(item: Broadcast) {
    retract.mutate(item.id, {
      onSuccess: () => {
        setRetracting(null);
        toast.success("Announcement retracted", "Nobody sees it any more.");
      },
      onError: err => {
        setRetracting(null);
        toast.error("Couldn't retract it", err.message);
      },
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show announcements" className="flex w-full min-w-0 overflow-x-auto no-scrollbar rounded-lg border bg-card p-0.5 sm:w-max">
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
              <span className={cn("tabular-nums", filter === item.id ? "opacity-80" : "text-muted-foreground")}>{count(item.id)}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => open()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New announcement
        </Button>
      </div>

      {!data.length ? (
        <EmptyState
          title="No announcements yet"
          message="Tell every tenant, chosen tenants, or individual people about maintenance, new features, or anything else. Subscription reminders are sent automatically."
          icon={Megaphone}
          action={<Button onClick={() => open()}>New announcement</Button>}
        />
      ) : !items.length ? (
        <EmptyState title={`No ${filter} announcements`} icon={Megaphone} />
      ) : (
        <ul className="flex flex-col gap-3" data-testid="broadcast-list">
          {items.map(item => {
            const state = STATE_META[item.state];
            const severity = SEVERITY_META[item.severity];
            const active = item.state === "live" || item.state === "scheduled";
            return (
              <li key={item.id} className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4", !active && "opacity-80")}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 font-semibold wrap-break-word">{item.title}</span>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      <Badge tone={severity.tone}>{severity.label}</Badge>
                      {item.kind !== "announcement" && <Badge>{item.kind === "maintenance" ? "Maintenance" : "Subscription"}</Badge>}
                    </p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground wrap-break-word">{item.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {item.state === "scheduled" && (
                      <Button variant="ghost" size="sm" onClick={() => open({ broadcast: item, mode: "edit" })} aria-label={`Edit ${item.title}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => open({ broadcast: item, mode: "duplicate" })} aria-label={`Duplicate ${item.title}`}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Duplicate
                    </Button>
                    {active && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setRetracting(item)} aria-label={`Retract ${item.title}`}>
                        <Undo2 className="h-4 w-4" aria-hidden="true" />
                        Retract
                      </Button>
                    )}
                  </div>
                </div>
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="sr-only">Audience:</span>
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {audienceSummary(item)}
                      {item.recipientCount != null && ` (${item.recipientCount} ${item.recipientCount === 1 ? "person" : "people"})`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="sr-only">Published:</span>
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {item.state === "scheduled" ? "Publishes" : "Published"} {formatDateTime(item.publishAt)}
                      {item.expiresAt && ` · until ${formatDateTime(item.expiresAt)}`}
                      {item.retractedAt && ` · retracted ${formatDateTime(item.retractedAt)}`}
                      {item.createdBy && ` · by ${item.createdBy}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="sr-only">Reads:</span>
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {item.reads} read{item.dismissed ? ` · ${item.dismissed} dismissed` : ""}
                    </span>
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {compose && <BroadcastComposeDialog key={compose.key} source={compose.source} onClose={() => setCompose(null)} />}
      <ConfirmDialog
        open={Boolean(retracting)}
        title={`Retract “${retracting?.title ?? ""}”?`}
        message="It disappears from every recipient's workspace (or never goes out, if it is scheduled). Read counts are kept."
        confirmLabel="Retract"
        pending={retract.isPending}
        onConfirm={() => retracting && confirmRetract(retracting)}
        onCancel={() => setRetracting(null)}
      />
    </div>
  );
}
