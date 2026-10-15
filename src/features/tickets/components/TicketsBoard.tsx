"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCan } from "@/features/auth";
import type { TicketQuery, TicketScope } from "../services/ticketService";
import { TICKET_SCOPES } from "../utils/ticketMeta";
import { HelpdeskStats } from "./HelpdeskStats";
import { TicketFilters, type TicketFilterName } from "./TicketFilters";
import { TicketQueue } from "./TicketQueue";

const EMPTY: Record<TicketScope, { title: string; message: string }> = {
  assigned: { title: "Nothing assigned to you", message: "Tickets someone assigns to you appear here." },
  unassigned: { title: "Every ticket has an owner", message: "New tickets without an assignee appear here." },
  team: { title: "Your teams' queues are clear", message: "Tickets routed to teams you belong to appear here." },
  all: { title: "No tickets yet", message: "Tickets raised by anyone in the workspace appear here." },
  mine: { title: "You haven't raised any tickets", message: "Need help with IT, access, HR, or facilities? Raise a ticket." },
};

/** The board's state, read from the URL. */
export interface TicketsBoardState {
  scope?: string;
  status: string;
  priority: string;
  category: string;
  search: string;
  sort: string;
  page: number;
  breached: boolean;
}

/** URL parameters the board changes. */
export type TicketParamName = TicketFilterName | "scope" | "breached";

export interface TicketsBoardProps {
  state: TicketsBoardState;
  debouncedSearch: string;
  onChange: (name: TicketParamName, value: string) => void;
  onPageChange: (page: number) => void;
  onNewTicket: () => void;
}

/** Feature component: queue tabs, filters, and the ticket list for the signed-in user's role. */
export function TicketsBoard({ state, debouncedSearch, onChange, onPageChange, onNewTicket }: TicketsBoardProps) {
  const staff = useCan("helpdesk.work");
  const scopes = (Object.entries(TICKET_SCOPES) as [TicketScope, (typeof TICKET_SCOPES)[TicketScope]][]).filter(([, meta]) => staff || !meta.staffOnly);
  const allowed = scopes.map(([key]) => key);
  const scope: TicketScope = allowed.find(key => key === state.scope) ?? (staff ? "all" : "mine");

  const query: TicketQuery = {
    scope,
    status: state.breached ? "active" : state.status,
    priority: state.priority || undefined,
    category: state.category || undefined,
    breached: state.breached || undefined,
    search: debouncedSearch || undefined,
    sort: state.sort,
    page: state.page,
    pageSize: 20,
  };
  const isFiltered = Boolean(debouncedSearch || state.priority || state.category || state.breached || state.status !== "active");

  return (
    <div className="flex flex-col gap-6">
      <HelpdeskStats />

      {scopes.length > 1 && (
        <nav aria-label="Ticket queues" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b no-scrollbar">
          {scopes.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              aria-current={key === scope ? "page" : undefined}
              onClick={() => onChange("scope", key)}
              className={cn(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                key === scope ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <meta.icon className="h-4 w-4" aria-hidden="true" />
              {meta.label}
            </button>
          ))}
        </nav>
      )}

      <TicketFilters values={{ search: state.search, status: state.status, priority: state.priority, category: state.category, sort: state.sort }} onChange={onChange} />
      {state.breached && (
        <p className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Showing only tickets past their resolution target.
          <button type="button" onClick={() => onChange("breached", "")} className="font-medium underline-offset-4 hover:underline">
            Show all
          </button>
        </p>
      )}

      <TicketQueue
        query={query}
        isFiltered={isFiltered}
        emptyTitle={EMPTY[scope].title}
        emptyMessage={EMPTY[scope].message}
        emptyAction={
          scope === "mine" && (
            <Button onClick={onNewTicket}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New ticket
            </Button>
          )
        }
        onPageChange={onPageChange}
      />
    </div>
  );
}
