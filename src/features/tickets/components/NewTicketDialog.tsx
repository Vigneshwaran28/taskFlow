"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "@/lib/navigation";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCurrentUser, useModuleSettings } from "@/features/auth";
import { usePeople } from "@/features/people";
import { PRIORITY_OPTIONS } from "@/features/tasks";
import { useTeams } from "@/features/teams";
import { useCreateTicket } from "../hooks/useTickets";
import type { TicketPriority } from "../services/ticketService";
import { categoryOptions, SLA_HOURS, type PersonOption, type TeamOption } from "../utils/ticketMeta";

interface Values {
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  teamId: string;
  assigneeId: string;
}

type ErrorMap = Partial<Record<keyof Values, string>>;

const SUBJECT_MAX = 200;
const DESCRIPTION_MAX = 10_000;

const EMPTY: Values = { subject: "", description: "", category: "", priority: "medium", teamId: "", assigneeId: "" };

const hoursText = (hours: number) => (hours < 24 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${hours / 24} days`);

/** Feature component: raise a help desk ticket, then open it. Mount with a `key` to reset the form. */
export function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const createTicket = useCreateTicket();
  const helpdesk = useModuleSettings("helpdesk");
  const categories = categoryOptions(helpdesk.categories);
  const priorityOptions: readonly SelectOption[] = PRIORITY_OPTIONS;
  const teams: TeamOption[] = useTeams().data ?? [];
  const people: PersonOption[] = usePeople().data ?? [];
  const { data: user } = useCurrentUser();
  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, category: categories[0]?.value ?? "other" }));
  const [clientErrors, setClientErrors] = useState<ErrorMap>({});

  const serverErrors = fieldErrorsOf(createTicket.error);
  const errors: ErrorMap = { ...serverErrors, ...clientErrors };
  const formError = formErrorOf(createTicket.error);
  // The workspace's own targets, falling back to the standard ones.
  const sla = helpdesk.sla?.[values.priority] ?? SLA_HOURS[values.priority];

  function set<K extends keyof Values>(name: K, value: Values[K]) {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (createTicket.isPending) return;
    const nextErrors: ErrorMap = {};
    const subject = values.subject.trim();
    const description = values.description.trim();
    // Mirrors createSchema in server/src/routes/tickets.js
    if (!subject) nextErrors.subject = "Subject is required.";
    else if (subject.length > SUBJECT_MAX) nextErrors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
    if (!description) nextErrors.description = "Describe the problem or request.";
    else if (description.length > DESCRIPTION_MAX) nextErrors.description = "The description is too long.";
    if (!values.category || !categories.some(option => option.value === values.category)) nextErrors.category = "Choose a category.";
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    createTicket.mutate(
      {
        subject: values.subject.trim(),
        description: values.description.trim(),
        category: values.category,
        priority: values.priority,
        teamId: values.teamId ? Number(values.teamId) : null,
        assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
      },
      {
        onSuccess: ticket => {
          toast.success(`${ticket.key} submitted`, ticket.assignee ? `${ticket.assignee.name} has been notified.` : "The support team has been notified.");
          onClose();
          router.push(`/tickets/${ticket.id}`);
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="New ticket"
      description="Ask for help or report a problem. You'll get a notification on every update."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createTicket.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-form" loading={createTicket.isPending}>
            Submit ticket
          </Button>
        </>
      }
    >
      <form id="ticket-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <TextField
          label="Subject"
          id="ticket-subject"
          required
          autoFocus
          maxLength={SUBJECT_MAX}
          placeholder="e.g. Can't connect to the VPN from home"
          value={values.subject}
          error={errors.subject}
          onChange={event => set("subject", event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Category" id="ticket-category-field" required value={values.category} error={errors.category} options={categories} onChange={event => set("category", event.target.value)} />
          <SelectField
            label="Priority"
            id="ticket-priority-field"
            value={values.priority}
            options={priorityOptions}
            onChange={event => set("priority", event.target.value as TicketPriority)}
          />
          <SelectField
            label="Team"
            id="ticket-team-field"
            value={values.teamId}
            error={errors.teamId}
            options={[{ value: "", label: "Not sure (support triages)" }, ...teams.map(team => ({ value: String(team.id), label: team.name }))]}
            onChange={event => set("teamId", event.target.value)}
          />
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">
          {priorityOptions.find(option => option.value === values.priority)?.label} priority: first reply within {hoursText(sla.response)}, resolved within{" "}
          {hoursText(sla.resolution)}.
        </p>
        <SelectField
          label="Assign to (optional)"
          id="ticket-assignee-field"
          value={values.assigneeId}
          error={errors.assigneeId}
          hint="Pick a colleague to own this ticket, or leave it for the team to triage."
          options={[
            { value: "", label: "Leave unassigned" },
            ...people.filter(person => person.id !== user?.id).map(person => ({ value: String(person.id), label: person.jobTitle ? `${person.name} · ${person.jobTitle}` : person.name })),
          ]}
          onChange={event => set("assigneeId", event.target.value)}
        />
        <TextAreaField
          label="Description"
          id="ticket-description"
          required
          rows={7}
          maxLength={DESCRIPTION_MAX}
          placeholder="What happened, what you expected, and anything you've already tried. Include error messages if you have them."
          value={values.description}
          error={errors.description}
          onChange={event => set("description", event.target.value)}
        />
      </form>
    </Dialog>
  );
}
