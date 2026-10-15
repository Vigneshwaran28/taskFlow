"use client";
import { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/cn";

/** The fields of a directory person (people feature) the picker shows. */
export interface PickablePerson {
  id: number;
  name: string;
  jobTitle?: string | null;
  email?: string;
  avatarUrl?: string | null;
}

export interface PeoplePickerProps {
  people: PickablePerson[];
  selected?: number[];
  /** Multiple choice */
  onToggle?: (id: number) => void;
  /** Single choice */
  onPick?: (id: number) => void;
  /** Accessible name for the list */
  label: string;
  /** With onToggle: selection is a single person (radio-like), confirmed by the caller's submit button */
  single?: boolean;
}

/** Presentational: searchable list of colleagues; single choice (onPick) or multiple (selected + onToggle). */
export function PeoplePicker({ people, selected = [], onToggle, onPick, label, single = false }: PeoplePickerProps) {
  const [filter, setFilter] = useState("");
  const filterId = useId();
  const term = filter.trim().toLowerCase();
  const visible = people.filter(person => !term || `${person.name} ${person.jobTitle ?? ""} ${person.email ?? ""}`.toLowerCase().includes(term));
  const multi = Boolean(onToggle);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={filterId} className="sr-only">
          Find people
        </label>
        <input
          id={filterId}
          type="search"
          autoFocus
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Search by name or title"
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <ul aria-label={label} className="max-h-72 divide-y overflow-y-auto rounded-lg border">
        {!visible.length && <li className="px-3 py-4 text-sm text-muted-foreground">No one matches “{filter}”.</li>}
        {visible.map(person => {
          const isSelected = selected.includes(person.id);
          return (
            <li key={person.id}>
              <button
                type="button"
                aria-pressed={multi ? isSelected : undefined}
                onClick={() => (multi ? onToggle?.(person.id) : onPick?.(person.id))}
                className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none", isSelected && "bg-accent/50")}
              >
                <Avatar name={person.name} imageUrl={person.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  {person.jobTitle && <span className="block truncate text-xs text-muted-foreground">{person.jobTitle}</span>}
                </span>
                {multi && (
                  <span
                    className={cn("flex h-5 w-5 items-center justify-center border", single ? "rounded-full" : "rounded", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input")}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
