"use client";
// Feature component: messages from the provider. Unread warning and critical items show as dismissible banners at
// the top of every page; a small "From your provider" button opens the full list. Mounted once in the app shell.
import { useState } from "react";
import { AlertTriangle, Info, Megaphone, OctagonAlert, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useDismissNotice, useMarkNoticeRead, useProviderInbox } from "../hooks/useBroadcasts";
import type { ProviderNotice, SubscriptionSummary } from "../services/broadcastService";
import { KIND_LABEL, SEVERITY_LABEL, SEVERITY_TONE, subscriptionLine, subscriptionStatus } from "../utils/subscriptionText";

const BANNER_TONES = {
  warning: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  critical: "border-red-300 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
} as const;

const MAX_BANNERS = 3;

function NoticeIcon({ notice, className }: { notice: ProviderNotice; className?: string }) {
  const Icon = notice.kind === "maintenance" ? Wrench : notice.severity === "critical" ? OctagonAlert : notice.severity === "warning" ? AlertTriangle : Info;
  return <Icon className={cn("h-5 w-5 shrink-0", className)} aria-hidden="true" />;
}

export function ProviderNotices() {
  const { data } = useProviderInbox();
  const dismiss = useDismissNotice();
  const markRead = useMarkNoticeRead();
  const [open, setOpen] = useState(false);
  if (!data?.items.length) return null;

  const banners = data.items.filter(item => item.severity !== "info" && !item.isRead && !item.dismissed).slice(0, MAX_BANNERS);

  function openPanel() {
    setOpen(true);
    for (const item of data?.items ?? []) if (!item.isRead) markRead.mutate(item.id);
  }

  return (
    <div className="mb-4 flex flex-col gap-2 print:hidden" data-testid="provider-notices">
      {banners.map(notice => {
        const severity = notice.severity === "critical" ? "critical" : "warning";
        return (
          <div
            key={notice.id}
            role={severity === "critical" ? "alert" : "status"}
            data-testid="provider-banner"
            className={cn("flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 shadow-sm", BANNER_TONES[severity])}
          >
            <NoticeIcon notice={notice} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold wrap-break-word">{notice.title}</p>
              <p className="line-clamp-2 text-sm opacity-90 wrap-break-word">{notice.body}</p>
              {notice.kind === "subscription" && data.subscription?.endsOn && <p className="mt-1 text-xs font-medium">{subscriptionLine(data.subscription)}</p>}
              <button type="button" onClick={openPanel} className="mt-1 text-xs font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">
                View all messages from your provider
              </button>
            </div>
            <button
              type="button"
              onClick={() => dismiss.mutate(notice.id)}
              aria-label={`Dismiss: ${notice.title}`}
              title="Dismiss"
              className="-mr-1 shrink-0 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openPanel}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
          From your provider
          {data.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{data.unread} new</span>}
        </button>
      </div>

      <ProviderPanel open={open} onClose={() => setOpen(false)} items={data.items} subscription={data.subscription} />
    </div>
  );
}

function ProviderPanel({ open, onClose, items, subscription }: { open: boolean; onClose: () => void; items: ProviderNotice[]; subscription: SubscriptionSummary | null }) {
  const status = subscription?.endsOn ? subscriptionStatus(subscription) : null;
  return (
    <Dialog open={open} onClose={onClose} size="lg" title="From your provider" description="Announcements and notices from the company that runs your workspace.">
      <div className="flex flex-col gap-4">
        {subscription?.endsOn && status && (
          <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              Subscription{subscription.plan ? `: ${subscription.plan}` : ""}
              <Badge tone={status.tone}>{status.label}</Badge>
            </p>
            <p className="text-muted-foreground">{subscriptionLine(subscription)}</p>
          </div>
        )}
        <ul className="flex flex-col divide-y" aria-label="Messages">
          {items.map(notice => (
            <li key={notice.id} className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0">
              <NoticeIcon notice={notice} className="mt-0.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium wrap-break-word">{notice.title}</span>
                  <Badge tone={SEVERITY_TONE[notice.severity]}>{SEVERITY_LABEL[notice.severity]}</Badge>
                  {notice.kind !== "announcement" && <Badge>{KIND_LABEL[notice.kind]}</Badge>}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground wrap-break-word">{notice.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <time dateTime={notice.publishAt} title={formatDateTime(notice.publishAt)}>
                    {formatTimeAgo(notice.publishAt)}
                  </time>
                  {notice.expiresAt && <> · shown until {formatDateTime(notice.expiresAt)}</>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
