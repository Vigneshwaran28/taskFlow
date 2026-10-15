"use client";
import { useState, type FormEvent } from "react";
import { Check, Crown, Search, Trash2 } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { LIST_COLORS } from "@/features/lists";
import { usePeople } from "@/features/people";
import { useCreateTeam, useDeleteTeam, useUpdateTeam } from "../hooks/useTeams";
import type { Team, TeamInput } from "../services/teamService";

/** The fields of a directory person (people feature) this form uses. */
interface PersonOption {
  id: number;
  name: string;
  email?: string;
  jobTitle?: string | null;
}

/** Feature component: create or edit a team and choose its members and leads. Mount with a `key` to reset. */
export function TeamFormDialog({ team = null, onClose }: { team?: Team | null; onClose: () => void }) {
  const toast = useToast();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const mutation = team ? updateTeam : createTeam;
  const peopleQuery = usePeople();
  const people: PersonOption[] = peopleQuery.data ?? [];
  const loadingPeople: boolean = peopleQuery.isPending;
  const colors: Readonly<Record<string, { dot: string; label: string }>> = LIST_COLORS;

  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [color, setColor] = useState(team?.color ?? "indigo");
  const [members, setMembers] = useState<Map<number, boolean>>(() => new Map((team?.members ?? []).map(member => [member.id, member.isLead])));
  const [filter, setFilter] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const serverErrors = fieldErrorsOf(mutation.error);
  const formError = formErrorOf(mutation.error) ?? serverErrors.members ?? serverErrors.color;
  const term = filter.trim().toLowerCase();
  const visiblePeople = people.filter(person => !term || `${person.name} ${person.email ?? ""} ${person.jobTitle ?? ""}`.toLowerCase().includes(term));

  function toggleMember(id: number) {
    if (mutation.error) mutation.reset();
    setMembers(current => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, false);
      return next;
    });
  }

  function toggleLead(id: number) {
    setMembers(current => new Map(current).set(id, !current.get(id)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const nextNameError = !name.trim() ? "Name is required." : name.trim().length > 80 ? "Keep the name under 80 characters." : null;
    const nextDescriptionError = description.trim().length > 300 ? "Keep the description under 300 characters." : null;
    setNameError(nextNameError);
    setDescriptionError(nextDescriptionError);
    if (nextNameError || nextDescriptionError) {
      document.getElementById(nextNameError ? "team-name" : "team-description")?.focus();
      return;
    }
    const input: TeamInput = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      members: [...members].map(([userId, isLead]) => ({ userId, isLead })),
    };
    const onSuccess = () => {
      toast.success(team ? "Team updated" : "Team created", `${input.members.length} ${input.members.length === 1 ? "member" : "members"}`);
      onClose();
    };
    if (team) updateTeam.mutate({ id: team.id, input }, { onSuccess });
    else createTeam.mutate(input, { onSuccess });
  }

  function handleDelete() {
    if (!team) return;
    deleteTeam.mutate(team.id, {
      onSuccess: () => {
        toast.success("Team deleted", "Its tickets keep their history without a team.");
        onClose();
      },
      onError: error => toast.error("Couldn't delete the team", error.message),
    });
  }

  return (
    <>
      <Dialog
        open={!confirmingDelete}
        onClose={onClose}
        size="lg"
        title={team ? `Edit ${team.name}` : "New team"}
        description="Teams group people by department and receive help desk tickets routed to them."
        footer={
          <>
            {team && (
              <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete team
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="team-form" loading={mutation.isPending}>
              {team ? "Save team" : "Create team"}
            </Button>
          </>
        }
      >
        <form id="team-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={formError} />
          <TextField
            label="Team name"
            id="team-name"
            required
            autoFocus
            maxLength={80}
            placeholder="e.g. IT Support, People Ops, Facilities"
            value={name}
            error={nameError ?? serverErrors.name}
            onChange={event => {
              setName(event.target.value);
              setNameError(null);
              if (mutation.error) mutation.reset();
            }}
          />
          <TextAreaField
            label="What does this team handle?"
            id="team-description"
            rows={2}
            maxLength={300}
            placeholder="Shown to people choosing where to send a ticket."
            value={description}
            error={descriptionError ?? serverErrors.description}
            onChange={event => {
              setDescription(event.target.value);
              setDescriptionError(null);
              if (mutation.error) mutation.reset();
            }}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Color</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colors).map(([key, meta]) => (
                <label key={key} className="relative cursor-pointer">
                  <input type="radio" name="team-color" value={key} checked={color === key} onChange={() => setColor(key)} className="peer sr-only" />
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      meta.dot,
                      color === key && "ring-2 ring-foreground"
                    )}
                  >
                    {color === key && <Check className="h-4 w-4 text-white" aria-hidden="true" />}
                  </span>
                  <span className="sr-only">{meta.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
              Members <span className="text-xs font-normal text-muted-foreground">{members.size} selected · tap the crown to make someone a lead</span>
            </legend>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="team-member-filter" className="sr-only">
                Find people
              </label>
              <input
                id="team-member-filter"
                type="search"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                placeholder="Find people by name, email, or title"
                className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
              {loadingPeople && <li className="px-3 py-4 text-sm text-muted-foreground">Loading people…</li>}
              {!loadingPeople && !visiblePeople.length && <li className="px-3 py-4 text-sm text-muted-foreground">No one matches “{filter}”.</li>}
              {visiblePeople.map(person => {
                const selected = members.has(person.id);
                const lead = members.get(person.id) === true;
                return (
                  <li key={person.id} className={cn("flex items-center gap-3 px-3 py-2", selected && "bg-accent/40")}>
                    <input
                      type="checkbox"
                      id={`team-member-${person.id}`}
                      checked={selected}
                      onChange={() => toggleMember(person.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <label htmlFor={`team-member-${person.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <Avatar name={person.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{person.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{person.jobTitle ?? person.email}</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleLead(person.id)}
                      disabled={!selected}
                      aria-pressed={lead}
                      aria-label={lead ? `Remove ${person.name} as lead` : `Make ${person.name} a lead`}
                      title={lead ? "Team lead" : "Make lead"}
                      className={cn(
                        "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:invisible",
                        lead ? "text-amber-500" : "text-muted-foreground/50 hover:text-amber-500"
                      )}
                    >
                      <Crown className={cn("h-4 w-4", lead && "fill-amber-400")} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${team?.name ?? "team"}?`}
        message="Members stay in the workspace. Tickets routed to this team keep their history but no longer belong to a team."
        confirmLabel="Delete team"
        pending={deleteTeam.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
