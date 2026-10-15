"use client";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCan, useCurrentUser } from "@/features/auth";
import { usePeople } from "@/features/people";
import { useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from "../hooks/useSales";
import type { Customer, CustomerInput } from "../services/salesService";
import { EMAIL, isPhone, useFormErrors } from "../utils/formErrors";

type FormValues = Record<"name" | "company" | "email" | "phone" | "address" | "notes" | "ownerId", string>;

/** Mirrors customerSchema in server/src/routes/sales.js. */
function validateCustomer(values: FormValues) {
  const found: Record<string, string> = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  if (!name) found.name = "Name is required.";
  else if (name.length > 160) found.name = "Keep the name under 160 characters.";
  if (values.company.trim().length > 160) found.company = "Keep the company under 160 characters.";
  if (email && !EMAIL.test(email)) found.email = "Enter a valid email address.";
  if (phone.length > 40) found.phone = "Keep the phone number under 40 characters.";
  else if (phone && !isPhone(phone)) found.phone = "Enter a valid phone number.";
  if (values.address.trim().length > 300) found.address = "Keep the address under 300 characters.";
  if (values.notes.trim().length > 5000) found.notes = "Keep the notes under 5000 characters.";
  return found;
}

/** Feature component: create or edit a customer. Mount with a `key` to reset. */
export function CustomerFormDialog({ customer = null, onClose }: { customer?: Customer | null; onClose: () => void }) {
  const isEdit = Boolean(customer);
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const { data: people = [] } = usePeople();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const mutation = isEdit ? updateCustomer : createCustomer;
  const [confirming, setConfirming] = useState(false);
  const canDelete = useCan("sales.delete");
  const canEdit = useCan("sales.edit");
  const [values, setValues] = useState<FormValues>(() => ({
    name: customer?.name ?? "",
    company: customer?.company ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    notes: customer?.notes ?? "",
    ownerId: customer ? (customer.owner ? String(customer.owner.id) : "") : String(user?.id ?? ""),
  }));

  const errors = useFormErrors(fieldErrorsOf(mutation.error));
  const set = (name: keyof FormValues, value: string) => {
    setValues(current => ({ ...current, [name]: value }));
    errors.clear(name);
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || !canEdit) return;
    if (!errors.report(validateCustomer(values))) return;
    const input: CustomerInput = {
      name: values.name.trim(),
      company: values.company.trim() || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
      ownerId: values.ownerId ? Number(values.ownerId) : null,
    };
    const onSuccess = () => {
      toast.success(isEdit ? "Customer saved" : "Customer added");
      onClose();
    };
    if (customer) updateCustomer.mutate({ id: customer.id, changes: input }, { onSuccess });
    else createCustomer.mutate(input, { onSuccess });
  }

  function handleDelete() {
    if (!customer) return;
    deleteCustomer.mutate(customer.id, {
      onSuccess: () => {
        toast.success(`${customer.name} deleted`, "Their deals and orders are kept without a customer.");
        onClose();
      },
      onError: error => {
        setConfirming(false);
        toast.error("Couldn't delete the customer", error.message);
      },
    });
  }

  return (
    <>
      <Dialog
        open={!confirming}
        onClose={onClose}
        title={customer ? (canEdit ? `Edit ${customer.name}` : customer.name) : "New customer"}
        footer={
          <>
            {isEdit && canDelete && (
              <Button variant="ghost" className="mr-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button type="submit" form="customer-form" loading={mutation.isPending}>
                {isEdit ? "Save customer" : "Add customer"}
              </Button>
            )}
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert message={formErrorOf(mutation.error)} />
          <fieldset disabled={!canEdit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Contact name"
                id="customer-name"
                required
                autoFocus
                maxLength={160}
                value={values.name}
                error={errors.errorOf("name")}
                onChange={event => set("name", event.target.value)}
              />
              <TextField label="Company" id="customer-company" maxLength={160} value={values.company} error={errors.errorOf("company")} onChange={event => set("company", event.target.value)} />
              <TextField label="Email" id="customer-email" type="email" maxLength={255} value={values.email} error={errors.errorOf("email")} onChange={event => set("email", event.target.value)} />
              <TextField label="Phone" id="customer-phone" type="tel" maxLength={40} value={values.phone} error={errors.errorOf("phone")} onChange={event => set("phone", event.target.value)} />
            </div>
            <TextField label="Address" id="customer-address" maxLength={300} value={values.address} error={errors.errorOf("address")} onChange={event => set("address", event.target.value)} />
            <SelectField
              label="Account owner"
              id="customer-owner"
              value={values.ownerId}
              error={errors.errorOf("ownerId")}
              options={[{ value: "", label: "Nobody" }, ...people.map(person => ({ value: String(person.id), label: person.name }))]}
              onChange={event => set("ownerId", event.target.value)}
            />
            <TextAreaField label="Notes" id="customer-notes" rows={3} maxLength={5000} value={values.notes} error={errors.errorOf("notes")} onChange={event => set("notes", event.target.value)} />
          </fieldset>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${customer?.name ?? "customer"}?`}
        message="Their deals and orders stay, without a customer attached."
        pending={deleteCustomer.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
