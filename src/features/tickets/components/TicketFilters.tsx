import { Search } from "lucide-react";
import type { SelectOption } from "@/components/ui/SelectField";
import { PRIORITY_OPTIONS } from "@/features/tasks";
import { SORT_OPTIONS, STATUS_FILTERS, TICKET_CATEGORIES, toOptions } from "../utils/ticketMeta";

const selectClass = "h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface TicketFilterValues {
  search: string;
  status: string;
  priority: string;
  category: string;
  sort: string;
}

/** URL parameter names the filter bar changes ("q" is the search text). */
export type TicketFilterName = "q" | "status" | "priority" | "category" | "sort";

/** Presentational filter bar. Values come from the page's URL state. */
export function TicketFilters({ values, onChange }: { values: TicketFilterValues; onChange: (name: TicketFilterName, value: string) => void }) {
  const priorityOptions: readonly SelectOption[] = PRIORITY_OPTIONS;
  const selects: { id: string; name: Exclude<TicketFilterName, "q">; label: string; options: readonly SelectOption[] }[] = [
    { id: "ticket-status", name: "status", label: "Status", options: STATUS_FILTERS },
    { id: "ticket-priority", name: "priority", label: "Priority", options: [{ value: "", label: "All priorities" }, ...priorityOptions] },
    { id: "ticket-category", name: "category", label: "Category", options: [{ value: "", label: "All categories" }, ...toOptions(TICKET_CATEGORIES)] },
    { id: "ticket-sort", name: "sort", label: "Sort by", options: SORT_OPTIONS },
  ];

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="ticket-search" className="sr-only">
          Search tickets
        </label>
        <input
          id="ticket-search"
          type="search"
          value={values.search}
          onChange={event => onChange("q", event.target.value)}
          placeholder="Search subject, description, or TKT-0042"
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {selects.map(select => (
          <span key={select.id}>
            <label htmlFor={select.id} className="sr-only">
              {select.label}
            </label>
            <select id={select.id} value={values[select.name]} onChange={event => onChange(select.name, event.target.value)} className={selectClass}>
              {select.options.map(option => (
                <option key={option.value} value={option.value}>
                  {select.name === "sort" ? `Sort: ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </span>
        ))}
      </div>
    </div>
  );
}
