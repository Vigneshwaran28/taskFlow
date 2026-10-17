"use client";
import Link from "@/components/navigation/Link";
import { createContext, useContext, useEffect, useRef, type ComponentType, type ReactNode } from "react";
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
  Video,
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
import { useTheme } from "@/hooks/useTheme";
import type { FeatureKey } from "@/types/session";
import { canOpenModule } from "./modules";
import { SidebarCustomizer, SidebarQuickToggle } from "./SidebarCustomizer";

interface SidebarNavContextValue {
  isCompact: boolean;
  align: "left" | "center";
  position: "left" | "right";
  onClose: () => void;
}

const SidebarNavContext = createContext<SidebarNavContextValue>({
  isCompact: false,
  align: "left",
  position: "left",
  onClose: () => {},
});

const useSidebarNav = () => useContext(SidebarNavContext);

interface NavItemProps {
  href: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  exact?: boolean;
  count?: number;
  countLabel?: string;
}

function NavItem({ href, icon: Icon, children, exact, count = 0, countLabel }: NavItemProps) {
  const { isCompact, align, position, onClose } = useSidebarNav();
  const active = useIsActive(href, exact);

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompact
          ? "justify-center p-2.5"
          : cn("gap-3 px-3 py-2 text-sm font-medium", align === "center" ? "justify-center text-center" : "justify-start text-left"),
        active ? "bg-accent text-accent-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
      onClick={onClose}
    >
      {Icon && <Icon className={cn("shrink-0", isCompact ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />}
      {isCompact ? (
        <>
          <span className="sr-only">{children}</span>
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs"
              aria-label={countLabel}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              position === "right"
                ? "right-full mr-2.5 top-1/2 -translate-y-1/2"
                : "left-full ml-2.5 top-1/2 -translate-y-1/2"
            )}
          >
            {children}
            {count > 0 && <span className="ml-1.5 font-bold text-primary">({count})</span>}
          </span>
        </>
      ) : (
        <>
          <span className={cn("truncate", align === "center" ? "" : "flex-1")}>{children}</span>
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary" aria-label={countLabel}>
              {count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Section({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  const { isCompact, align } = useSidebarNav();

  if (isCompact) {
    return (
      <nav aria-label={label} className="flex flex-col gap-1">
        <div className="my-1.5 border-t border-border/60" role="separator" title={label} />
        {children}
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      <div className={cn("flex items-center justify-between px-3 pb-1", align === "center" && "justify-center text-center")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {action && align !== "center" && action}
      </div>
      {children}
    </nav>
  );
}

function ListLink({ id, name, color, openCount }: { id: number; name: string; color: string; openCount: number }) {
  const { isCompact, align, position, onClose } = useSidebarNav();
  const active = useIsActive(`/lists/${id}`);

  return (
    <Link
      href={`/lists/${id}`}
      className={cn(
        "group relative flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompact
          ? "justify-center p-2.5"
          : cn("gap-3 px-3 py-2 text-sm font-medium", align === "center" ? "justify-center text-center" : "justify-start text-left"),
        active ? "bg-accent text-accent-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
      onClick={onClose}
    >
      <span className={cn("shrink-0 rounded-full", isCompact ? "h-3 w-3" : "h-2.5 w-2.5", colorFor(color).dot)} aria-hidden="true" />
      {isCompact ? (
        <>
          <span className="sr-only">{name}</span>
          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
              {openCount}
            </span>
          )}
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              position === "right"
                ? "right-full mr-2.5 top-1/2 -translate-y-1/2"
                : "left-full ml-2.5 top-1/2 -translate-y-1/2"
            )}
          >
            {name}
            {openCount > 0 && <span className="ml-1.5 font-bold text-muted-foreground">({openCount})</span>}
          </span>
        </>
      ) : (
        <>
          <span className={cn("truncate", align === "center" ? "" : "flex-1")}>{name}</span>
          {openCount > 0 && <span className="text-xs tabular-nums text-muted-foreground">{openCount}</span>}
        </>
      )}
    </Link>
  );
}

/** Task views and lists. Rendered only when the workspace has the tasks module, so lists load only then. */
function TasksNav() {
  const { data: lists = [] } = useLists();
  const onListsPage = useIsActive("/lists", true);
  const { onClose } = useSidebarNav();

  return (
    <>
      <Section label="Tasks">
        {Object.entries(TASK_VIEWS).map(([key, view]) => (
          <NavItem key={key} href={`/tasks/${key}`} icon={view.icon}>
            {view.label}
          </NavItem>
        ))}
        <NavItem href="/calendar" icon={CalendarRange}>
          Calendar
        </NavItem>
      </Section>
      <Section
        label="Lists"
        action={
          <Link
            href="/lists"
            onClick={onClose}
            aria-current={onListsPage ? "page" : undefined}
            className={cn("rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", onListsPage && "underline")}
            aria-label="Manage lists"
          >
            Manage
          </Link>
        }
      >
        {lists.map(list => (
          <ListLink key={list.id} id={list.id} name={list.name} color={list.color} openCount={list.openCount} />
        ))}
        {!lists.length && (
          <NavItem href="/lists" icon={FolderKanban}>
            Create a list
          </NavItem>
        )}
      </Section>
    </>
  );
}

/** Help desk link with what needs the user's attention. */
function HelpdeskNavItem() {
  const { data: stats } = useTicketStats();
  // Staff see their queue plus unassigned work; everyone else their assigned tickets and open requests.
  const count = stats?.staff ? stats.assignedToMe + stats.unassigned : (stats?.assignedToMe ?? 0) + (stats?.myOpen ?? 0);
  const label = stats?.staff ? `${count} assigned to you or unassigned` : `${count} assigned to you or open requests`;
  return (
    <NavItem href="/tickets" icon={LifeBuoy} count={count} countLabel={label}>
      Help desk
    </NavItem>
  );
}

function MessagesNavItem() {
  const { data } = useUnreadMessages();
  return (
    <NavItem href="/messages" icon={MessagesSquare} count={data?.total ?? 0} countLabel={`${data?.total ?? 0} unread messages`}>
      Messages
    </NavItem>
  );
}

function AnnouncementsNavItem() {
  const { data } = useAnnouncements();
  return (
    <NavItem href="/announcements" icon={Megaphone} count={data?.unread ?? 0} countLabel={`${data?.unread ?? 0} unread announcements`}>
      Announcements
    </NavItem>
  );
}

function SidebarBody() {
  const { data: user } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const tagline = user?.tenant?.settings?.branding?.tagline;
  const { isCompact, onClose } = useSidebarNav();

  const has = (feature: FeatureKey) => canOpenModule(user, feature);
  const can = (permission: string) => Boolean(user?.permissions?.includes(permission));

  return (
    <div className={cn("flex h-full flex-col gap-5 overflow-y-auto", isCompact ? "px-2 py-4" : "px-3 py-5")}>
      <div className={cn("flex items-start gap-2", isCompact ? "justify-center py-1" : "justify-between px-2")}>
        <div className={cn("min-w-0", isCompact && "flex justify-center")}>
          <Logo
            title={isCompact ? "" : siteTitle}
            icon={user?.tenant?.settings?.branding?.logoIcon}
            imageUrl={user?.tenant?.settings?.branding?.logoUrl}
          />
          {!isCompact && (tagline || (user?.tenant && siteTitle !== user.tenant.name)) && (
            <p className="mt-1.5 truncate pl-0.5 text-xs font-medium text-muted-foreground">{tagline || user?.tenant?.name}</p>
          )}
        </div>
        {!isCompact && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        <NavItem href="/" exact icon={LayoutDashboard}>
          Home
        </NavItem>
      </nav>

      {has("tasks") && <TasksNav />}

      <Section label="Workspace">
        <NavItem href="/meetings" icon={Video}>
          Meetings
        </NavItem>
        {has("messaging") && <MessagesNavItem />}
        {has("notes") && (
          <NavItem href="/notes" icon={StickyNote}>
            Notes
          </NavItem>
        )}
        {has("announcements") && <AnnouncementsNavItem />}
        {has("helpdesk") && <HelpdeskNavItem />}
        {has("directory") && (
          <>
            <NavItem href="/teams" icon={Users}>
              Teams
            </NavItem>
            <NavItem href="/people" icon={Contact}>
              People
            </NavItem>
          </>
        )}
      </Section>

      {(has("sales") || has("billing") || has("inventory") || has("logistics")) && (
        <Section label="Operations">
          {has("sales") && (
            <NavItem href="/sales" icon={TrendingUp}>
              Sales
            </NavItem>
          )}
          {has("billing") && (
            <NavItem href="/billing" icon={FileText}>
              Billing
            </NavItem>
          )}
          {has("inventory") && (
            <NavItem href="/inventory" icon={Boxes}>
              Inventory
            </NavItem>
          )}
          {has("logistics") && (
            <NavItem href="/logistics" icon={Truck}>
              Logistics
            </NavItem>
          )}
        </Section>
      )}

      {has("clinic") && (
        <Section label="Healthcare">
          <NavItem href="/clinic" icon={Stethoscope}>
            Clinic
          </NavItem>
        </Section>
      )}

      {(has("attendance") || has("expenses")) && (
        <Section label="People ops">
          {has("attendance") && (
            <NavItem href="/attendance" icon={CalendarCheck}>
              Attendance & leave
            </NavItem>
          )}
          {has("expenses") && (
            <NavItem href="/expenses" icon={ReceiptText}>
              Expenses
            </NavItem>
          )}
        </Section>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-3 border-t border-border/50">
        {(can("workspace.users.manage") || can("workspace.roles.manage") || can("workspace.settings.manage") || can("workspace.audit.view")) && (
          <NavItem href="/admin" icon={Gauge}>
            Workspace admin
          </NavItem>
        )}
        {can("workspace.users.manage") && (
          <NavItem href="/users" icon={UserCog}>
            Manage users
          </NavItem>
        )}
        {(can("workspace.roles.manage") || can("workspace.users.manage")) && (
          <NavItem href="/roles" icon={ShieldCheck}>
            Roles & access
          </NavItem>
        )}
        {can("workspace.audit.view") && (
          <NavItem href="/audit" icon={ScrollText}>
            Audit log
          </NavItem>
        )}
        <NavItem href="/settings" icon={Settings}>
          Settings
        </NavItem>

        <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-2">
          <SidebarCustomizer compactTrigger={isCompact} />
          {!isCompact && <SidebarQuickToggle />}
        </div>
        {isCompact && (
          <div className="flex justify-center mt-0.5">
            <SidebarQuickToggle />
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { preferences } = useTheme();
  const position = preferences.sidebarPosition ?? "left";
  const mode = preferences.sidebarMode ?? "full";
  const align = preferences.sidebarAlign ?? "left";
  const isCompact = mode === "compact";

  const overlayRef = useRef<HTMLDivElement>(null);

  // Mobile menu: move focus into it and close on Escape from anywhere
  useEffect(() => {
    if (!mobileOpen) return;
    overlayRef.current?.querySelector<HTMLElement>("[aria-label='Close menu']")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        data-tf="sidebar"
        data-tour="sidebar"
        data-sidebar-panel="auto"
        className={cn(
          "no-print fixed inset-y-0 hidden z-30 bg-card transition-all duration-200 lg:block",
          position === "right" ? "right-0 border-l border-r-0" : "left-0 border-r",
          isCompact ? "w-20" : "w-64"
        )}
      >
        <SidebarNavContext.Provider value={{ isCompact, align, position, onClose }}>
          <SidebarBody />
        </SidebarNavContext.Provider>
      </aside>

      {/* Mobile Menu Drawer */}
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
          <aside
            data-tf="sidebar"
            data-tour="sidebar"
            data-sidebar-panel="auto"
            className={cn(
              "absolute inset-y-0 w-72 max-w-[85vw] bg-card shadow-xl transition-all duration-200",
              position === "right" ? "right-0 border-l border-r-0" : "left-0 border-r"
            )}
          >
            {/* On mobile drawer, always show full mode labels for clear touch targets */}
            <SidebarNavContext.Provider value={{ isCompact: false, align, position, onClose }}>
              <SidebarBody />
            </SidebarNavContext.Provider>
          </aside>
        </div>
      )}
    </>
  );
}
