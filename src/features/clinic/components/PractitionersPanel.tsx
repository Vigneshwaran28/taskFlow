"use client";
// Practitioner cards with specialty, slot length, fee, room, hours and accepting status; add, edit, remove.
import { useState } from "react";
import { Clock, DoorOpen, Pencil, Plus, Stethoscope, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { useCurrentUser } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatClock, formatMoney } from "@/lib/format";
import { useClinicAccess, useProviders, useRemoveProvider } from "../hooks/useClinic";
import type { Provider, Weekday } from "../services/clinicService";
import { accentClasses, WEEKDAYS } from "../utils/clinicMeta";
import { ProviderEditorDialog, type ProviderEditorDialogProps } from "./ProviderEditorDialog";

const DAY_KEYS: Weekday[] = ["1", "2", "3", "4", "5", "6", "0"];

function HoursList({ provider }: { provider: Provider }) {
  const working = DAY_KEYS.filter(day => provider.schedule[day]?.length);
  if (!working.length) return <p className="text-sm text-muted-foreground">No weekly hours set.</p>;
  return (
    <dl className="grid grid-cols-[3rem_1fr] gap-x-2 gap-y-0.5 text-xs">
      {working.map(day => (
        <div key={day} className="contents">
          <dt className="font-medium text-muted-foreground">{WEEKDAYS[Number(day)].slice(0, 3)}</dt>
          <dd className="tabular-nums">{provider.schedule[day]!.map(([start, end]) => `${formatClock(start)}–${formatClock(end)}`).join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PractitionersPanel() {
  const toast = useToast();
  const access = useClinicAccess();
  const { data: user } = useCurrentUser();
  const { data: providers, isPending, error, refetch } = useProviders();
  const remove = useRemoveProvider();
  const [editor, setEditor] = useState<(Omit<ProviderEditorDialogProps, "onClose"> & { key: number }) | null>(null);
  const [removing, setRemoving] = useState<Provider | null>(null);

  if (isPending) return <LoadingState label="Loading practitioners…" />;
  if (error) return <ErrorState message="Unable to load practitioners." onRetry={() => void refetch()} />;

  const mine = providers.find(item => item.isMe);
  const needsOwnProfile = access.practitioner && !mine && user;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {needsOwnProfile && (
          <Button variant={access.manageProviders ? "secondary" : "primary"} onClick={() => setEditor({ key: Date.now(), person: { id: user.id, name: user.name } })}>
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            Set up my profile
          </Button>
        )}
        {access.manageProviders && (
          <Button onClick={() => setEditor({ key: Date.now() })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add practitioner
          </Button>
        )}
      </div>

      {providers.length === 0 ? (
        <EmptyState title="No practitioners yet" message="Add the doctors and therapists who see patients, with their weekly hours." icon={Stethoscope} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map(provider => {
            const canEdit = access.manageProviders || (provider.isMe && access.practitioner);
            return (
              <li key={provider.userId} className={cn("flex flex-col gap-3 rounded-xl border border-t-4 bg-card p-5 shadow-sm", accentClasses(provider.color).header)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {provider.name}
                      {provider.isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{[provider.specialty, provider.qualification].filter(Boolean).join(" · ")}</p>
                    {provider.registrationNo && <p className="truncate text-xs text-muted-foreground">Reg. {provider.registrationNo}</p>}
                  </div>
                  <Badge tone={provider.isAccepting ? "success" : "neutral"}>{provider.isAccepting ? "Accepting" : "Not accepting"}</Badge>
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <li className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {provider.slotMinutes}-min slots
                  </li>
                  {provider.consultationFee != null && (
                    <li className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="sr-only">Fee </span>
                      {formatMoney(provider.consultationFee)}
                    </li>
                  )}
                  {provider.room && (
                    <li className="flex items-center gap-1.5">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {provider.room}
                    </li>
                  )}
                </ul>
                <HoursList provider={provider} />
                {(canEdit || access.manageProviders) && (
                  <div className="mt-auto flex gap-2 border-t pt-3">
                    {canEdit && (
                      <Button variant="secondary" size="sm" onClick={() => setEditor({ key: Date.now(), provider })}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                    )}
                    {access.manageProviders && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRemoving(provider)} aria-label={`Remove ${provider.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editor && <ProviderEditorDialog key={editor.key} provider={editor.provider} person={editor.person} onClose={() => setEditor(null)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove practitioner?"
        message={removing ? `${removing.name} will no longer appear in the appointment book. Past appointments and visits are kept.` : ""}
        confirmLabel="Remove"
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.userId, {
            onSuccess: () => {
              toast.success(`${removing.name} removed`);
              setRemoving(null);
            },
            onError: err => toast.error("Couldn't remove the practitioner", err.message),
          })
        }
      />
    </div>
  );
}
