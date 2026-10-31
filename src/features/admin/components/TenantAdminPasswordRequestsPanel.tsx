"use client";
import { useState } from "react";
import { Check, Copy, Link2, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useCreateAdminResetLink, useDismissAdminPasswordRequest, useTenantAdminPasswordRequests } from "../hooks/useAdmin";
import type { ResetLink, TenantAdminPasswordRequest } from "../services/adminService";

export function TenantAdminPasswordRequestsPanel() {
  const toast = useToast();
  const { data: requests = [] } = useTenantAdminPasswordRequests();
  const dismiss = useDismissAdminPasswordRequest();
  const createResetLink = useCreateAdminResetLink();

  const [activeLink, setActiveLink] = useState<{ request: TenantAdminPasswordRequest; link: ResetLink } | null>(null);
  const [copied, setCopied] = useState(false);

  const openRequests = requests.filter(r => r.status === "requested" || r.status === "issued");
  if (!openRequests.length) return null;

  function handleCreateLink(request: TenantAdminPasswordRequest) {
    createResetLink.mutate(
      { id: request.user.id, tenantId: request.tenant.id, expiresInHours: 24 },
      {
        onSuccess: link => {
          setActiveLink({ request, link });
          toast.success("Reset link created", `One-time link generated for ${request.user.name}.`);
        },
        onError: err => toast.error("Couldn't create reset link", err.message),
      }
    );
  }

  function handleDismiss(request: TenantAdminPasswordRequest) {
    dismiss.mutate(request.id, {
      onSuccess: () => toast.success("Request dismissed", `Password reset request for ${request.user.name} dismissed.`),
      onError: err => toast.error("Couldn't dismiss request", err.message),
    });
  }

  function handleCopy(url: string) {
    const full = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(full);
    setCopied(true);
    toast.success("Reset link copied", "Share this secure link with the workspace admin.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section
        aria-labelledby="tenant-admin-resets-heading"
        className="overflow-hidden rounded-xl border border-amber-500/40 bg-card shadow-sm"
      >
        <div className="flex items-center justify-between border-b bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 id="tenant-admin-resets-heading" className="text-sm font-semibold text-foreground">
              Tenant Admin Password Reset Requests
            </h2>
            <Badge tone="warning">
              <span className="tabular-nums">{openRequests.length}</span>
              <span className="sr-only"> open requests</span>
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Escalated to overall admin (/bunny)
          </span>
        </div>

        <ul className="divide-y">
          {openRequests.map(request => {
            const when = request.requestedAt ? `Asked ${formatTimeAgo(request.requestedAt)}` : "Asked";
            const details = request.requestedIp ? `${when} from ${request.requestedIp}` : when;

            return (
              <li key={request.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={request.user.name} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{request.user.name}</span>
                      <Badge tone="primary">{request.tenant.name}</Badge>
                      {request.status === "issued" ? (
                        <Badge tone="info">Link issued</Badge>
                      ) : (
                        <Badge tone="warning">Waiting for reset link</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {request.user.email}
                      {request.user.jobTitle ? ` · ${request.user.jobTitle}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{details}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    loading={createResetLink.isPending}
                    onClick={() => handleCreateLink(request)}
                  >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    {request.status === "issued" ? "Generate new link" : "Create reset link"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={dismiss.isPending}
                    onClick={() => handleDismiss(request)}
                    aria-label={`Dismiss request from ${request.user.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Dismiss
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {activeLink && (
        <Dialog
          open
          onClose={() => setActiveLink(null)}
          title="Reset link ready for Tenant Admin"
          description={`One-time password reset link for ${activeLink.request.user.name} (${activeLink.request.tenant.name}).`}
          footer={<Button onClick={() => setActiveLink(null)}>Done</Button>}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <TextField
                label="Reset link"
                id="bunny-reset-link-url"
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}${activeLink.link.url}` : activeLink.link.url}
                className="flex-1 font-mono text-xs"
                onFocus={e => e.currentTarget.select()}
              />
              <Button
                variant="secondary"
                onClick={() => handleCopy(activeLink.link.url)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <div className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p>
                  This link expires at <strong>{formatDateTime(activeLink.link.expiresAt)}</strong> and can be used once.
                </p>
                <p className="text-muted-foreground">
                  Share this link directly with the workspace administrator so they can set a new password.
                </p>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
