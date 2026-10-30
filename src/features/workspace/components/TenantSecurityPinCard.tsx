"use client";
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { formatTimeAgo } from "@/lib/dates";
import { useRegenerateTenantAccessCode, useTenantAccessCode } from "../hooks/useWorkspace";

export function TenantSecurityPinCard() {
  const { data: codeData, isPending, error } = useTenantAccessCode();
  const regenerate = useRegenerateTenantAccessCode();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recentSuccess, setRecentSuccess] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-10 w-full bg-muted/60 rounded-lg" />
      </div>
    );
  }

  if (error || !codeData) {
    return null;
  }

  const displayCode = revealed ? codeData.code : "••••••••";

  async function handleCopy() {
    if (!codeData) return;
    try {
      await navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleRegenerate() {
    regenerate.mutate(undefined, {
      onSuccess: newCode => {
        setConfirmOpen(false);
        setRecentSuccess(`Security PIN regenerated to ${newCode.code}. The previous PIN is now deactivated.`);
        setTimeout(() => setRecentSuccess(null), 8000);
      },
    });
  }

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Workspace Security PIN / Access Code</h2>
              <p className="text-xs text-muted-foreground">
                Random unique code for user creations, invite verification, and direct tenant login.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Badge tone="success">
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              Active
            </Badge>
            <Badge tone="neutral">Shared Platform Registry</Badge>
          </div>
        </div>

        {recentSuccess && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{recentSuccess}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Current Tenant PIN
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                {displayCode}
              </span>
              <button
                type="button"
                onClick={() => setRevealed(v => !v)}
                className="rounded p-1 text-muted-foreground hover:text-foreground select-none touch-manipulation cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={revealed ? "Hide code" : "Reveal code"}
                aria-label={revealed ? "Hide code" : "Reveal code"}
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy PIN"}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Regenerate PIN</span>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 pt-1">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Times used</dt>
            <dd className="font-semibold tabular-nums text-foreground">{codeData.usageCount}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium text-success">Active &amp; valid</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium text-foreground">{formatDate(codeData.createdAt)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Last used</dt>
            <dd className="font-medium text-foreground">
              {codeData.lastUsedAt ? formatTimeAgo(codeData.lastUsedAt) : "Never used yet"}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground border-t pt-3">
          <strong>Tip:</strong> Users can enter this PIN on the main login screen to select and sign in to{" "}
          <span className="font-medium text-foreground">{codeData.tenantName}</span>, or use it during user
          creation without needing the workspace URL in advance.
        </p>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Regenerate workspace security PIN?"
        message="This will immediately soft-delete and deactivate the current PIN. Anyone who needs to register or sign in using this code must use the newly generated PIN."
        confirmLabel="Regenerate PIN"
        tone="primary"
        pending={regenerate.isPending}
        onConfirm={handleRegenerate}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
