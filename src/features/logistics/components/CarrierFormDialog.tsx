"use client";
import { useId, useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useSaveCarrier } from "../hooks/useLogistics";
import type { Carrier } from "../services/logisticsService";
import { textOrNull } from "../utils/logisticsMeta";
import { compact, emailError, phoneError, without, type Errors } from "../utils/validateLogistics";

export function CarrierFormDialog({ carrier, onClose }: { carrier?: Carrier; onClose: () => void }) {
  const toast = useToast();
  const formId = useId();
  const mutation = useSaveCarrier();
  const [name, setName] = useState(carrier?.name ?? "");
  const [code, setCode] = useState(carrier?.code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(carrier?.trackingUrl ?? "");
  const [phone, setPhone] = useState(carrier?.phone ?? "");
  const [email, setEmail] = useState(carrier?.email ?? "");
  const [isActive, setIsActive] = useState(carrier?.isActive ?? true);
  const [localErrors, setLocalErrors] = useState<Errors>({});
  const [edited, setEdited] = useState<string[]>([]);
  const errors = { ...without(fieldErrorsOf(mutation.error), edited), ...localErrors };
  /** Wraps a setter so editing a field clears its error. */
  const edit =
    (field: string, setter: (value: string) => void) =>
    (event: { target: { value: string } }) => {
      setter(event.target.value);
      setLocalErrors(current => without(current, [field]));
      setEdited(current => (current.includes(field) ? current : [...current, field]));
    };

  function submit(event: FormEvent) {
    event.preventDefault();
    const url = trackingUrl.trim();
    const next = compact({
      name: name.trim() ? null : "Name is required.",
      trackingUrl: !url ? null : !/^https?:\/\/\S+$/i.test(url) ? "Enter a web address starting with http:// or https://." : !url.includes("{code}") ? "Include {code} where the tracking number goes." : null,
      phone: phoneError(phone),
      email: emailError(email),
    });
    setLocalErrors(next);
    if (Object.keys(next).length) return;
    setEdited([]);
    mutation.mutate(
      { id: carrier?.id, input: { name: name.trim(), code: textOrNull(code), trackingUrl: textOrNull(trackingUrl), phone: textOrNull(phone), email: textOrNull(email), isActive } },
      {
        onSuccess: saved => {
          toast.success(carrier ? `${saved.name} updated` : `${saved.name} added`);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={carrier ? `Edit ${carrier.name}` : "Add carrier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {carrier ? "Save changes" : "Add carrier"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <FormAlert message={formErrorOf(mutation.error)} />
        </div>
        <TextField label="Name" required value={name} onChange={edit("name", setName)} maxLength={120} error={errors.name} />
        <TextField label="Code" value={code} onChange={edit("code", setCode)} maxLength={30} placeholder="e.g. DHL" error={errors.code} />
        <TextField
          label="Tracking URL"
          type="url"
          value={trackingUrl}
          onChange={edit("trackingUrl", setTrackingUrl)}
          maxLength={300}
          placeholder="https://carrier.example/track?id={code}"
          hint="Must contain {code}: it's replaced with the shipment's carrier reference."
          className="sm:col-span-2"
          error={errors.trackingUrl}
        />
        <TextField label="Phone" type="tel" value={phone} onChange={edit("phone", setPhone)} maxLength={40} error={errors.phone} />
        <TextField label="Email" type="email" value={email} onChange={edit("email", setEmail)} maxLength={254} error={errors.email} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4 accent-primary" />
          Active: can be chosen for new shipments
        </label>
      </form>
    </Dialog>
  );
}
