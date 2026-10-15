"use client";
import { useRouter } from "@/lib/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { parseWorkspaceAddress, workspaceLoginPath } from "../utils/rememberedWorkspace";

/** "Signing in to a specific workspace?": type its address, go to its own sign-in page. */
export function WorkspaceAddressForm({ from = null, collapsible = false }: { from?: string | null; collapsible?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(!collapsible);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const slug = parseWorkspaceAddress(address);
    if (!slug) {
      setError("Use the workspace address, e.g. acme (letters, numbers, and dashes).");
      return;
    }
    router.push(`${workspaceLoginPath(slug)}${from ? `?from=${encodeURIComponent(from)}` : ""}`);
  }

  if (!open) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Signing in to a specific workspace?{" "}
        <button type="button" onClick={() => setOpen(true)} className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Enter its address
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
      <label htmlFor={`${id}-address`} className="text-sm font-medium">
        Workspace address
      </label>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-input bg-card pl-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            /
          </span>
          <input
            id={`${id}-address`}
            autoFocus={collapsible}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="acme"
            maxLength={200}
            value={address}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            onChange={event => {
              setAddress(event.target.value);
              setError(null);
            }}
            className="h-9 min-w-0 flex-1 bg-transparent pr-3 focus-visible:outline-none"
          />
        </div>
        <Button type="submit" size="md" className="h-9">
          Go
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Your administrator can tell you the address, or paste the full sign-in link.
        </p>
      )}
    </form>
  );
}
