import { Badge } from "@/components/ui/Badge";
import { FormAlert } from "@/components/shared/States";
import { ApiError, fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import type { AppointmentStatus } from "../services/clinicService";
import { accentClasses, APPOINTMENT_STATUS_META, APPOINTMENT_TYPE_META, typeLabel } from "../utils/clinicMeta";
import type { AppointmentType } from "@/types/session";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = APPOINTMENT_STATUS_META[status];
  return <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? status}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge tone={APPOINTMENT_TYPE_META[type as AppointmentType]?.tone ?? "neutral"}>{typeLabel(type)}</Badge>;
}

/** A practitioner's colour dot. */
export function ProviderDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", accentClasses(color).dot, className)} />;
}

/**
 * Form-level error for clinic forms. Conflicts (409, e.g. SLOT_TAKEN) carry a field error and a clearer message,
 * so the message is shown too; field errors that no input displays (`shown` lists the ones that do) are listed.
 */
export function ClinicFormAlert({ error, shown = [] }: { error: unknown; shown?: readonly string[] }) {
  if (!error) return null;
  const fields = fieldErrorsOf(error);
  const leftover = Object.entries(fields).filter(([key]) => !shown.includes(key));
  const conflict = error instanceof ApiError && error.status === 409 ? error.message : null;
  const message = conflict ?? formErrorOf(error);
  if (!message && !leftover.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <FormAlert message={message} />
      {leftover.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <ul className="list-inside list-disc">
            {leftover.map(([key, value]) => (
              <li key={key}>{value}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
