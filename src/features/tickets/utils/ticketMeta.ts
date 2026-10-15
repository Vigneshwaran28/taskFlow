// Display metadata for ticket enums. Complete class names only (Tailwind cannot see runtime strings).
import type { ComponentType } from "react";
import { CheckCircle2, CircleDot, Clock, Inbox, Loader, Lock, User, Users } from "lucide-react";
import type { Tone } from "@/components/ui/Badge";
import type { SelectOption } from "@/components/ui/SelectField";
import type { Ticket, TicketEvent, TicketPriority, TicketScope, TicketStatus } from "../services/ticketService";

type Icon = ComponentType<{ className?: string }>;

/** The fields of a directory person (people feature) that ticket forms use. */
export interface PersonOption {
  id: number;
  name: string;
  jobTitle?: string | null;
}

/** The fields of a team (teams feature) that ticket forms use. */
export interface TeamOption {
  id: number;
  name: string;
}

export const TICKET_STATUSES: Readonly<Record<TicketStatus, { label: string; tone: Tone; icon: Icon }>> = Object.freeze({
  open: { label: "Open", tone: "info", icon: CircleDot },
  in_progress: { label: "In progress", tone: "primary", icon: Loader },
  waiting: { label: "Waiting on requester", tone: "warning", icon: Clock },
  resolved: { label: "Resolved", tone: "success", icon: CheckCircle2 },
  closed: { label: "Closed", tone: "neutral", icon: Lock },
});

export const TICKET_CATEGORIES: Readonly<Record<string, { label: string }>> = Object.freeze({
  it_support: { label: "IT support" },
  access: { label: "Access & accounts" },
  hardware: { label: "Hardware" },
  software: { label: "Software & licenses" },
  hr: { label: "HR & people" },
  facilities: { label: "Facilities & office" },
  finance: { label: "Finance & purchasing" },
  other: { label: "Other" },
});

/** Queues. Members see "assigned" and "mine"; the rest are for staff. */
export const TICKET_SCOPES: Readonly<Record<TicketScope, { label: string; icon: Icon; staffOnly: boolean }>> = Object.freeze({
  assigned: { label: "Assigned to me", icon: User, staffOnly: false },
  unassigned: { label: "Unassigned", icon: Inbox, staffOnly: true },
  team: { label: "My teams", icon: Users, staffOnly: true },
  all: { label: "All tickets", icon: Inbox, staffOnly: true },
  mine: { label: "My requests", icon: User, staffOnly: false },
});

export const toOptions = (map: Readonly<Record<string, { label: string }>>): SelectOption[] => Object.entries(map).map(([value, meta]) => ({ value, label: meta.label }));

export const STATUS_FILTERS: SelectOption[] = [{ value: "active", label: "Active" }, { value: "all", label: "All statuses" }, ...toOptions(TICKET_STATUSES)];

export const SORT_OPTIONS: SelectOption[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest" },
  { value: "due", label: "Due soonest" },
  { value: "priority", label: "Priority" },
];

/** Response / resolution targets per priority, in hours (mirrors the server's SLA_HOURS). */
export const SLA_HOURS: Readonly<Record<TicketPriority, { response: number; resolution: number }>> = Object.freeze({
  urgent: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 24 },
  medium: { response: 8, resolution: 72 },
  low: { response: 24, resolution: 120 },
});

/** Category choices the workspace uses (its help desk settings), keeping `current` so an existing ticket still shows its value. */
export const categoryOptions = (enabled: readonly string[] | undefined, current?: string) =>
  toOptions(TICKET_CATEGORIES).filter(option => !enabled || enabled.includes(option.value) || option.value === current);

const ACTIVE = new Set<TicketStatus>(["open", "in_progress", "waiting"]);
export const isActive = (ticket: Pick<Ticket, "status">) => ACTIVE.has(ticket.status);

const DUE_SOON_MS = 2 * 60 * 60 * 1000;

export type DeadlineState = "met" | "missed" | "breached" | "due_soon" | "on_track";

/** Where a deadline stands right now. `doneAt` is when the target was met, if it was. */
export function deadlineState(dueAt: string, doneAt: string | null): DeadlineState {
  if (doneAt) return new Date(doneAt) <= new Date(dueAt) ? "met" : "missed";
  const left = new Date(dueAt).getTime() - Date.now();
  if (left < 0) return "breached";
  return left < DUE_SOON_MS ? "due_soon" : "on_track";
}

/** Resolution deadline state for a ticket (met/missed once resolved). */
export const resolutionState = (ticket: Ticket) => deadlineState(ticket.resolutionDueAt, isActive(ticket) ? null : (ticket.resolvedAt ?? ticket.closedAt));

export const DEADLINE_META: Readonly<Record<DeadlineState, { label: string; tone: Tone }>> = Object.freeze({
  met: { label: "Met", tone: "success" },
  missed: { label: "Missed", tone: "danger" },
  breached: { label: "Overdue", tone: "danger" },
  due_soon: { label: "Due soon", tone: "warning" },
  on_track: { label: "On track", tone: "neutral" },
});

/** Short "in 3h" / "2d ago" text for a deadline. */
export function formatDue(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const text = minutes < 60 ? `${Math.max(minutes, 1)}m` : minutes < 48 * 60 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1440)}d`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Text for one activity event. */
export function describeEvent(event: TicketEvent) {
  const status = (value: string | null) => (value && TICKET_STATUSES[value as TicketStatus]?.label.toLowerCase()) ?? value;
  const category = (value: string | null) => (value && TICKET_CATEGORIES[value]?.label) ?? value;
  switch (event.type) {
    case "created":
      return `raised this ticket as ${event.to} priority`;
    case "status":
      return `changed the status from ${status(event.from)} to ${status(event.to)}`;
    case "priority":
      return `changed the priority from ${event.from} to ${event.to}`;
    case "category":
      return `moved it from ${category(event.from)} to ${category(event.to)}`;
    case "assignee":
      if (event.to && event.to === event.actor?.name) return "took ownership of this ticket";
      return event.to ? `assigned it to ${event.to}` : `unassigned ${event.from ?? "it"}`;
    case "team":
      return event.to ? `routed it to ${event.to}` : `removed it from ${event.from ?? "its team"}`;
    case "subject":
      return `renamed it to "${event.to}"`;
    case "rating":
      return `rated the support ${event.to}/5`;
    default:
      return event.type;
  }
}
