"use client";
import { useRouter } from "@/lib/navigation";
import { useId, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const CODE_PATTERN = /^[A-Z0-9]{6,24}$/;

/** Tracking-code input that opens /track/<CODE>. */
export function TrackingLookupForm({ label = "Tracking code", submitLabel = "Track", autoFocus = false }: { label?: string; submitLabel?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.replace(/[\s-]/g, "").toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      setError("Enter the 6–24 letter and number code from your receipt or message.");
      return;
    }
    router.push(`/track/${normalized}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate role="search" aria-label="Track a shipment">
      <TextField
        id={id}
        label={label}
        value={code}
        onChange={event => {
          setCode(event.target.value);
          setError(null);
        }}
        placeholder="e.g. 7KQ2M9XPRT"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={40}
        autoFocus={autoFocus}
        className="flex-1"
        error={error}
      />
      <Button type="submit" className="sm:mt-7">
        <Search className="h-4 w-4" aria-hidden="true" />
        {submitLabel}
      </Button>
    </form>
  );
}
