"use client";
import { useId, useState, type KeyboardEvent } from "react";
import { Building2, Check, Plus, Search, UserRound } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useDebounce } from "@/hooks/useDebounce";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useBillingCustomers, useCreateBillingCustomer } from "../hooks/useBilling";
import type { Customer } from "../services/billingService";
import { contactErrors } from "../utils/formErrors";

const EMPTY_NEW = { name: "", company: "", email: "", phone: "", address: "" };

export interface CustomerPickerProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  /** Can create customers (billing.edit) */
  canCreate: boolean;
  error?: string | null;
}

/** Search existing customers, or add one inline. Lives inside the document form, so it uses no <form> of its own. */
export function CustomerPicker({ value, onChange, canCreate, error }: CustomerPickerProps) {
  const baseId = useId();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 250);
  const { data: customers = [], isPending, isFetching } = useBillingCustomers(debounced, { enabled: !value });
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_NEW);
  const [draftError, setDraftError] = useState<Record<string, string>>({});
  const createCustomer = useCreateBillingCustomer();
  const serverErrors = fieldErrorsOf(createCustomer.error);

  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-full bg-accent p-2 text-accent-foreground">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium">{value.name}</p>
            {value.company && <p className="text-muted-foreground">{value.company}</p>}
            {[value.email, value.phone].filter(Boolean).length > 0 && <p className="text-muted-foreground">{[value.email, value.phone].filter(Boolean).join(" · ")}</p>}
            {value.address && <p className="whitespace-pre-line text-muted-foreground">{value.address}</p>}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  function updateDraft(field: keyof typeof EMPTY_NEW, text: string) {
    setDraft(current => ({ ...current, [field]: text }));
    setDraftError(current => ({ ...current, [field]: "" }));
    if (createCustomer.error) createCustomer.reset();
  }

  function create() {
    if (createCustomer.isPending) return;
    // Mirrors customerSchema in server/src/routes/billing.js.
    const errors = contactErrors(draft);
    if (draft.company.trim().length > 160) errors.company = "Keep the company under 160 characters.";
    if (draft.address.trim().length > 300) errors.address = "Keep the address under 300 characters.";
    setDraftError(errors);
    createCustomer.reset();
    if (Object.keys(errors).length) return;
    createCustomer.mutate(
      {
        name: draft.name.trim(),
        company: draft.company.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
      },
      {
        onSuccess: customer => {
          setCreating(false);
          setDraft(EMPTY_NEW);
          onChange(customer);
        },
      }
    );
  }

  // Enter in the inline fields creates the customer instead of submitting the document form.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      create();
    }
  }

  if (creating) {
    return (
      <div role="group" aria-labelledby={`${baseId}-new`} onKeyDown={handleKeyDown} className="flex flex-col gap-3 rounded-lg border p-3">
        <p id={`${baseId}-new`} className="text-sm font-medium">
          New customer
        </p>
        <FormAlert message={formErrorOf(createCustomer.error)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name" required autoFocus maxLength={160} value={draft.name} error={draftError.name || serverErrors.name} onChange={event => updateDraft("name", event.target.value)} />
          <TextField label="Company" maxLength={160} value={draft.company} error={draftError.company || serverErrors.company} onChange={event => updateDraft("company", event.target.value)} />
          <TextField label="Email" type="email" maxLength={160} value={draft.email} error={draftError.email || serverErrors.email} onChange={event => updateDraft("email", event.target.value)} />
          <TextField label="Phone" type="tel" maxLength={40} value={draft.phone} error={draftError.phone || serverErrors.phone} onChange={event => updateDraft("phone", event.target.value)} />
          <TextAreaField label="Address" rows={2} maxLength={300} className="sm:col-span-2" value={draft.address} error={draftError.address || serverErrors.address} onChange={event => updateDraft("address", event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCreating(false);
              createCustomer.reset();
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={create} loading={createCustomer.isPending}>
            <Check className="h-4 w-4" aria-hidden="true" />
            Add customer
          </Button>
        </div>
      </div>
    );
  }

  const listId = `${baseId}-results`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          label="Find a customer"
          type="search"
          className="flex-1"
          placeholder="Name, company, or email"
          value={search}
          maxLength={100}
          error={error}
          aria-controls={listId}
          onChange={event => setSearch(event.target.value)}
        />
        {canCreate && (
          <Button variant="secondary" onClick={() => setCreating(true)} className={error ? "sm:mb-7" : undefined}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New customer
          </Button>
        )}
      </div>
      <div id={listId} aria-live="polite" aria-busy={isFetching} className="max-h-56 overflow-y-auto rounded-lg border">
        {isPending ? (
          <p className="p-3 text-sm text-muted-foreground">Loading customers…</p>
        ) : customers.length ? (
          <ul className={cn("divide-y", isFetching && "opacity-60")}>
            {customers.slice(0, 50).map(customer => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onChange(customer)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{customer.name}</span>
                    {(customer.company || customer.email) && (
                      <span className="block truncate text-xs text-muted-foreground">{[customer.company, customer.email].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" aria-hidden="true" />
            {debounced ? `No customers match “${debounced}”.` : "No customers yet."}
          </p>
        )}
      </div>
    </div>
  );
}
