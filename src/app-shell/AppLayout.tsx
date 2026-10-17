"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AutoAttendance } from "@/features/attendance";
import { useCurrentUser, useHasFeature } from "@/features/auth";
import { ProviderNotices } from "@/features/broadcasts";
import { MaintenanceBanner } from "@/features/maintenance";
import { MeetingToasts } from "@/features/meetings";
import { MessageToasts } from "@/features/messaging";
import { TaskDialogProvider, useTaskDialog } from "@/features/tasks";
import { TicketToasts } from "@/features/tickets";
import { usePageEntrance } from "@/features/workspace";
import { TourProvider } from "@/features/help";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { usePathname } from "@/lib/navigation";
import { RealtimeProvider } from "@/realtime";
import { BackBar } from "./BackBar";
import { Sidebar } from "./Sidebar";
import { isTaskPage, taskDefaultsFor } from "./taskPages";
import { ThemeSync } from "./ThemeSync";
import { Topbar } from "./Topbar";

/** Press "N" on a task page (outside inputs) to create a task there. */
function NewTaskShortcut({ pathname }: { pathname: string }) {
  const { openCreate } = useTaskDialog();
  const enabled = isTaskPage(pathname);
  // Global keyboard listener is an external system → effect is correct.
  useEffect(() => {
    if (!enabled) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true'], dialog[open]")) return;
      event.preventDefault();
      openCreate(taskDefaultsFor(pathname));
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openCreate, enabled, pathname]);
  return null;
}

/** The signed-in shell: sidebar, top bar, and the page. */
export function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // The mobile menu closes on any navigation (links, browser back, a redirect), not only on nav-item clicks.
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const hasTasks = useHasFeature("tasks");
  const hasAttendance = useHasFeature("attendance");
  const hasMessaging = useHasFeature("messaging");
  const hasHelpdesk = useHasFeature("helpdesk");
  const { data: user } = useCurrentUser();
  const { preferences } = useTheme();
  const sidebarPosition = preferences.sidebarPosition ?? "left";
  const isCompact = (preferences.sidebarMode ?? "full") === "compact";
  // The workspace's page entrance (branding.ui.pageTransition) replays on every page.
  const mainRef = useRef<HTMLElement>(null);
  usePageEntrance(mainRef, pathname);

  return (
    <RealtimeProvider>
      <TaskDialogProvider>
        <TourProvider>
        {hasTasks && <NewTaskShortcut pathname={pathname} />}
        {hasAttendance && user && <AutoAttendance userId={user.id} />}
        {hasMessaging && <MessageToasts />}
        {hasHelpdesk && <TicketToasts />}
        <MeetingToasts />
        <ThemeSync />
        <a
          href="#main"
          className={cn(
            "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg",
            sidebarPosition === "right" ? "focus:right-4" : "focus:left-4"
          )}
        >
          Skip to content
        </a>
        <Sidebar mobileOpen={menuOpen} onClose={closeMenu} />
        <div
          className={cn(
            "transition-all duration-200 print:pl-0 print:pr-0",
            sidebarPosition === "right"
              ? isCompact
                ? "lg:pr-20 lg:pl-0"
                : "lg:pr-64 lg:pl-0"
              : isCompact
              ? "lg:pl-20 lg:pr-0"
              : "lg:pl-64 lg:pr-0"
          )}
        >
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
          <main ref={mainRef} id="main" data-tf="page" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:p-0">
            <MaintenanceBanner />
            <ProviderNotices />
            <BackBar />
            {children}
          </main>
        </div>
        </TourProvider>
      </TaskDialogProvider>
    </RealtimeProvider>
  );
}
