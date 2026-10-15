"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { Eye, Megaphone, Pencil, Pin, Plus, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useAnnouncements, useDeleteAnnouncement, useMarkAnnouncementsRead, useUpdateAnnouncement } from "../hooks/useAnnouncements";
import type { Announcement } from "../services/announcementService";
import { AnnouncementDialog } from "./AnnouncementDialog";

/** "Everyone" or "Roles: Nurses, Doctors" (a deleted role leaves the list shorter). */
const audienceLabel = (item: Announcement) => (item.audience === "roles" ? `Roles: ${item.roles.map(role => role.name).join(", ") || "none left"}` : "Everyone");

/** Feature component: the announcement feed. Opening it marks what's shown as read. */
export function AnnouncementFeed() {
  const toast = useToast();
  const { data, isPending, error, refetch } = useAnnouncements();
  const markRead = useMarkAnnouncementsRead();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();
  const [dialog, setDialog] = useState<{ key: number; announcement: Announcement | null } | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const unreadKey = (data?.items ?? [])
    .filter(item => !item.isRead)
    .map(item => item.id)
    .join(",");

  // Seeing the feed counts as reading it (server state; runs when new unread items arrive).
  const markShownAsRead = useEffectEvent((ids: number[]) => {
    if (!markRead.isPending) markRead.mutate(ids);
  });
  useEffect(() => {
    if (unreadKey) markShownAsRead(unreadKey.split(",").map(Number));
  }, [unreadKey]);

  if (isPending) return <LoadingState label="Loading announcements…" />;
  if (error || !data) return <ErrorState message="Unable to load announcements." onRetry={() => void refetch()} />;

  const open = (announcement: Announcement | null) => setDialog(current => ({ key: (current?.key ?? 0) + 1, announcement }));
  const newButton = data.canPost && (
    <Button onClick={() => open(null)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      New announcement
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {newButton && <div className="flex justify-end">{newButton}</div>}
      {!data.items.length ? (
        <EmptyState title="No announcements yet" message={data.canPost ? "Share news, policies, and reminders with everyone." : "Company news and notices appear here."} icon={Megaphone} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map(item => (
            <li key={item.id}>
              <article className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5", item.pinned && "border-primary/50")} aria-labelledby={`announcement-${item.id}`}>
                <header className="flex items-start gap-3">
                  <Avatar name={item.author?.name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`announcement-${item.id}`} className="font-semibold text-balance">
                        {item.title}
                      </h2>
                      {item.pinned && (
                        <Badge tone="primary">
                          <Pin className="h-3 w-3" aria-hidden="true" />
                          Pinned
                        </Badge>
                      )}
                      {!item.isRead && <Badge tone="info">New</Badge>}
                      {item.canEdit && (
                        <Badge tone="neutral">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          <span className="sr-only">Audience: </span>
                          {audienceLabel(item)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.author?.name ?? "Former colleague"}
                      {item.author?.jobTitle ? ` · ${item.author.jobTitle}` : ""} ·{" "}
                      <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                        {formatTimeAgo(item.createdAt)}
                      </time>
                    </p>
                  </div>
                  {item.canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          update.mutate(
                            { id: item.id, changes: { pinned: !item.pinned } },
                            { onSuccess: () => toast.success(item.pinned ? "Unpinned" : "Pinned to the top"), onError: err => toast.error("Couldn't update", err.message) }
                          )
                        }
                        disabled={update.isPending}
                        aria-label={item.pinned ? "Unpin" : "Pin"}
                        title={item.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className={cn("h-4 w-4", item.pinned && "fill-current")} aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => open(item)} aria-label="Edit announcement">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(item)} aria-label="Delete announcement">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </header>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>
                {item.readCount != null && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Read by {item.readCount} of {item.audienceSize ?? Math.max(data.audience - 1, 0)}
                    {item.audience === "roles" ? " in the audience" : ""}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
      {dialog && <AnnouncementDialog key={dialog.key} announcement={dialog.announcement} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this announcement?"
        message={`"${deleting?.title ?? ""}" will be removed for everyone who can see it.`}
        pending={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.success("Announcement deleted");
            },
            onError: err => toast.error("Couldn't delete", err.message),
          });
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
