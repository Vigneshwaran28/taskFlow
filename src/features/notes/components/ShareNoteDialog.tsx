"use client";
import { useState } from "react";
import { Globe, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useShareablePeople, useShareNote } from "../hooks/useNotes";
import type { Note, ShareAll, ShareLevel } from "../services/noteService";
import { SHARE_ALL_LABELS } from "../utils/noteMeta";

const LEVEL_OPTIONS = [
  { value: "view", label: "Can view" },
  { value: "edit", label: "Can edit" },
] as const;

interface Row {
  userId: number;
  name: string;
  access: ShareLevel;
}

/** Feature component: who can see a note (owner and note managers only). Mount with a `key` to reset. */
export function ShareNoteDialog({ note, onClose }: { note: Note; onClose: () => void }) {
  const toast = useToast();
  const share = useShareNote();
  const people = useShareablePeople();
  const [shareAll, setShareAll] = useState<ShareAll>(note.shareAll);
  const [rows, setRows] = useState<Row[]>(() => (note.shares ?? []).map(entry => ({ userId: entry.user.id, name: entry.user.name, access: entry.access })));
  const [pick, setPick] = useState("");
  const [pickLevel, setPickLevel] = useState<ShareLevel>("view");
  const [error, setError] = useState<string | null>(null);
  const serverErrors = fieldErrorsOf(share.error);

  const taken = new Set([note.owner.id, ...rows.map(row => row.userId)]);
  const available = (people.data ?? []).filter(person => !taken.has(person.id));

  function addPerson() {
    const person = available.find(candidate => String(candidate.id) === pick);
    if (!person) {
      setError("Choose someone to add.");
      return;
    }
    setRows(current => [...current, { userId: person.id, name: person.name, access: pickLevel }]);
    setPick("");
    setError(null);
    share.reset();
  }

  function save() {
    if (share.isPending) return;
    if (rows.length > 200) {
      setError("Share with at most 200 people.");
      return;
    }
    share.mutate(
      { id: note.id, sharing: { shareAll, users: rows.map(row => ({ userId: row.userId, access: row.access })) } },
      {
        onSuccess: () => {
          toast.success("Sharing updated");
          onClose();
        },
        onError: err => toast.error("Couldn't update sharing", err.message),
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title="Share note"
      description="Private notes are only visible to you (and workspace note managers)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={share.isPending}>
            Cancel
          </Button>
          <Button onClick={save} loading={share.isPending}>
            Save sharing
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormAlert message={formErrorOf(share.error)} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4" aria-hidden="true" />
            Everyone in the workspace
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(["none", "view", "edit"] as const).map(level => (
              <label
                key={level}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  shareAll === level ? "border-primary bg-accent text-accent-foreground" : "border-input hover:bg-muted"
                )}
              >
                <input type="radio" name="note-share-all" value={level} checked={shareAll === level} onChange={() => setShareAll(level)} className="sr-only" />
                {SHARE_ALL_LABELS[level]}
              </label>
            ))}
          </div>
          {serverErrors.shareAll && <p className="text-sm text-destructive">{serverErrors.shareAll}</p>}
        </fieldset>

        <section aria-labelledby="note-share-people" className="flex flex-col gap-3">
          <h3 id="note-share-people" className="text-sm font-medium">
            People
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <SelectField
              label="Add a person"
              className="min-w-0 flex-1"
              value={pick}
              disabled={people.isPending}
              onChange={event => {
                setPick(event.target.value);
                setError(null);
              }}
              options={[{ value: "", label: people.isPending ? "Loading people…" : available.length ? "Choose someone…" : "Everyone is already added" }, ...available.map(person => ({ value: String(person.id), label: person.jobTitle ? `${person.name} · ${person.jobTitle}` : person.name }))]}
            />
            <SelectField label="Access" value={pickLevel} onChange={event => setPickLevel(event.target.value as ShareLevel)} options={LEVEL_OPTIONS} className="sm:w-36" />
            <Button variant="secondary" onClick={addPerson} disabled={!pick}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add
            </Button>
          </div>
          {(error || serverErrors.users) && (
            <p role="alert" className="text-sm text-destructive">
              {error ?? serverErrors.users}
            </p>
          )}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not shared with anyone individually.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {rows.map(row => (
                <li key={row.userId} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                  <label className="sr-only" htmlFor={`note-share-${row.userId}`}>
                    Access for {row.name}
                  </label>
                  <select
                    id={`note-share-${row.userId}`}
                    value={row.access}
                    onChange={event => setRows(current => current.map(item => (item.userId === row.userId ? { ...item, access: event.target.value as ShareLevel } : item)))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {LEVEL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${row.name}`} onClick={() => setRows(current => current.filter(item => item.userId !== row.userId))}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
