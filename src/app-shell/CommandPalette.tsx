"use client";
// Global command palette (Ctrl/Cmd+K or the top bar's search button): jump to any page the person can open, run a
// quick action they're permitted to, or reopen a recent page. ARIA combobox + listbox; arrow keys move, Enter runs.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  ClipboardCheck,
  Clock,
  CornerDownLeft,
  FilePlus2,
  FolderKanban,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Moon,
  PackagePlus,
  Palmtree,
  Plus,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth";
import { colorFor, listKeys, type TaskList } from "@/features/lists";
import { TASK_VIEWS, useTaskDialog } from "@/features/tasks";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { usePathname, useRouter } from "@/lib/navigation";
import type { FeatureKey, SessionUser } from "@/types/session";
import { MODULES, MODULE_KEYS, canOpenModule } from "./modules";
import { isTaskPage, taskDefaultsFor } from "./taskPages";

type Icon = ComponentType<{ className?: string }>;
type Group = "Recent" | "Actions" | "Pages" | "Search";

interface Command {
  id: string;
  group: Group;
  label: string;
  /** Extra words that match (not shown) */
  keywords?: string;
  hint?: string;
  icon: Icon;
  dot?: string;
  href?: string;
  run?: () => void;
}

const RECENT_KEY = "tf-recent-pages";
const RECENT_MAX = 6;
// Detail pages aren't in the page list; recents still name them.
const DETAIL_PAGES: readonly { pattern: RegExp; feature: FeatureKey; label: (id: string) => string }[] = [
  { pattern: /^\/tickets\/(\d+)$/, feature: "helpdesk", label: id => `Ticket #${id}` },
  { pattern: /^\/billing\/(\d+)$/, feature: "billing", label: id => `Billing document #${id}` },
  { pattern: /^\/logistics\/(\d+)$/, feature: "logistics", label: id => `Shipment #${id}` },
  { pattern: /^\/inventory\/(\d+)$/, feature: "inventory", label: id => `Product #${id}` },
  { pattern: /^\/clinic\/patients\/(\d+)$/, feature: "clinic", label: id => `Patient #${id}` },
  { pattern: /^\/messages\/(\d+)$/, feature: "messaging", label: () => "Conversation" },
];

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberPage(path: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([path, ...readRecent().filter(item => item !== path)].slice(0, RECENT_MAX + 1)));
  } catch {
    // storage unavailable: no recents
  }
}

/** Every page this person can open, in sidebar order. */
function pagesFor(user: SessionUser, lists: readonly TaskList[]): Command[] {
  const can = (...permissions: string[]) => permissions.some(permission => user.permissions?.includes(permission));
  const has = (feature: FeatureKey) => canOpenModule(user, feature);
  const page = (href: string, label: string, icon: Icon, keywords?: string): Command => ({ id: `page:${href}`, group: "Pages", href, label, icon, keywords });
  const pages: Command[] = [page("/", "Home", LayoutDashboard, "dashboard overview start")];
  if (has("tasks")) {
    for (const [key, view] of Object.entries(TASK_VIEWS)) pages.push(page(`/tasks/${key}`, `Tasks: ${view.label}`, view.icon, "todo"));
    pages.push(page("/calendar", "Calendar", CalendarRange, "tasks due month"));
    pages.push(page("/lists", "Lists", FolderKanban, "manage task lists projects"));
    for (const list of lists) pages.push({ ...page(`/lists/${list.id}`, `List: ${list.name}`, FolderKanban, "tasks project"), dot: colorFor(list.color).dot });
  }
  for (const key of MODULE_KEYS) {
    if (key === "tasks" || !has(key)) continue;
    const meta = MODULES[key];
    if (key === "directory") {
      pages.push(page("/teams", "Teams", Users, "departments directory"), page("/people", "People", meta.icon, "staff directory colleagues"));
      continue;
    }
    pages.push(page(meta.path, meta.label, meta.icon, meta.description));
    if (key === "helpdesk" && can("helpdesk.work")) pages.push(page("/tickets?scope=unassigned", "Help desk: Unassigned tickets", LifeBuoy, "queue"));
    if (key === "helpdesk" && can("helpdesk.use")) pages.push(page("/tickets?scope=mine", "Help desk: My requests", LifeBuoy, "tickets"));
    if (key === "billing") pages.push(page("/billing?tab=invoices", "Billing: Invoices", meta.icon), page("/billing?tab=quotes", "Billing: Quotes", ScrollText, "estimates"));
    if (key === "sales") pages.push(page("/sales?tab=orders", "Sales: Orders", meta.icon), page("/sales?tab=customers", "Sales: Customers", Users, "clients"));
    if (key === "logistics" && can("logistics.deliver")) pages.push(page("/logistics?tab=mine", "Logistics: My deliveries", meta.icon, "driver"));
    if (key === "attendance" && can("attendance.self")) pages.push(page("/attendance?tab=leave", "Attendance: My leave", Palmtree, "holiday time off"));
    if (key === "attendance" && can("attendance.leave.approve")) pages.push(page("/attendance?tab=approvals", "Attendance: Leave approvals", ClipboardCheck));
    if (key === "expenses" && can("expenses.approve", "expenses.pay")) pages.push(page("/expenses?tab=approvals", "Expenses: Approvals", ClipboardCheck, "claims reimburse"));
  }
  if (can("workspace.users.manage", "workspace.roles.manage", "workspace.settings.manage", "workspace.audit.view")) pages.push(page("/admin", "Workspace admin", Gauge, "overview seats restrictions security"));
  if (can("workspace.users.manage")) pages.push(page("/users", "Manage users", UserCog, "people accounts invite import"));
  if (can("workspace.settings.manage")) pages.push(page("/settings?tab=restrictions", "Security & restrictions", KeyRound, "password session domains modules"));
  if (can("workspace.roles.manage", "workspace.users.manage")) pages.push(page("/roles", "Roles & access", ShieldCheck, "permissions"));
  if (can("workspace.audit.view")) pages.push(page("/audit", "Audit log", ScrollText, "history activity"));
  pages.push(page("/settings", "Settings", Settings, "profile password appearance theme style notifications workspace"));
  pages.push(page("/settings?tab=appearance", "Settings: Appearance", Settings, "theme dark light style colour accent font background picture custom css"));
  if (can("workspace.settings.manage")) pages.push(page("/settings?tab=branding", "Settings: Branding", Settings, "logo title colour sign-in page custom css"));
  return pages;
}

/** Quick actions this person is permitted to run. */
function actionsFor(user: SessionUser, run: { newTask: () => void; toggleTheme: () => void }, query: string): Command[] {
  const can = (...permissions: string[]) => permissions.some(permission => user.permissions?.includes(permission));
  const has = (feature: FeatureKey) => canOpenModule(user, feature);
  const action = (id: string, label: string, icon: Icon, target: string | (() => void), keywords?: string): Command => ({
    id: `action:${id}`,
    group: "Actions",
    label,
    icon,
    keywords,
    ...(typeof target === "string" ? { href: target } : { run: target }),
  });
  const actions: Command[] = [];
  const term = query.trim();
  if (term && has("tasks") && can("tasks.use")) actions.push({ ...action("search-tasks", `Search tasks for “${term}”`, Search, `/tasks/all?q=${encodeURIComponent(term)}`), keywords: term });
  if (term && has("helpdesk")) actions.push({ ...action("search-tickets", `Search tickets for “${term}”`, Search, `/tickets?q=${encodeURIComponent(term)}`), keywords: term });
  if (has("tasks") && can("tasks.use")) actions.push({ ...action("new-task", "New task", Plus, run.newTask, "create add todo"), hint: "N" });
  if (has("helpdesk") && can("helpdesk.use")) actions.push(action("new-ticket", "New ticket", Ticket, "/tickets?action=new", "raise request help desk support"));
  if (has("clinic") && can("clinic.appointments.manage")) actions.push(action("book-appointment", "Book appointment", CalendarPlus, "/clinic?action=book", "clinic patient visit"));
  if (has("billing") && can("billing.edit")) actions.push(action("new-invoice", "New invoice", FilePlus2, "/billing?action=new-invoice", "billing bill"));
  if (has("logistics") && can("logistics.edit")) actions.push(action("book-shipment", "Book shipment", PackagePlus, "/logistics?action=new", "logistics delivery new"));
  if (has("expenses") && can("expenses.submit")) actions.push(action("new-claim", "New expense claim", ReceiptText, "/expenses?action=new", "submit reimburse"));
  if (has("attendance") && can("attendance.self")) actions.push(action("request-leave", "Request leave", CalendarCheck, "/attendance?tab=leave&action=new", "holiday time off vacation"));
  actions.push(action("toggle-theme", "Toggle dark mode", Moon, run.toggleTheme, "theme light appearance"));
  return actions;
}

function matches(command: Command, words: string[]) {
  const haystack = `${command.label} ${command.keywords ?? ""}`.toLowerCase();
  return words.every(word => haystack.includes(word));
}

/** The palette's dialog. Mounted only while open, so its search and selection start fresh every time. */
function PaletteDialog({ user, onClose }: { user: SessionUser; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { openCreate } = useTaskDialog();
  const { setTheme } = useTheme();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Read once on open: the browser's recents and the sidebar's cached lists.
  const [recent] = useState(readRecent);
  const [lists] = useState(() => queryClient.getQueryData<TaskList[]>(listKeys.all) ?? []);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const pages = useMemo(() => pagesFor(user, lists), [user, lists]);
  const commands = useMemo(() => {
    const run = {
      newTask: () => openCreate(isTaskPage(pathname) ? taskDefaultsFor(pathname) : undefined),
      toggleTheme: () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"),
    };
    const actions = actionsFor(user, run, query);
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      const byHref = new Map(pages.map(item => [item.href, item]));
      const recents: Command[] = [];
      for (const path of recent) {
        if (path === pathname || recents.length >= 5) continue;
        const known = byHref.get(path);
        if (known) recents.push({ ...known, id: `recent:${path}`, group: "Recent", icon: known.icon });
        else {
          const detail = DETAIL_PAGES.find(item => item.pattern.test(path) && canOpenModule(user, item.feature));
          const id = detail ? (detail.pattern.exec(path)?.[1] ?? "") : "";
          if (detail) recents.push({ id: `recent:${path}`, group: "Recent", label: detail.label(id), icon: History, href: path });
        }
      }
      return [...recents, ...actions, ...pages];
    }
    // Matching actions, then pages (label prefix matches first), then "Search tasks/tickets for …" as the fallback.
    const isSearch = (command: Command) => command.id.startsWith("action:search-");
    const starts = (command: Command) => (command.label.toLowerCase().startsWith(words[0]) ? 0 : 1);
    const found = [...actions.filter(command => !isSearch(command) && matches(command, words)), ...pages.filter(command => matches(command, words))];
    found.sort((a, b) => (a.group === b.group ? starts(a) - starts(b) : a.group === "Actions" ? -1 : 1));
    return [...found, ...actions.filter(isSearch).map(command => ({ ...command, group: "Search" as const }))];
  }, [user, pages, recent, pathname, query, openCreate, setTheme]);

  const current = Math.min(active, Math.max(commands.length - 1, 0));
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // Keep the highlighted option in view (DOM measurement → effect).
  useEffect(() => {
    document.getElementById(optionId(current))?.scrollIntoView({ block: "nearest" });
  });

  function execute(command: Command | undefined) {
    if (!command) return;
    onClose();
    if (command.run) command.run();
    else if (command.href) router.push(command.href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!commands.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + commands.length) % commands.length);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      setActive(Math.max(0, Math.min(commands.length - 1, current + (event.key === "PageDown" ? 5 : -5))));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(commands[current]);
    }
  }

  const groups: Group[] = ["Recent", "Actions", "Pages", "Search"];
  let index = -1;

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === ref.current) onClose();
      }}
      className="mx-auto mt-[8vh] mb-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={commands.length ? optionId(current) : undefined}
          aria-label="Search pages and actions"
          placeholder="Search pages and actions…"
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="hidden rounded border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">Esc</kbd>
      </div>
      <div id={listboxId} role="listbox" aria-label="Results" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {!commands.length && (
          <p role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nothing matches “{query.trim()}”.
          </p>
        )}
        {groups.map(group => {
          const items = commands.filter(command => command.group === group);
          if (!items.length) return null;
          const headingId = `${listboxId}-${group}`;
          return (
            <div key={group} role="group" aria-labelledby={headingId} className="mb-1 last:mb-0">
              <p id={headingId} role="presentation" className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group === "Recent" && <Clock className="h-3 w-3" aria-hidden="true" />}
                {group}
              </p>
              {items.map(command => {
                index += 1;
                const position = index;
                const selected = position === current;
                const CommandIcon = command.icon;
                return (
                  <div
                    key={command.id}
                    id={optionId(position)}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => position !== current && setActive(position)}
                    onClick={() => execute(command)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm", selected ? "bg-accent text-accent-foreground" : "text-foreground")}
                  >
                    {command.dot ? (
                      <span className={cn("mx-0.5 h-2.5 w-2.5 shrink-0 rounded-full", command.dot)} aria-hidden="true" />
                    ) : (
                      <CommandIcon className={cn("h-4 w-4 shrink-0", selected ? "text-accent-foreground" : "text-muted-foreground")} aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    {command.hint && <kbd className="rounded border px-1.5 text-[11px] text-muted-foreground">{command.hint}</kbd>}
                    {selected && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="hidden items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground sm:flex" aria-hidden="true">
        <span>↑ ↓ to move</span>
        <span>Enter to open</span>
        <span>Esc to close</span>
      </div>
    </dialog>
  );
}

/** The top bar's search button plus the Ctrl/Cmd+K shortcut; also remembers visited pages for "Recent". */
export function CommandPalette() {
  const { data: user } = useCurrentUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Recent pages live in this browser (an external store → effect).
  useEffect(() => {
    rememberPage(pathname);
  }, [pathname]);

  // Global keyboard shortcut (external system → effect).
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      setOpen(current => !current);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Search and jump to (Ctrl+K)"
        className="flex h-9 items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-full sm:max-w-xs sm:border sm:border-input sm:bg-card sm:px-3"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 truncate text-left sm:inline">Search or jump to…</span>
        <kbd className="hidden rounded border px-1.5 text-[11px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      {open && user && <PaletteDialog user={user} onClose={close} />}
    </>
  );
}
