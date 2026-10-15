"use client";
import Link from "@/components/navigation/Link";
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import {
  Boxes,
  CalendarCheck,
  CalendarRange,
  Contact,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Gauge,
  LifeBuoy,
  Megaphone,
  MessagesSquare,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  StickyNote,
  Stethoscope,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/cn";
import { useIsActive } from "@/lib/navigation";
import { useAnnouncements } from "@/features/announcements";
import { useCurrentUser, useSiteTitle } from "@/features/auth";
import { colorFor, useLists } from "@/features/lists";
import { useUnreadMessages } from "@/features/messaging";
import { TASK_VIEWS } from "@/features/tasks";
import { useTicketStats } from "@/features/tickets";
import type { FeatureKey } from "@/types/session";
import { canOpenModule } from "./modules";

const navLinkClass = (isActive: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

interface NavItemProps {
  href: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  exact?: boolean;
  onNavigate: () => void;
  count?: number;
  countLabel?: string;
}

function NavItem({ href, icon: Icon, children, exact, onNavigate, count = 0, countLabel }: NavItemProps) {
  const active = useIsActive(href, exact);
  return (
    <Link href={href} className={navLinkClass(active)} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="flex-1 truncate">{children}</span>
      {count > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary" aria-label={countLabel}>
          {count}
        </span>
      )}
    </Link>
  );
}

function Section({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {action}
      </div>
      {children}
    </nav>
  );
}

function ListLink({ id, name, color, openCount, onNavigate }: { id: number; name: string; color: string; openCount: number; onNavigate: () => void }) {
  const active = useIsActive(`/lists/${id}`);
  return (
    <Link href={`/lists/${id}`} className={navLinkClass(active)} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorFor(color).dot)} aria-hidden="true" />
      <span className="flex-1 truncate">{name}</span>
      {openCount > 0 && <span className="text-xs tabular-nums text-muted-foreground">{openCount}</span>}
    </Link>
  );
}

/** Task views and lists. Rendered only when the workspace has the tasks module, so lists load only then. */
function TasksNav({ onNavigate }: { onNavigate: () => void }) {
  const { data: lists = [] } = useLists();
  const onListsPage = useIsActive("/lists", true);
  return (
    <>
      <Section label="Tasks">
        {Object.entries(TASK_VIEWS).map(([key, view]) => (
          <NavItem key={key} href={`/tasks/${key}`} icon={view.icon} onNavigate={onNavigate}>
            {view.label}
          </NavItem>
        ))}
        <NavItem href="/calendar" icon={CalendarRange} onNavigate={onNavigate}>
          Calendar
        </NavItem>
      </Section>
      <Section
        label="Lists"
        action={
          <Link
            href="/lists"
            onClick={onNavigate}
            aria-current={onListsPage ? "page" : undefined}
            className={cn("rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", onListsPage && "underline")}
            aria-label="Manage lists"
          >
            Manage
          </Link>
        }
      >
        {lists.map(list => (
          <ListLink key={list.id} id={list.id} name={list.name} color={list.color} openCount={list.openCount} onNavigate={onNavigate} />
        ))}
        {!lists.length && (
          <NavItem href="/lists" icon={FolderKanban} onNavigate={onNavigate}>
            Create a list
          </NavItem>
        )}
      </Section>
    </>
  );
}

/** Help desk link with what needs the user's attention. */
function HelpdeskNavItem({ onNavigate }: { onNavigate: () => void }) {
  const { data: stats } = useTicketStats();
  // Staff see their queue plus unassigned work; everyone else their assigned tickets and open requests.
  const count = stats?.staff ? stats.assignedToMe + stats.unassigned : (stats?.assignedToMe ?? 0) + (stats?.myOpen ?? 0);
  const label = stats?.staff ? `${count} assigned to you or unassigned` : `${count} assigned to you or open requests`;
  return (
    <NavItem href="/tickets" icon={LifeBuoy} onNavigate={onNavigate} count={count} countLabel={label}>
      Help desk
    </NavItem>
  );
}

function MessagesNavItem({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useUnreadMessages();
  return (
    <NavItem href="/messages" icon={MessagesSquare} onNavigate={onNavigate} count={data?.total ?? 0} countLabel={`${data?.total ?? 0} unread messages`}>
      Messages
    </NavItem>
  );
}

function AnnouncementsNavItem({ onNavigate }: { onNavigate: () => void }) {
  const { data } = useAnnouncements();
  return (
    <NavItem href="/announcements" icon={Megaphone} onNavigate={onNavigate} count={data?.unread ?? 0} countLabel={`${data?.unread ?? 0} unread announcements`}>
      Announcements
    </NavItem>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { data: user } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const tagline = user?.tenant?.settings?.branding?.tagline;
  // A module shows when the workspace is licensed for it and the person holds one of its permissions.
  const has = (feature: FeatureKey) => canOpenModule(user, feature);
  const can = (permission: string) => Boolean(user?.permissions?.includes(permission));
  const overlayRef = useRef<HTMLDivElement>(null);

  // Mobile menu: move focus into it and close on Escape from anywhere (focus starts on the "Open menu" button outside it).
  useEffect(() => {
    if (!mobileOpen) return;
    overlayRef.current?.querySelector<HTMLElement>("[aria-label='Close menu']")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onClose]);

  const content = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="flex items-start justify-between gap-2 px-2">
        <div className="min-w-0">
          <Logo title={siteTitle} icon={user?.tenant?.settings?.branding?.logoIcon} imageUrl={user?.tenant?.settings?.branding?.logoUrl} />
          {(tagline || (user?.tenant && siteTitle !== user.tenant.name)) && (
            <p className="mt-1.5 truncate pl-0.5 text-xs font-medium text-muted-foreground">{tagline || user?.tenant?.name}</p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        <NavItem href="/" exact icon={LayoutDashboard} onNavigate={onClose}>
          Home
        </NavItem>
      </nav>

      {has("tasks") && <TasksNav onNavigate={onClose} />}

      {(has("helpdesk") || has("directory") || has("messaging") || has("announcements") || has("notes")) && (
        <Section label="Workspace">
          {has("messaging") && <MessagesNavItem onNavigate={onClose} />}
          {has("notes") && (
            <NavItem href="/notes" icon={StickyNote} onNavigate={onClose}>
              Notes
            </NavItem>
          )}
          {has("announcements") && <AnnouncementsNavItem onNavigate={onClose} />}
          {has("helpdesk") && <HelpdeskNavItem onNavigate={onClose} />}
          {has("directory") && (
            <>
              <NavItem href="/teams" icon={Users} onNavigate={onClose}>
                Teams
              </NavItem>
              <NavItem href="/people" icon={Contact} onNavigate={onClose}>
                People
              </NavItem>
            </>
          )}
        </Section>
      )}

      {(has("sales") || has("billing") || has("inventory") || has("logistics")) && (
        <Section label="Operations">
          {has("sales") && (
            <NavItem href="/sales" icon={TrendingUp} onNavigate={onClose}>
              Sales
            </NavItem>
          )}
          {has("billing") && (
            <NavItem href="/billing" icon={FileText} onNavigate={onClose}>
              Billing
            </NavItem>
          )}
          {has("inventory") && (
            <NavItem href="/inventory" icon={Boxes} onNavigate={onClose}>
              Inventory
            </NavItem>
          )}
          {has("logistics") && (
            <NavItem href="/logistics" icon={Truck} onNavigate={onClose}>
              Logistics
            </NavItem>
          )}
        </Section>
      )}

      {has("clinic") && (
        <Section label="Healthcare">
          <NavItem href="/clinic" icon={Stethoscope} onNavigate={onClose}>
            Clinic
          </NavItem>
        </Section>
      )}

      {(has("attendance") || has("expenses")) && (
        <Section label="People ops">
          {has("attendance") && (
            <NavItem href="/attendance" icon={CalendarCheck} onNavigate={onClose}>
              Attendance & leave
            </NavItem>
          )}
          {has("expenses") && (
            <NavItem href="/expenses" icon={ReceiptText} onNavigate={onClose}>
              Expenses
            </NavItem>
          )}
        </Section>
      )}

      <div className="mt-auto flex flex-col gap-1">
        {(can("workspace.users.manage") || can("workspace.roles.manage") || can("workspace.settings.manage") || can("workspace.audit.view")) && (
          <NavItem href="/admin" icon={Gauge} onNavigate={onClose}>
            Workspace admin
          </NavItem>
        )}
        {can("workspace.users.manage") && (
          <NavItem href="/users" icon={UserCog} onNavigate={onClose}>
            Manage users
          </NavItem>
        )}
        {(can("workspace.roles.manage") || can("workspace.users.manage")) && (
          <NavItem href="/roles" icon={ShieldCheck} onNavigate={onClose}>
            Roles & access
          </NavItem>
        )}
        {can("workspace.audit.view") && (
          <NavItem href="/audit" icon={ScrollText} onNavigate={onClose}>
            Audit log
          </NavItem>
        )}
        <NavItem href="/settings" icon={Settings} onNavigate={onClose}>
          Settings
        </NavItem>
      </div>
    </div>
  );

  return (
    <>
      <aside data-tf="sidebar" data-tour="sidebar" data-sidebar-panel="auto" className="no-print fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">{content}</aside>
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-scroll-lock
          ref={overlayRef}
        >
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
          <aside data-tf="sidebar" data-tour="sidebar" data-sidebar-panel="auto" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r bg-card shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
