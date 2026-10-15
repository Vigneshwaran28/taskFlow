"use client";
import { useState, type FormEvent } from "react";
import { Crown, LogOut, UserMinus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf } from "@/lib/apiClient";
import { usePeople } from "@/features/people";
import { useAddMembers, useRemoveMember, useRenameGroup } from "../hooks/useMessaging";
import type { Conversation, ConversationMember } from "../services/messagingService";
import { PeoplePicker, type PickablePerson } from "./PeoplePicker";

/** Mirrors the server's groupSchema name rule (routes/messages.js). */
const GROUP_NAME_MAX = 80;

export interface GroupInfoDialogProps {
  conversation: Conversation;
  currentUserId: number | null;
  onClose: () => void;
  onLeft: () => void;
}

/** Feature component: a group's members, rename, add / remove people, and leave. */
export function GroupInfoDialog({ conversation, currentUserId, onClose, onLeft }: GroupInfoDialogProps) {
  const toast = useToast();
  const people: PickablePerson[] = usePeople().data ?? [];
  const rename = useRenameGroup();
  const addMembers = useAddMembers();
  const removeMember = useRemoveMember();
  const [name, setName] = useState(conversation.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<number[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState<ConversationMember | null>(null);
  const memberIds = new Set(conversation.members.map(member => member.id));
  const candidates = people.filter(person => !memberIds.has(person.id));

  function handleRename(event: FormEvent) {
    event.preventDefault();
    if (rename.isPending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name the group.");
      return;
    }
    if (trimmed.length > GROUP_NAME_MAX) {
      setNameError(`Keep the name under ${GROUP_NAME_MAX} characters.`);
      return;
    }
    if (trimmed === conversation.name) return;
    rename.mutate(
      { id: conversation.id, name: trimmed },
      {
        onSuccess: () => toast.success("Group renamed"),
        onError: error => {
          const fieldError = fieldErrorsOf(error).name;
          if (fieldError) setNameError(fieldError);
          else toast.error("Couldn't rename", error.message);
        },
      }
    );
  }

  function closeAdding() {
    setAdding(false);
    setToAdd([]);
    setAddError(null);
  }

  function handleAdd() {
    if (addMembers.isPending) return;
    if (!toAdd.length) {
      setAddError("Pick at least one person to add.");
      return;
    }
    addMembers.mutate(
      { id: conversation.id, userIds: toAdd },
      {
        onSuccess: () => {
          toast.success(`Added ${toAdd.length} ${toAdd.length === 1 ? "person" : "people"}`);
          closeAdding();
        },
        onError: error => {
          const fieldError = fieldErrorsOf(error).userIds;
          if (fieldError) setAddError(fieldError);
          else toast.error("Couldn't add people", error.message);
        },
      }
    );
  }

  function remove(member: ConversationMember) {
    removeMember.mutate(
      { id: conversation.id, userId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.name} removed`);
          setRemoving(null);
        },
        onError: error => toast.error("Couldn't remove", error.message),
      }
    );
  }

  function leave() {
    if (currentUserId === null) return;
    removeMember.mutate(
      { id: conversation.id, userId: currentUserId },
      {
        onSuccess: () => {
          toast.success(`You left ${conversation.name}`);
          setLeaving(false);
          onClose();
          onLeft();
        },
        onError: error => toast.error("Couldn't leave the group", error.message),
      }
    );
  }

  return (
    <>
      <Dialog
        open={!leaving && !removing}
        onClose={onClose}
        title={conversation.name}
        description={`${conversation.members.length} members`}
        footer={
          <>
            <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setLeaving(true)}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Leave group
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {conversation.canManage && (
            <form onSubmit={handleRename} noValidate className="flex items-start gap-2">
              <TextField
                label="Group name"
                id="group-rename"
                className="flex-1"
                required
                maxLength={GROUP_NAME_MAX}
                value={name}
                error={nameError}
                onChange={event => {
                  setName(event.target.value);
                  setNameError(null);
                }}
              />
              <Button type="submit" variant="secondary" className="mt-6" loading={rename.isPending}>
                Rename
              </Button>
            </form>
          )}

          {conversation.canManage &&
            (adding ? (
              <div className="flex flex-col gap-2 rounded-xl border p-3">
                <PeoplePicker
                  people={candidates}
                  selected={toAdd}
                  onToggle={id => {
                    setAddError(null);
                    setToAdd(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
                  }}
                  label="People to add"
                />
                {addError && (
                  <p role="alert" className="text-xs text-destructive">
                    {addError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeAdding}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} loading={addMembers.isPending}>
                    Add {toAdd.length || ""}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" className="self-start" onClick={() => setAdding(true)} disabled={!candidates.length}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Add people
              </Button>
            ))}

          <ul className="divide-y rounded-xl border" aria-label="Members">
            {conversation.members.map(member => (
              <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                <Avatar name={member.name} imageUrl={member.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {member.name}
                    {member.id === currentUserId && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                    {member.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Owner" />}
                  </span>
                  {member.jobTitle && <span className="block truncate text-xs text-muted-foreground">{member.jobTitle}</span>}
                </span>
                {conversation.canManage && member.id !== currentUserId && (
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(member)} disabled={removeMember.isPending} aria-label={`Remove ${member.name}`}>
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
      <ConfirmDialog
        open={leaving}
        title={`Leave ${conversation.name}?`}
        message="You'll stop getting its messages. Someone in the group can add you back."
        confirmLabel="Leave group"
        pending={removeMember.isPending}
        onConfirm={leave}
        onCancel={() => setLeaving(false)}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name ?? "this person"}?`}
        message="They'll stop getting this group's messages. You can add them back later."
        confirmLabel="Remove"
        pending={removeMember.isPending}
        onConfirm={() => removing && remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
