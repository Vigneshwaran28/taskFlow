"use client";
import { useState, type FormEvent } from "react";
import { ErrorState, FormAlert, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCurrentUser } from "@/features/auth";
import { usePeople } from "@/features/people";
import { useCreateGroup, useOpenDirect } from "../hooks/useMessaging";
import { PeoplePicker, type PickablePerson } from "./PeoplePicker";

export interface NewConversationDialogProps {
  mode: "direct" | "group";
  onClose: () => void;
  onOpened: (conversationId: number) => void;
}

/** Mirrors the server's groupSchema (routes/messages.js). */
const GROUP_NAME_MAX = 80;
const GROUP_MEMBERS_MAX = 200;

type ConversationErrors = Partial<Record<"name" | "members", string>>;

/** Feature component: start a direct chat (pick one person) or a group (name + several people). */
export function NewConversationDialog({ mode, onClose, onOpened }: NewConversationDialogProps) {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const peopleQuery = usePeople();
  const people: PickablePerson[] = peopleQuery.data ?? [];
  const openDirect = useOpenDirect();
  const createGroup = useCreateGroup();
  const mutation = mode === "direct" ? openDirect : createGroup;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [errors, setErrors] = useState<ConversationErrors>({});
  const others = people.filter(person => person.id !== me?.id);

  const serverErrors = fieldErrorsOf(mutation.error);
  const nameError = errors.name ?? serverErrors.name ?? null;
  const membersError = errors.members ?? serverErrors.memberIds ?? serverErrors.userId ?? null;
  const formError = formErrorOf(mutation.error);

  function clearError(field: keyof ConversationErrors) {
    setErrors(current => ({ ...current, [field]: undefined }));
    if (mutation.error) mutation.reset();
  }

  function toggle(id: number) {
    clearError("members");
    if (mode === "direct") setSelected(current => (current[0] === id ? [] : [id]));
    else setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  }

  function validate(): ConversationErrors {
    const next: ConversationErrors = {};
    if (mode === "direct") {
      if (!selected.length) next.members = "Pick someone to message.";
      return next;
    }
    const trimmed = name.trim();
    if (!trimmed) next.name = "Name the group.";
    else if (trimmed.length > GROUP_NAME_MAX) next.name = `Keep the name under ${GROUP_NAME_MAX} characters.`;
    if (!selected.length) next.members = "Add at least one person.";
    else if (selected.length > GROUP_MEMBERS_MAX) next.members = `A group can have up to ${GROUP_MEMBERS_MAX} people.`;
    return next;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    if (mode === "direct") {
      openDirect.mutate(selected[0], {
        onSuccess: conversation => {
          onClose();
          onOpened(conversation.id);
        },
      });
      return;
    }
    createGroup.mutate(
      { name: name.trim(), memberIds: selected },
      {
        onSuccess: conversation => {
          toast.success(`${conversation.name} created`, `${conversation.members.length} members`);
          onClose();
          onOpened(conversation.id);
        },
      }
    );
  }

  const picker = peopleQuery.isPending ? (
    <LoadingState label="Loading colleagues…" />
  ) : peopleQuery.error ? (
    <ErrorState message="Unable to load your colleagues." onRetry={() => void peopleQuery.refetch()} />
  ) : others.length ? (
    <PeoplePicker people={others} selected={selected} onToggle={toggle} single={mode === "direct"} label={mode === "direct" ? "Colleagues" : "Group members"} />
  ) : (
    <p className="rounded-lg border px-3 py-4 text-sm text-muted-foreground">There&apos;s no one else in your workspace yet.</p>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={mode === "direct" ? "New message" : "New group"}
      description={mode === "direct" ? "Pick a colleague to message." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="new-conversation-form" loading={mutation.isPending}>
            {mode === "direct" ? "Start chat" : `Create group${selected.length ? ` (${selected.length + 1})` : ""}`}
          </Button>
        </>
      }
    >
      <form id="new-conversation-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        {mode === "group" && (
          <TextField
            label="Group name"
            id="group-name"
            required
            maxLength={GROUP_NAME_MAX}
            placeholder="e.g. Launch team, Night shift"
            value={name}
            error={nameError}
            onChange={event => {
              setName(event.target.value);
              clearError("name");
            }}
          />
        )}
        <fieldset className="flex flex-col gap-1" aria-invalid={Boolean(membersError)} aria-describedby={membersError ? "new-conversation-members-error" : undefined}>
          <legend className="mb-1 text-sm font-medium">{mode === "direct" ? "Colleague" : `Members · ${selected.length} selected`}</legend>
          {picker}
          {membersError && (
            <p id="new-conversation-members-error" role="alert" className="text-xs text-destructive">
              {membersError}
            </p>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
