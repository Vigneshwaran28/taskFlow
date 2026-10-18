"use client";
import Link from "@/components/navigation/Link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
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
import { useTheme, type SidebarPosition } from "@/hooks/useTheme";
import type { FeatureKey } from "@/types/session";
import { canOpenModule } from "./modules";
import { PortalTooltip } from "./PortalTooltip";
import {
  SidebarCustomizerButton,
  SidebarQuickToggle,
} from "./SidebarCustomizer";
import { DynamicIcon, type NavIconKey } from "@/lib/icons";

interface SidebarNavContextValue {
  isCompact: boolean;
  align: "left" | "center";
  position: SidebarPosition;
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
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  navKey?: NavIconKey | string;
  children: ReactNode;
  exact?: boolean;
  count?: number;
  countLabel?: string;
}

function NavItem({
  href,
  icon: Icon,
  navKey,
  children,
  exact,
  count = 0,
  countLabel,
}: NavItemProps) {
  const { preferences } = useTheme();
  const { isCompact, align, position, onClose } = useSidebarNav();
  const active = useIsActive(href, exact);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const strokeWidth = preferences.iconStrokeWidth ?? 2;

  function handleMouseEnter() {
    if (isCompact && linkRef.current) {
      setAnchorRect(linkRef.current.getBoundingClientRect());
      setHovered(true);
    }
  }

  function handleMouseLeave() {
    setHovered(false);
  }

  function handleFocus() {
    if (isCompact && linkRef.current) {
      setAnchorRect(linkRef.current.getBoundingClientRect());
      setHovered(true);
    }
  }

  function handleBlur() {
    setHovered(false);
  }

  if (isCompact) {
    return (
      <>
        <Link
          ref={linkRef}
          href={href}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          aria-label={typeof children === "string" ? children : undefined}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl mx-auto transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "bg-accent text-accent-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {/* Active indicator bar */}
          {active && (
            <span
              className={cn(
                "absolute top-2 bottom-2 w-1 rounded-full bg-primary transition-all",
                position === "right" ? "-right-1" : "-left-1"
              )}
              aria-hidden="true"
            />
          )}

          <DynamicIcon navKey={navKey} fallback={Icon} className="h-5 w-5 shrink-0" strokeWidth={strokeWidth} aria-hidden={true} />
          <span className="sr-only">{children}</span>

          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs"
              aria-label={countLabel}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>

        <PortalTooltip
          label={
            <span className="flex items-center gap-1.5">
              <span>{children}</span>
              {count > 0 && (
                <span className="rounded-full bg-primary/20 px-1 text-[10px] text-primary font-bold">
                  {count}
                </span>
              )}
            </span>
          }
          position={position}
          visible={hovered}
          anchorRect={anchorRect}
        />
      </>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "center"
          ? "justify-center text-center gap-2.5"
          : "justify-start text-left gap-3",
        active
          ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <DynamicIcon navKey={navKey} fallback={Icon} className="h-4 w-4 shrink-0" strokeWidth={strokeWidth} aria-hidden={true} />
      <span className={cn("truncate", align === "center" ? "max-w-[150px]" : "flex-1")}>
        {children}
      </span>
      {count > 0 && (
        <span
          className="rounded-full bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary"
          aria-label={countLabel}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function Section({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { isCompact, align } = useSidebarNav();

  if (isCompact) {
    return (
      <nav aria-label={label} className="flex flex-col gap-1.5 py-1">
        <div
          className="my-1.5 flex justify-center"
          role="separator"
          title={label}
        >
          <span className="h-px w-6 rounded-full bg-border/60" />
        </div>
        {children}
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {align === "center" ? (
        <div className="flex items-center justify-center gap-2 px-3 pb-1">
          <span className="h-px w-3 bg-border/60" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <span className="h-px w-3 bg-border/60" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {action}
        </div>
      )}
      {children}
    </nav>
  );
}

function ListLink({
  id,
  name,
  color,
  openCount,
}: {
  id: number;
  name: string;
  color: string;
  openCount: number;
}) {
  const { isCompact, align, position, onClose } = useSidebarNav();
  const active = useIsActive(`/lists/${id}`);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function handleMouseEnter() {
    if (isCompact && linkRef.current) {
      setAnchorRect(linkRef.current.getBoundingClientRect());
      setHovered(true);
    }
  }

  function handleMouseLeave() {
    setHovered(false);
  }

  if (isCompact) {
    return (
      <>
        <Link
          ref={linkRef}
          href={`/lists/${id}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter}
          onBlur={handleMouseLeave}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          aria-label={name}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl mx-auto transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "bg-accent text-accent-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span
            className={cn("h-3 w-3 shrink-0 rounded-full", colorFor(color).dot)}
            aria-hidden="true"
          />
          <span className="sr-only">{name}</span>

          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
              {openCount}
            </span>
          )}
        </Link>

        <PortalTooltip
          label={
            <span className="flex items-center gap-1.5">
              <span>{name}</span>
              {openCount > 0 && (
                <span className="text-muted-foreground">({openCount})</span>
              )}
            </span>
          }
          position={position}
          visible={hovered}
          anchorRect={anchorRect}
        />
      </>
    );
  }

  return (
    <Link
      href={`/lists/${id}`}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "center"
          ? "justify-center text-center gap-2.5"
          : "justify-start text-left gap-3",
        active
          ? "bg-accent text-accent-foreground font-semibold shadow-2xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorFor(color).dot)}
        aria-hidden="true"
      />
      <span className={cn("truncate", align === "center" ? "max-w-[150px]" : "flex-1")}>
        {name}
      </span>
      {openCount > 0 && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {openCount}
        </span>
      )}
    </Link>
  );
}

function TasksNav() {
  const { data: lists = [] } = useLists();
  const onListsPage = useIsActive("/lists", true);
  const { isCompact, onClose } = useSidebarNav();

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
          !isCompact ? (
            <Link
              href="/lists"
              onClick={onClose}
              aria-current={onListsPage ? "page" : undefined}
              className={cn(
                "rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                onListsPage && "underline"
              )}
              aria-label="Manage lists"
            >
              Manage
            </Link>
          ) : undefined
        }
      >
        {lists.map(list => (
          <ListLink
            key={list.id}
            id={list.id}
            name={list.name}
            color={list.color}
            openCount={list.openCount}
          />
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

function HelpdeskNavItem() {
  const { data: stats } = useTicketStats();
  const count = stats?.staff
    ? stats.assignedToMe + stats.unassigned
    : (stats?.assignedToMe ?? 0) + (stats?.myOpen ?? 0);
  const label = stats?.staff
    ? `${count} assigned to you or unassigned`
    : `${count} assigned to you or open requests`;
  return (
    <NavItem href="/tickets" navKey="helpdesk" icon={LifeBuoy} count={count} countLabel={label}>
      Help desk
    </NavItem>
  );
}

function MessagesNavItem() {
  const { data } = useUnreadMessages();
  return (
    <NavItem
      href="/messages"
      navKey="messaging"
      icon={MessagesSquare}
      count={data?.total ?? 0}
      countLabel={`${data?.total ?? 0} unread messages`}
    >
      Messages
    </NavItem>
  );
}

function AnnouncementsNavItem() {
  const { data } = useAnnouncements();
  return (
    <NavItem
      href="/announcements"
      navKey="announcements"
      icon={Megaphone}
      count={data?.unread ?? 0}
      countLabel={`${data?.unread ?? 0} unread announcements`}
    >
      Announcements
    </NavItem>
  );
}

function SidebarBody() {
  const { data: user } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const tagline = user?.tenant?.settings?.branding?.tagline;
  const { isCompact, position, onClose } = useSidebarNav();

  const has = (feature: FeatureKey) => canOpenModule(user, feature);
  const can = (permission: string) =>
    Boolean(user?.permissions?.includes(permission));

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-y-auto overscroll-contain transition-all duration-200 no-scrollbar",
        isCompact ? "gap-4 px-2 py-4 items-center" : "gap-5 px-3 py-5"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-start gap-2 shrink-0",
          isCompact ? "justify-center py-1" : "justify-between px-2"
        )}
      >
        <div className={cn("min-w-0", isCompact && "flex justify-center")}>
          <Logo
            title={isCompact ? "" : siteTitle}
            icon={user?.tenant?.settings?.branding?.logoIcon}
            imageUrl={user?.tenant?.settings?.branding?.logoUrl}
          />
          {!isCompact && (tagline || (user?.tenant && siteTitle !== user.tenant.name)) && (
            <p className="mt-1.5 truncate pl-0.5 text-xs font-medium text-muted-foreground">
              {tagline || user?.tenant?.name}
            </p>
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

      {/* Main Nav */}
      <nav aria-label="Main" className="flex flex-col gap-1 w-full">
        <NavItem href="/" exact navKey="home" icon={LayoutDashboard}>
          Home
        </NavItem>
      </nav>

      {has("tasks") && <TasksNav />}

      <Section label="Workspace">
        <NavItem href="/meetings" navKey="meetings" icon={Video}>
          Meetings
        </NavItem>
        {has("messaging") && <MessagesNavItem />}
        {has("notes") && (
          <NavItem href="/notes" navKey="notes" icon={StickyNote}>
            Notes
          </NavItem>
        )}
        {has("announcements") && <AnnouncementsNavItem />}
        {has("helpdesk") && <HelpdeskNavItem />}
        {has("directory") && (
          <>
            <NavItem href="/teams" navKey="teams" icon={Users}>
              Teams
            </NavItem>
            <NavItem href="/people" navKey="people" icon={Contact}>
              People
            </NavItem>
          </>
        )}
      </Section>

      {(has("sales") ||
        has("billing") ||
        has("inventory") ||
        has("logistics")) && (
        <Section label="Operations">
          {has("sales") && (
            <NavItem href="/sales" navKey="sales" icon={TrendingUp}>
              Sales
            </NavItem>
          )}
          {has("billing") && (
            <NavItem href="/billing" navKey="billing" icon={FileText}>
              Billing
            </NavItem>
          )}
          {has("inventory") && (
            <NavItem href="/inventory" navKey="inventory" icon={Boxes}>
              Inventory
            </NavItem>
          )}
          {has("logistics") && (
            <NavItem href="/logistics" navKey="logistics" icon={Truck}>
              Logistics
            </NavItem>
          )}
        </Section>
      )}

      {has("clinic") && (
        <Section label="Healthcare">
          <NavItem href="/clinic" navKey="clinic" icon={Stethoscope}>
            Clinic
          </NavItem>
        </Section>
      )}

      {(has("attendance") || has("expenses")) && (
        <Section label="People ops">
          {has("attendance") && (
            <NavItem href="/attendance" navKey="attendance" icon={CalendarCheck}>
              Attendance & leave
            </NavItem>
          )}
          {has("expenses") && (
            <NavItem href="/expenses" navKey="expenses" icon={ReceiptText}>
              Expenses
            </NavItem>
          )}
        </Section>
      )}

      {/* Footer Area */}
      <div
        className={cn(
          "mt-auto flex flex-col gap-1 border-t border-border/50 pt-3 shrink-0",
          isCompact ? "w-full items-center" : "w-full"
        )}
      >
        {(can("workspace.users.manage") ||
          can("workspace.roles.manage") ||
          can("workspace.settings.manage") ||
          can("workspace.audit.view")) && (
          <NavItem href="/admin" navKey="admin" icon={Gauge}>
            Workspace admin
          </NavItem>
        )}
        {can("workspace.users.manage") && (
          <NavItem href="/users" navKey="users" icon={UserCog}>
            Manage users
          </NavItem>
        )}
        {(can("workspace.roles.manage") || can("workspace.users.manage")) && (
          <NavItem href="/roles" navKey="roles" icon={ShieldCheck}>
            Roles & access
          </NavItem>
        )}
        {can("workspace.audit.view") && (
          <NavItem href="/audit" navKey="audit" icon={ScrollText}>
            Audit log
          </NavItem>
        )}
        <NavItem href="/settings" navKey="settings" icon={Settings}>
          Settings
        </NavItem>

        {/* Customization controls in footer */}
        <div className="mt-1 flex flex-col gap-1 border-t border-border/40 pt-2 w-full">
          <SidebarCustomizerButton isCompact={isCompact} />
          <SidebarQuickToggle isCompact={isCompact} position={position} />
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { preferences } = useTheme();
  const position = preferences.sidebarPosition ?? "left";
  const mode = preferences.sidebarMode ?? "full";
  const align = preferences.sidebarAlign ?? "left";
  const isCompact = mode === "compact";

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    overlayRef.current
      ?.querySelector<HTMLElement>("[aria-label='Close menu']")
      ?.focus();
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
          "no-print fixed inset-y-0 hidden z-30 bg-card transition-[width,transform] duration-200 ease-in-out lg:block",
          position === "right"
            ? "right-0 border-l border-r-0"
            : "left-0 border-r",
          isCompact ? "w-16" : "w-64"
        )}
      >
        <SidebarNavContext.Provider
          value={{ isCompact, align, position, onClose }}
        >
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
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            data-tf="sidebar"
            data-tour="sidebar"
            data-sidebar-panel="auto"
            className={cn(
              "absolute inset-y-0 w-72 max-w-[85vw] bg-card shadow-xl transition-all duration-200",
              position === "right"
                ? "right-0 border-l border-r-0"
                : "left-0 border-r"
            )}
          >
            {/* On mobile drawer, always show full mode labels for clear touch targets */}
            <SidebarNavContext.Provider
              value={{ isCompact: false, align, position, onClose }}
            >
              <SidebarBody />
            </SidebarNavContext.Provider>
          </aside>
        </div>
      )}
    </>
  );
}
