import { Eye, Settings2 } from "lucide-react";
import { roleTone } from "@/features/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { UserSummary } from "../services/adminService";
import { formatCell } from "../utils/formatCell";

export interface UsersTableProps {
  users: UserSummary[];
  onViewUser: (userId: number) => void;
  onManageUser: (userId: number) => void;
}

/** Presentational: one row per user of a tenant, with how much data each one owns. */
export function UsersTable({ users, onViewUser, onManageUser }: UsersTableProps) {
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Users and the data they own</caption>
        <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              User
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Roles
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Lists
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
              Tasks (open)
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Notifications
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Joined
            </th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map(user => (
            <tr key={user.id} className={cn("hover:bg-muted/40", !user.isActive && "bg-muted/30")}>
              <td className="px-3 py-2">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {user.name}
                  {!user.isActive && <Badge tone="danger">Deactivated</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{user.id} · {user.email}
                  {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                </p>
              </td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap gap-1">
                  {user.roles.length ? (
                    user.roles.map(role => (
                      <Badge key={role.name} tone={roleTone(role)}>
                        {role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No role</span>
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{user.lists}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {user.tasks} <span className="text-muted-foreground">({user.openTasks})</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{user.notifications}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatCell("created_at", user.createdAt)}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onViewUser(user.id)} aria-label={`View ${user.name}'s data`}>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Data
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onManageUser(user.id)} aria-label={`Manage ${user.name}`}>
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    Manage
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
