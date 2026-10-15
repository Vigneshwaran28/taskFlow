"use client";
import { KeyRound, Link2, X } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatTimeAgo } from "@/lib/dates";
import { useDismissPasswordRequest, usePasswordRequests } from "../hooks/useUsers";
import { isOpenResetRequest, type PasswordResetRequest } from "../services/userService";
import type { PasswordResetMode } from "./PasswordResetDialog";

export interface PasswordRequestsPanelProps {
  onReset: (user: PasswordResetRequest["user"], mode: PasswordResetMode) => void;
}

function requestSummary(request: PasswordResetRequest) {
  if (request.status === "issued") {
    const by = request.issuedBy ? ` by ${request.issuedBy.name}` : "";
    return `Link sent${by}${request.issuedAt ? ` ${formatTimeAgo(request.issuedAt)}` : ""} · expires ${formatDateTime(request.expiresAt)}`;
  }
  const when = request.requestedAt ? `Asked ${formatTimeAgo(request.requestedAt)}` : "Asked";
  return request.requestedIp ? `${when} from ${request.requestedIp}` : when;
}

/** Feature component: people who asked for a password reset from the sign-in page. Hidden when there are none. */
export function PasswordRequestsPanel({ onReset }: PasswordRequestsPanelProps) {
  const toast = useToast();
  const { data } = usePasswordRequests();
  const dismiss = useDismissPasswordRequest();
  const open = (data ?? []).filter(isOpenResetRequest);
  if (!open.length) return null;

  function handleDismiss(request: PasswordResetRequest) {
    dismiss.mutate(request.id, {
      onSuccess: () => toast.success("Request dismissed", request.status === "issued" ? `The link sent to ${request.user.name} no longer works.` : undefined),
      onError: err => toast.error("Couldn't dismiss the request", err.message),
    });
  }

  return (
    <section aria-labelledby="password-requests-heading" className="overflow-hidden rounded-xl border border-amber-500/40 bg-card">
      <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-3">
        <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <h2 id="password-requests-heading" className="text-sm font-semibold">
          Password reset requests
        </h2>
        <Badge tone="warning">
          <span className="tabular-nums">{open.length}</span>
          <span className="sr-only"> open</span>
        </Badge>
      </div>
      <ul className="divide-y">
        {open.map(request => (
          <li key={request.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={request.user.name} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{request.user.name}</span>
                  {request.status === "issued" ? <Badge tone="info">Link sent</Badge> : <Badge tone="warning">Waiting</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {request.user.email}
                  {request.user.jobTitle ? ` · ${request.user.jobTitle}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{requestSummary(request)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button size="sm" onClick={() => onReset(request.user, "link")}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {request.status === "issued" ? "New reset link" : "Create reset link"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onReset(request.user, "temporary")}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Set temporary password
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDismiss(request)} disabled={dismiss.isPending} aria-label={`Dismiss ${request.user.name}'s request`}>
                <X className="h-4 w-4" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
