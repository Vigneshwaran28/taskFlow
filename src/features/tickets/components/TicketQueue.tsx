"use client";
import type { ReactNode } from "react";
import { Inbox, SearchX } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { useTickets } from "../hooks/useTickets";
import type { TicketQuery } from "../services/ticketService";
import { TicketTable } from "./TicketTable";

export interface TicketQueueProps {
  query: TicketQuery;
  /** Search or filters are applied (changes the empty message) */
  isFiltered: boolean;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction?: ReactNode;
  onPageChange: (page: number) => void;
}

/** Feature component: loads one page of a ticket queue and renders its states. */
export function TicketQueue({ query, isFiltered, emptyTitle, emptyMessage, emptyAction, onPageChange }: TicketQueueProps) {
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useTickets(query);

  if (isPending) return <LoadingState label="Loading tickets…" />;
  if (error || !data) return <ErrorState message="Unable to load tickets." onRetry={() => void refetch()} />;
  if (!data.items.length) {
    return isFiltered ? (
      <EmptyState title="No tickets match" message="Try a different search or clear the filters." icon={SearchX} />
    ) : (
      <EmptyState title={emptyTitle} message={emptyMessage} icon={Inbox} action={emptyAction} />
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={isFetching}>
      <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
        <TicketTable tickets={data.items} showRequester={query.scope !== "mine"} />
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={onPageChange} disabled={isFetching} />
    </div>
  );
}
