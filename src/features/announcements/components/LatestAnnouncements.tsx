"use client";
import Link from "@/components/navigation/Link";
import { Pin } from "lucide-react";
import { formatTimeAgo } from "@/lib/dates";
import { useAnnouncements } from "../hooks/useAnnouncements";

/** Feature component for the home page: the three newest announcements addressed to you. Quiet while loading. */
export function LatestAnnouncements() {
  const { data } = useAnnouncements();
  const items = data?.items.slice(0, 3) ?? [];
  if (!data) return null;
  if (!items.length) return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No announcements for you yet.</p>;
  return (
    <ul className="grid gap-3 lg:grid-cols-3">
      {items.map(item => (
        <li key={item.id}>
          <Link
            href="/announcements"
            className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {item.pinned && <Pin className="h-3 w-3" aria-label="Pinned" />}
              {item.author?.name ?? "Former colleague"} · {formatTimeAgo(item.createdAt)}
              {!item.isRead && <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">New</span>}
            </span>
            <span className="font-medium">{item.title}</span>
            <span className="line-clamp-2 text-sm text-muted-foreground">{item.body}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
