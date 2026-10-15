"use client";
import type { ReactNode } from "react";
import { UserCheck } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { fieldErrorsOf } from "@/lib/apiClient";
import { useModuleSettings } from "@/features/auth";
import { usePeople } from "@/features/people";
import { PRIORITY_OPTIONS, PriorityBadge } from "@/features/tasks";
import { useTeams } from "@/features/teams";
import { useUpdateTicket } from "../hooks/useTickets";
import type { TicketChanges, TicketDetail, TicketPriority, TicketStatus } from "../services/ticketService";
import { categoryOptions, TICKET_CATEGORIES, TICKET_STATUSES, toOptions, type PersonOption, type TeamOption } from "../utils/ticketMeta";
import { TicketStatusBadge } from "./TicketBadges";

type Field = keyof Omit<TicketChanges, "subject">;

const FIELD_LABELS: Record<Field, string> = { status: "Status", priority: "Priority", category: "Category", teamId: "Team", assigneeId: "Assignee" };

/** Read-only label / value row. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

/** Editor for staff and the assignee: every change saves immediately. */
function StaffEditor({ ticket, currentUserId }: { ticket: TicketDetail; currentUserId: number | null }) {
  const toast = useToast();
  const updateTicket = useUpdateTicket();
  const people: PersonOption[] = usePeople().data ?? [];
  const teams: TeamOption[] = useTeams().data ?? [];
  const priorityOptions: readonly SelectOption[] = PRIORITY_OPTIONS;
  const { categories: enabledCategories } = useModuleSettings("helpdesk");

  function save<K extends Field>(field: K, value: TicketChanges[K]) {
    updateTicket.mutate(
      { id: ticket.id, changes: { [field]: value } },
      {
        onSuccess: () => toast.success(`${FIELD_LABELS[field]} updated`),
        onError: error => toast.error(`${FIELD_LABELS[field]} not changed`, fieldErrorsOf(error)[field] ?? error.message),
      }
    );
  }

  const toId = (value: string) => (value ? Number(value) : null);
  const disabled = updateTicket.isPending;

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        label="Status"
        id="tp-status"
        value={ticket.status}
        disabled={disabled}
        options={toOptions(TICKET_STATUSES)}
        onChange={event => save("status", event.target.value as TicketStatus)}
      />
      <SelectField
        label="Priority"
        id="tp-priority"
        value={ticket.priority}
        disabled={disabled}
        options={priorityOptions}
        onChange={event => save("priority", event.target.value as TicketPriority)}
      />
      <div className="flex flex-col gap-1.5">
        <SelectField
          label="Assignee"
          id="tp-assignee"
          value={ticket.assignee ? String(ticket.assignee.id) : ""}
          disabled={disabled}
          options={[{ value: "", label: "Unassigned" }, ...people.map(person => ({ value: String(person.id), label: person.id === currentUserId ? `${person.name} (me)` : person.name }))]}
          onChange={event => save("assigneeId", toId(event.target.value))}
        />
        {currentUserId !== null && ticket.assignee?.id !== currentUserId && (
          <Button variant="link" size="sm" className="h-auto self-start px-0" onClick={() => save("assigneeId", currentUserId)} disabled={disabled}>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Assign to me
          </Button>
        )}
      </div>
      <SelectField
        label="Team"
        id="tp-team"
        value={ticket.team ? String(ticket.team.id) : ""}
        disabled={disabled}
        options={[{ value: "", label: "No team" }, ...teams.map(team => ({ value: String(team.id), label: team.name }))]}
        onChange={event => save("teamId", toId(event.target.value))}
      />
      <SelectField
        label="Category"
        id="tp-category"
        value={ticket.category}
        disabled={disabled}
        options={categoryOptions(enabledCategories, ticket.category)}
        onChange={event => save("category", event.target.value)}
      />
    </div>
  );
}

/** Requester view: the same fields, read-only, plus close / reopen. */
function RequesterView({ ticket }: { ticket: TicketDetail }) {
  const toast = useToast();
  const updateTicket = useUpdateTicket();
  const done = ticket.status === "resolved" || ticket.status === "closed";

  function setStatus(status: TicketStatus) {
    updateTicket.mutate(
      { id: ticket.id, changes: { status } },
      {
        onSuccess: () => toast.success(status === "closed" ? "Ticket closed" : "Ticket reopened"),
        onError: error => toast.error("Couldn't update the ticket", error.message),
      }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="divide-y">
        <Row label="Status">
          <TicketStatusBadge status={ticket.status} />
        </Row>
        <Row label="Priority">
          <PriorityBadge priority={ticket.priority} />
        </Row>
        <Row label="Category">{TICKET_CATEGORIES[ticket.category]?.label ?? ticket.category}</Row>
        <Row label="Team">{ticket.team?.name ?? "Not routed yet"}</Row>
        <Row label="Assignee">
          {ticket.assignee ? (
            <span className="inline-flex items-center gap-2">
              <Avatar name={ticket.assignee.name} imageUrl={ticket.assignee.avatarUrl} size="sm" />
              {ticket.assignee.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Waiting for an agent</span>
          )}
        </Row>
      </dl>
      {ticket.status !== "closed" && (
        <Button variant="secondary" onClick={() => setStatus("closed")} loading={updateTicket.isPending}>
          {done ? "Close ticket" : "My issue is solved, close it"}
        </Button>
      )}
      {done && (
        <Button variant="ghost" onClick={() => setStatus("open")} disabled={updateTicket.isPending}>
          Reopen ticket
        </Button>
      )}
    </div>
  );
}

/** Feature component: ticket properties, editable for staff and the assignee (`staff`: the viewer can work this ticket). */
export function TicketProperties({ ticket, staff, currentUserId }: { ticket: TicketDetail; staff: boolean; currentUserId: number | null }) {
  return (
    <section aria-labelledby="ticket-properties-heading" className="rounded-xl border bg-card p-4">
      <h2 id="ticket-properties-heading" className="mb-3 text-sm font-semibold">
        Details
      </h2>
      {staff ? <StaffEditor ticket={ticket} currentUserId={currentUserId} /> : <RequesterView ticket={ticket} />}
    </section>
  );
}
