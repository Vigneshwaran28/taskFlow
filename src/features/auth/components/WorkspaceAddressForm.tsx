"use client";
import { useRouter } from "@/lib/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { withTenant } from "@/lib/tenantPath";
import type { SessionUser } from "@/types/session";
import { parseWorkspaceAddress, rememberWorkspace, safeRedirect, workspaceLoginPath } from "../utils/rememberedWorkspace";

/** "Signing in to a specific workspace?": type its address, go to its own sign-in page, or log in with code. */
export function WorkspaceAddressForm({ from = null, collapsible = false }: { from?: string | null; collapsible?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(!collapsible);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Enter a workspace address or login access code.");
      return;
    }

    if (trimmed.toUpperCase().startsWith("TF-") || /^\d{6}$/.test(trimmed)) {
      setLoading(true);
      try {
        const { apiClient } = await import("@/lib/apiClient");
        // Attempt direct user login using the unique code
        const loggedInUser = await apiClient.post<SessionUser>("/auth/code-login", { code: trimmed });
        if (loggedInUser?.tenant?.slug) {
          rememberWorkspace(loggedInUser.tenant.slug);
          window.location.href = withTenant(loggedInUser.tenant.slug, safeRedirect(from));
          return;
        }
      } catch (err: unknown) {
        // If not direct user login (e.g. requires password or tenant-level PIN), verify code
        try {
          const { apiClient } = await import("@/lib/apiClient");
          const res = await apiClient.post<{ valid: boolean; tenant: { slug: string } }>("/auth/verify-code", { code: trimmed });
          if (res?.valid && res.tenant?.slug) {
            router.push(`${workspaceLoginPath(res.tenant.slug)}${from ? `?from=${encodeURIComponent(from)}` : ""}`);
            return;
          }
        } catch {
          setError(err instanceof Error ? err.message : "Invalid or expired login code / PIN.");
          setLoading(false);
          return;
        }
        setError(err instanceof Error ? err.message : "Invalid or expired login code / PIN.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    const slug = parseWorkspaceAddress(address);
    if (!slug) {
      setError("Use the workspace address (e.g. acme) or login code (e.g. TF-491297).");
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
        Workspace address or Security PIN
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
            placeholder="acme or TF-749210"
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
        <Button type="submit" size="md" className="h-9" loading={loading}>
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
