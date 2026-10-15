import { apiClient } from "@/lib/apiClient";
import type { Page, Priority } from "@/types/session";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = Priority;
export type TicketScope = "mine" | "assigned" | "unassigned" | "team" | "all";
export type TicketSort = "updated" | "created" | "priority" | "due";

export interface Ticket {
  id: number;
  /** e.g. "TKT-0042" */
  key: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requester: { id: number; name: string; email: string; jobTitle: string | null; avatarUrl?: string | null };
  assignee: { id: number; name: string; email: string; avatarUrl?: string | null } | null;
  team: { id: number; name: string; color: string } | null;
  responseDueAt: string;
  resolutionDueAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  /** 1 to 5 */
  satisfaction: number | null;
  satisfactionComment: string | null;
  /** The viewer is staff or the assignee, so may edit, assign, and add internal notes */
  canWork: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: number;
  body: string;
  /** Staff-only note */
  isInternal: boolean;
  /** null when the author was deleted */
  author: { id: number; name: string; isStaff: boolean } | null;
  createdAt: string;
}

export interface TicketEvent {
  id: number;
  /** created, status, priority, category, assignee, team, subject, rating */
  type: string;
  from: string | null;
  to: string | null;
  actor: { id: number; name: string } | null;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  comments: TicketComment[];
  events: TicketEvent[];
}

export interface TicketQuery {
  scope?: TicketScope;
  /** "active", "all", or a status */
  status?: string;
  priority?: string;
  category?: string;
  breached?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffTicketStats {
  staff: true;
  open: number;
  unassigned: number;
  assignedToMe: number;
  myTeamsOpen: number;
  breached: number;
  resolvedToday: number;
  /** Last 30 days */
  satisfaction: { average: number | null; count: number };
}

export interface MemberTicketStats {
  staff: false;
  myOpen: number;
  waitingOnMe: number;
  resolved: number;
  assignedToMe: number;
}

export type TicketStats = StaffTicketStats | MemberTicketStats;

export interface TicketInput {
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  teamId: number | null;
  assigneeId: number | null;
}

export type TicketChanges = Partial<{
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assigneeId: number | null;
  teamId: number | null;
}>;

export interface TicketList {
  items: Ticket[];
  page: number;
  total: number;
  totalPages: number;
}

type Signal = { signal?: AbortSignal };

export const ticketService = {
  async list(query: TicketQuery = {}, { signal }: Signal = {}): Promise<TicketList> {
    const { breached, ...rest } = query;
    const data = await apiClient.get<Partial<Page<Ticket>> | null>("/tickets", { params: { ...rest, breached: breached ? "true" : undefined }, signal });
    return { items: data?.items ?? [], page: data?.page ?? 1, total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 };
  },

  stats({ signal }: Signal = {}): Promise<TicketStats> {
    return apiClient.get<TicketStats>("/tickets/stats", { signal });
  },

  async get(id: number, { signal }: Signal = {}): Promise<TicketDetail> {
    const data = await apiClient.get<TicketDetail>(`/tickets/${id}`, { signal });
    return { ...data, comments: data?.comments ?? [], events: data?.events ?? [] };
  },

  create(input: TicketInput): Promise<Ticket> {
    return apiClient.post<Ticket>("/tickets", input);
  },

  update({ id, changes }: { id: number; changes: TicketChanges }): Promise<Ticket> {
    return apiClient.patch<Ticket>(`/tickets/${id}`, changes);
  },

  /** The server answers { ok: true }; the detail query refetches to show the new comment. */
  addComment({ id, body, isInternal }: { id: number; body: string; isInternal: boolean }): Promise<{ ok: true }> {
    return apiClient.post<{ ok: true }>(`/tickets/${id}/comments`, { body, isInternal });
  },

  rate({ id, rating, comment }: { id: number; rating: number; comment: string | null }): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/${id}/rating`, { rating, comment });
  },
};
