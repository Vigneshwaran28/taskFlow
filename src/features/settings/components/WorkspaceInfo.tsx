"use client";
import Link from "@/components/navigation/Link";
import { Check, Lock } from "lucide-react";
import { MODULES, MODULE_KEYS } from "@/app-shell/modules";
import { useManagedUsers } from "@/features/users";
import type { SessionTenant } from "@/types/session";

/** The workspace's plan: name, seats, and which modules are included (user managers). */
export function WorkspaceInfo({ tenant }: { tenant: Pick<SessionTenant, "name" | "features"> }) {
  const { data } = useManagedUsers();
  const seats = data?.seats;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Workspace</dt>
          <dd className="font-medium">{tenant.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Active users</dt>
          <dd className="font-medium tabular-nums">
            {seats ? `${seats.used}${seats.limit != null ? ` of ${seats.limit}` : " (no limit)"}` : "…"}{" "}
            <Link href="/users" className="ml-1 text-sm font-normal text-primary hover:underline">
              Manage users
            </Link>
          </dd>
        </div>
      </dl>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Modules">
        {MODULE_KEYS.map(key => {
          const enabled = tenant.features.includes(key);
          const Icon = enabled ? Check : Lock;
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <Icon className={enabled ? "h-4 w-4 text-success" : "h-4 w-4 text-muted-foreground"} aria-hidden="true" />
              <span className={enabled ? "" : "text-muted-foreground"}>{MODULES[key].label}</span>
              <span className="sr-only">{enabled ? "(enabled)" : "(not included)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
