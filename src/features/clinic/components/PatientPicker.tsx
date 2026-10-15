"use client";
// Search-and-select for a patient, with "New patient" quick registration.
import { useId, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/FieldShell";
import { useDebounce } from "@/hooks/useDebounce";
import { usePatients } from "../hooks/useClinic";
import type { Patient } from "../services/clinicService";
import { ageGender } from "../utils/clinicMeta";

type PickedPatient = Pick<Patient, "id" | "name" | "mrn"> & Partial<Pick<Patient, "phone" | "age" | "dobEstimated" | "gender" | "allergies">>;

export interface PatientPickerProps {
  value: PickedPatient | null;
  onChange: (patient: PickedPatient | null) => void;
  /** Opens quick registration (rendered by the parent, outside its dialog), with the search text */
  onRegister?: (search: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function PatientPicker({ value, onChange, onRegister, error, disabled = false }: PatientPickerProps) {
  const id = useId();
  const [search, setSearch] = useState("");
  const term = useDebounce(search.trim(), 300);
  const { data, isFetching } = usePatients({ search: term, pageSize: 8 }, { enabled: !value && term.length >= 2 });
  const results = term.length >= 2 ? (data?.items ?? []) : [];

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Patient</span>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">{[value.mrn, ageGender(value.age, value.gender, value.dobEstimated), value.phone].filter(Boolean).join(" · ")}</p>
          </div>
          {!disabled && (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Change patient (${value.name})`}>
              <X className="h-4 w-4" aria-hidden="true" />
              Change
            </Button>
          )}
        </div>
        {value.allergies && <p className="text-xs font-medium text-red-700 dark:text-red-300">Allergies: {value.allergies}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Patient<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={id}
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Name, MRN, phone or email"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-controls={`${id}-results`}
            className={controlClass(error, "h-10 pl-9")}
          />
        </div>
        {onRegister && (
          <Button variant="secondary" onClick={() => onRegister(search.trim())}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            New patient
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div id={`${id}-results`} aria-live="polite">
        {term.length >= 2 && !isFetching && results.length === 0 && <p className="py-2 text-sm text-muted-foreground">No patients match “{term}”.</p>}
        {results.length > 0 && (
          <ul className="mt-1 max-h-56 divide-y overflow-y-auto rounded-lg border bg-card" aria-label="Matching patients">
            {results.map(patient => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => onChange(patient)}
                  disabled={!patient.isActive}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{patient.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[ageGender(patient.age, patient.gender, patient.dobEstimated), patient.phone, patient.isActive ? null : "Deactivated"].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{patient.mrn}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export type { PickedPatient };
