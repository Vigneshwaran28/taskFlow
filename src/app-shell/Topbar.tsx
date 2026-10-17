"use client";
import NextLink from "next/link";
import { usePathname, useRouter } from "@/lib/navigation";
import { useState, type FocusEvent } from "react";
import { ArrowLeftRight, LayoutGrid, LogOut, Menu, Plus, Settings } from "lucide-react";
import { Avatar, initials } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { useCurrentUser, useLogout, useWorkspaceSessions } from "@/features/auth";
import { HelpMenu } from "@/features/help";
import { SoundToggle } from "@/components/shared/SoundToggle";
import { QuickMeetButton } from "@/features/meetings";
import { NotificationBell } from "@/features/notifications";
import { useTaskDialog } from "@/features/tasks";
import { CommandPalette } from "./CommandPalette";
import { SidebarCustomizerButton } from "./SidebarCustomizer";
import { ThemeMenu } from "./ThemeMenu";
import { canOpenModule } from "./modules";
import { isTaskPage, taskDefaultsFor } from "./taskPages";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const pathname = usePathname();
  // "New task" belongs on the task pages (the home page has its own in the tasks section).
  const showNewTask = canOpenModule(user, "tasks") && isTaskPage(pathname);
  const newTask = () => openCreate(taskDefaultsFor(pathname));
  const logout = useLogout();
  const { openCreate, openEditById } = useTaskDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  // Other workspaces this browser is signed in to: switching opens them (each keeps its own sign-in).
  const { data: sessions } = useWorkspaceSessions({ enabled: menuOpen && Boolean(user?.isOwner || user?.permissions?.includes("workspace.users.manage")) });
  // Switching is for admins of several workspaces: the same email, an admin here and in the other workspace.
  const isAdminHere = Boolean(user?.isOwner || user?.permissions?.includes("workspace.users.manage"));
  const others = isAdminHere
    ? (sessions ?? []).filter(session => session.slug !== user?.tenant?.slug && session.isAdmin && session.user.email.toLowerCase() === user?.email?.toLowerCase())
    : [];

  function handleLogout() {
    setMenuOpen(false);
    // Back to the workspace's own sign-in page (/<slug>/login).
    const slug = user?.tenant?.slug;
    logout.mutate(undefined, { onSuccess: () => router.replace(slug ? `/${encodeURIComponent(slug)}/login` : "/login") });
  }

  function handleMenuBlur(event: FocusEvent<HTMLButtonElement>) {
    if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
  }

  return (
    <header data-tf="topbar" className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center" data-tour="search">
        <CommandPalette />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {showNewTask && (
          <>
            <Button size="sm" onClick={newTask} className="max-sm:hidden" title="New task (N)" aria-keyshortcuts="N">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New task
            </Button>
            <Button size="icon" onClick={newTask} className="sm:hidden" aria-label="New task">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}

        <QuickMeetButton />

        <div className="flex" data-tour="notifications">
          <NotificationBell onOpenTask={openEditById} onOpenTicket={id => router.push(`/tickets/${id}`)} />
        </div>

        <SoundToggle />

        <HelpMenu />

        <ThemeMenu />

        <SidebarCustomizerButton isCompact className="p-2" />

        <div className="relative" data-tour="account">
          <button
            type="button"
            onClick={() => setMenuOpen(current => !current)}
            onBlur={handleMenuBlur}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Account menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {user?.avatarUrl ? <Avatar name={user.name} imageUrl={user.avatarUrl} /> : initials(user?.name) || "?"}
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-40 mt-2 w-[min(15rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-xl">
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Avatar name={user?.name} imageUrl={user?.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              {others.length > 0 && (
                <div className="border-b p-1">
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Switch workspace</p>
                  {others.map(session => (
                    <a
                      key={session.slug}
                      href={`/${encodeURIComponent(session.slug)}`}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{session.siteTitle}</span>
                        <span className="block truncate text-xs text-muted-foreground">{session.user.email}</span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <div className="p-1">
                {/* Only for admins of several workspaces. next/link directly: the app's Link would put "/" inside this workspace. */}
                {others.length > 0 && (
                  <NextLink
                    href="/"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                    All workspaces
                  </NextLink>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
