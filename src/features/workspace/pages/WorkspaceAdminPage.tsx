"use client";
// The workspace admin's home: plan and seats, who is (and isn't) signing in, roles, the restrictions in force,
// what needs attention, and recent changes, with a way into each admin screen.
import Link from "@/components/navigation/Link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, KeyRound, LogIn, ScrollText, Settings, ShieldCheck, UserCog, UserPlus, Users, UserX } from "lucide-react";
import { MODULES } from "@/app-shell/modules";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { AUDIT_ACTIONS } from "@/features/access";
import { useCan } from "@/features/auth";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { useWorkspaceOverview } from "../hooks/useWorkspace";
import type { WorkspaceOverview } from "../services/workspaceService";

const sessionLabel = (hours: number) => (hours % 24 === 0 ? `${hours / 24} day${hours === 24 ? "" : "s"}` : `${hours} hours`);

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

/** Things an admin should act on, most urgent first. */
function attentionItems(data: WorkspaceOverview, canUsers: boolean) {
  const items: { text: string; href: string; tone: "danger" | "warning" }[] = [];
  const { subscription, seats, people } = data;
  if (subscription.state === "expired") items.push({ text: "Your subscription has ended. Contact your provider to renew.", href: "/settings?tab=workspace", tone: "danger" });
  if (subscription.state === "grace") items.push({ text: `Your subscription ended on ${formatDate(subscription.endsOn)}. Access stops after ${formatDate(subscription.graceEndsOn)}.`, href: "/settings?tab=workspace", tone: "danger" });
  if (subscription.state === "ending") items.push({ text: `Your subscription ends in ${subscription.daysLeft} day${subscription.daysLeft === 1 ? "" : "s"} (${formatDate(subscription.endsOn)}).`, href: "/settings?tab=workspace", tone: "warning" });
  if (canUsers && data.openPasswordRequests) items.push({ text: `${data.openPasswordRequests} password reset request${data.openPasswordRequests === 1 ? "" : "s"} waiting.`, href: "/users", tone: "warning" });
  if (canUsers && seats.limit != null && seats.used >= seats.limit) items.push({ text: `All ${seats.limit} seats are in use. Deactivate someone or ask your provider for more.`, href: "/users", tone: "warning" });
  if (canUsers && people.temporaryPassword) items.push({ text: `${people.temporaryPassword} ${people.temporaryPassword === 1 ? "person is" : "people are"} still on a temporary password.`, href: "/users", tone: "warning" });
  return items;
}

export function WorkspaceAdminPage() {
  const { data, isPending, error, refetch } = useWorkspaceOverview();
  const canUsers = useCan("workspace.users.manage");
  const canRoles = useCan("workspace.roles.manage", "workspace.users.manage");
  const canSettings = useCan("workspace.settings.manage");
  const canAudit = useCan("workspace.audit.view");

  if (isPending) return <LoadingState label="Loading your workspace…" />;
  if (error || !data) return <ErrorState message="Unable to load the workspace overview." onRetry={() => void refetch()} />;

  const { seats, people, subscription, security, modules } = data;
  const attention = attentionItems(data, canUsers);
  const seatShare = seats.limit ? Math.min(100, (seats.used / seats.limit) * 100) : 0;
  const switchedOff = modules.licensed.filter(key => !modules.enabled.includes(key));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspace admin"
        description={`Manage ${data.workspace.name}: people, access, restrictions, and activity.`}
        actions={
          canUsers ? (
            <Link href="/users" className={buttonClass("primary", "md")}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add people
            </Link>
          ) : undefined
        }
      />

      {attention.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Needs attention">
          {attention.map(item => (
            <li key={item.text}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.tone === "danger" ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                )}
              >
                <AlertTriangle className={cn("h-4 w-4 shrink-0", item.tone === "danger" ? "text-destructive" : "text-amber-600 dark:text-amber-400")} aria-hidden="true" />
                <span className="flex-1">{item.text}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active people" value={seats.limit != null ? `${seats.used} / ${seats.limit}` : seats.used} icon={Users} href={canUsers ? "/users" : undefined} hint={seats.limit != null ? "Seats on your plan" : "No seat limit"} />
        <StatCard label="Signed in this week" value={people.signedInLast7Days} icon={LogIn} tone="success" hint={`of ${people.active} active`} />
        <StatCard label="Never signed in" value={people.neverSignedIn} icon={UserX} tone={people.neverSignedIn ? "warning" : "primary"} href={canUsers ? "/users" : undefined} />
        <StatCard label="Temporary passwords" value={people.temporaryPassword} icon={KeyRound} tone={people.temporaryPassword ? "warning" : "primary"} href={canUsers ? "/users" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Plan">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{subscription.plan || "Standard"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renewal</dt>
              <dd className="flex items-center gap-2 font-medium">
                <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {subscription.endsOn ? `Ends ${formatDate(subscription.endsOn)}` : "No end date"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Seats</dt>
              <dd className="mt-1">
                <span className="font-medium tabular-nums">
                  {seats.used}
                  {seats.limit != null ? ` of ${seats.limit}` : ""} active
                </span>
                <span className="text-muted-foreground"> · {people.deactivated} deactivated (no seat)</span>
                {seats.limit != null && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
                    <div className={cn("h-full rounded-full", seatShare >= 100 ? "bg-destructive" : "bg-primary")} style={{ width: `${seatShare}%` }} />
                  </div>
                )}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">Modules on your plan and seat limits are set by your provider.</p>
        </Panel>

        <Panel title="Restrictions" action={canSettings ? <PanelLink href="/settings?tab=restrictions">Change</PanelLink> : undefined}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Passwords</dt>
              <dd className="font-medium">
                {security.passwordMinLength}+ characters{security.passwordRequireMixed ? ", letters and numbers" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sessions last</dt>
              <dd className="font-medium">{sessionLabel(security.sessionHours)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Email domains</dt>
              <dd className="font-medium">{security.allowedEmailDomains.length ? security.allowedEmailDomains.map(domain => `@${domain}`).join(", ") : "Any domain"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Modules</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {modules.licensed.map(key => (
                  <Badge key={key} tone={modules.enabled.includes(key) ? "success" : "neutral"}>
                    {MODULES[key]?.label ?? key}
                    {!modules.enabled.includes(key) && " (off)"}
                  </Badge>
                ))}
              </dd>
              {switchedOff.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Switched-off modules keep their data.</p>}
            </div>
          </dl>
        </Panel>

        <Panel title="Roles" action={canRoles ? <PanelLink href="/roles">Roles &amp; access</PanelLink> : undefined}>
          <ul className="divide-y rounded-lg border">
            {data.roles.map(role => (
              <li key={role.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {role.name}
                  {!role.isSystem && <Badge>Custom</Badge>}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {role.members} {role.members === 1 ? "person" : "people"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {data.recentActivity ? (
          <Panel title="Recent changes" action={canAudit ? <PanelLink href="/audit">Audit log</PanelLink> : undefined}>
            {data.recentActivity.length ? (
              <ul className="flex flex-col gap-3">
                {data.recentActivity.map(entry => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{entry.actor ?? "Someone"}</span> {(AUDIT_ACTIONS[entry.action]?.label ?? entry.action).toLowerCase()}
                      {entry.target ? <span className="text-muted-foreground">: {entry.target}</span> : null}
                      <span className="block text-xs text-muted-foreground">{formatTimeAgo(entry.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            )}
          </Panel>
        ) : (
          <Panel title="Admin screens">
            <AdminLinks canUsers={canUsers} canRoles={canRoles} canSettings={canSettings} canAudit={canAudit} />
          </Panel>
        )}
      </div>

      {data.recentActivity && (
        <Panel title="Admin screens">
          <AdminLinks canUsers={canUsers} canRoles={canRoles} canSettings={canSettings} canAudit={canAudit} />
        </Panel>
      )}
    </div>
  );
}

function AdminLinks({ canUsers, canRoles, canSettings, canAudit }: { canUsers: boolean; canRoles: boolean; canSettings: boolean; canAudit: boolean }) {
  const links = [
    canUsers && { href: "/users", icon: UserCog, label: "Manage users", text: "Add, import, edit, deactivate, reset passwords, sign out." },
    canRoles && { href: "/roles", icon: ShieldCheck, label: "Roles & access", text: "What each role can do, and custom roles." },
    canSettings && { href: "/settings?tab=restrictions", icon: KeyRound, label: "Security & restrictions", text: "Password rules, session length, email domains, modules." },
    canSettings && { href: "/settings?tab=modules", icon: Settings, label: "Module settings", text: "Branding, company details, working days, and more." },
    canAudit && { href: "/audit", icon: ScrollText, label: "Audit log", text: "Who changed access, settings, and approvals." },
  ].filter(Boolean) as { href: string; icon: typeof Users; label: string; text: string }[];
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {links.map(({ href, icon: Icon, label, text }) => (
        <li key={label}>
          <Link href={href} className="flex h-full items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
