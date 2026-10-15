// Home page sections: who sees each one, and how a person's saved layout (hidden + order) applies.
// Each section is gated by the permission its data needs, not only by module access.
import { MODULE_KEYS, canOpenModule } from "@/app-shell/modules";
import type { FeatureKey, HomeLayout, HomeSectionKey, HomeSectionSize, SessionUser } from "@/types/session";

export interface HomeSectionMeta {
  key: HomeSectionKey;
  title: string;
  /** Where "Open" goes; null for sections without a page of their own */
  href: string | null;
  /** One line for the Customize panel */
  description: string;
  /** Module content (counts for "has nothing at all"); false for greetings and shortcuts */
  content: boolean;
  /** Off until the person turns it on (e.g. shortcuts that repeat the sidebar) */
  defaultHidden?: boolean;
  visible: (user: Pick<SessionUser, "tenant" | "permissions">) => boolean;
}

const licensed = (user: Pick<SessionUser, "tenant">, feature: FeatureKey) => Boolean(user.tenant?.features.includes(feature));
const holds = (user: Pick<SessionUser, "permissions">, ...permissions: string[]) => permissions.some(permission => user.permissions?.includes(permission));
const gate =
  (feature: FeatureKey, ...permissions: string[]) =>
  (user: Pick<SessionUser, "tenant" | "permissions">) =>
    licensed(user, feature) && (!permissions.length || holds(user, ...permissions));

/** In default order. */
export const HOME_SECTIONS: readonly HomeSectionMeta[] = Object.freeze([
  { key: "attendance", title: "Attendance today", href: "/attendance", description: "Check in and out, your leave, and who else is on leave today.", content: true, visible: gate("attendance", "attendance.self") },
  { key: "celebrations", title: "Celebrations", href: null, description: "Birthdays and work anniversaries coming up.", content: false, visible: () => true },
  { key: "announcements", title: "Announcements", href: "/announcements", description: "The newest announcements addressed to you.", content: false, visible: gate("announcements") },
  { key: "tasks", title: "My tasks", href: "/tasks/today", description: "Quick add, what's due, and your week.", content: true, visible: gate("tasks", "tasks.use") },
  { key: "helpdesk", title: "Help desk", href: "/tickets", description: "Queue health for staff, or your own requests.", content: true, visible: gate("helpdesk", "helpdesk.use", "helpdesk.work") },
  { key: "expenses", title: "Expenses", href: "/expenses", description: "Your claims, and what the team was paid this month.", content: true, visible: gate("expenses", "expenses.submit", "expenses.approve", "expenses.pay") },
  {
    key: "clinic",
    title: "Clinic",
    href: "/clinic",
    description: "The waiting room for reception; your next patient for practitioners.",
    content: true,
    visible: gate("clinic", "clinic.schedule.view", "clinic.appointments.manage", "clinic.practitioner"),
  },
  { key: "logistics", title: "Logistics", href: "/logistics", description: "Open shipments, due today, and delivered this week.", content: true, visible: gate("logistics", "logistics.view") },
  { key: "sales", title: "Sales", href: "/sales", description: "Pipeline and revenue this month.", content: true, visible: gate("sales", "sales.view") },
  { key: "billing", title: "Billing", href: "/billing", description: "Outstanding, overdue, and paid this month.", content: true, visible: gate("billing", "billing.view") },
  { key: "inventory", title: "Inventory", href: "/inventory", description: "Stock value and low-stock alerts.", content: true, visible: gate("inventory", "inventory.view") },
  { key: "notes", title: "Recent notes", href: "/notes", description: "Your notes and the ones shared with you.", content: true, visible: gate("notes", "notes.use", "notes.manage") },
  { key: "modules", title: "Your modules", href: null, description: "Shortcuts to every module you can open (the sidebar has them too).", content: false, defaultHidden: true, visible: user => MODULE_KEYS.some(key => canOpenModule(user, key)) },
] satisfies HomeSectionMeta[]);

const DEFAULT_ORDER = HOME_SECTIONS.map(section => section.key);

/**
 * The default order for this person's role: check-in first, then the modules they work in day to day (a practitioner's
 * clinic, an agent's queue, a driver's deliveries, an approver's expenses), then the rest, with news and notes last.
 */
export function defaultOrder(user: Pick<SessionUser, "permissions"> | null | undefined): HomeSectionKey[] {
  const held = (...permissions: string[]) => Boolean(user && holds(user, ...permissions));
  const rank: Partial<Record<HomeSectionKey, number>> = {
    attendance: 0,
    clinic: held("clinic.practitioner", "clinic.appointments.manage") ? 1 : 6,
    helpdesk: held("helpdesk.work") ? 1 : 5,
    logistics: held("logistics.deliver", "logistics.dispatch") ? 1 : 6,
    tasks: 2,
    expenses: held("expenses.approve", "expenses.pay") ? 3 : 7,
    billing: 4,
    sales: 4,
    inventory: 4,
    announcements: 8,
    celebrations: 9,
    notes: 10,
    modules: 11,
  };
  // Stable: ties keep the catalogue order.
  return [...DEFAULT_ORDER].sort((a, b) => (rank[a] ?? 6) - (rank[b] ?? 6));
}

/** The sections this person may see, in their role's default order. */
export function availableSections(user: Pick<SessionUser, "tenant" | "permissions"> | null | undefined): HomeSectionMeta[] {
  if (!user) return [];
  const order = defaultOrder(user);
  return HOME_SECTIONS.filter(section => section.visible(user)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

/** Hidden by the person, or off by default and never placed by them. */
export function isHidden(section: Pick<HomeSectionMeta, "key" | "defaultHidden">, layout: HomeLayout | null | undefined) {
  if (layout?.hidden.includes(section.key)) return true;
  return Boolean(section.defaultHidden && !layout?.order.includes(section.key));
}

/** Saved order first; sections it doesn't list slot in after their nearest predecessor in `sections` (already in default order). */
export function orderSections<T extends { key: HomeSectionKey }>(sections: readonly T[], order: readonly HomeSectionKey[] = []): T[] {
  const defaults = sections.map(section => section.key);
  const byKey = new Map(sections.map(section => [section.key, section]));
  const keys = order.filter(key => byKey.has(key));
  for (const section of sections) {
    if (keys.includes(section.key)) continue;
    let at = 0;
    for (let index = defaults.indexOf(section.key) - 1; index >= 0; index--) {
      const found = keys.indexOf(defaults[index]);
      if (found >= 0) {
        at = found + 1;
        break;
      }
    }
    keys.splice(at, 0, section.key);
  }
  return keys.map(key => byKey.get(key) as T);
}

/** How wide a section is on large screens: the person's choice, else a full row. */
export function sizeOf(key: HomeSectionKey, layout: HomeLayout | null | undefined): HomeSectionSize {
  return layout?.sizes?.[key] ?? "full";
}

/** What to save: this person's choices for the sections they see, keeping choices for sections they can't see right now. */
export function nextLayout(saved: HomeLayout | null | undefined, shown: readonly { key: HomeSectionKey; hidden: boolean }[]): HomeLayout {
  const seen = new Set(shown.map(item => item.key));
  const keep = (keys: readonly HomeSectionKey[] = []) => keys.filter(key => !seen.has(key));
  return {
    hidden: [...shown.filter(item => item.hidden).map(item => item.key), ...keep(saved?.hidden)],
    order: [...shown.map(item => item.key), ...keep(saved?.order)],
    ...(saved?.sizes ? { sizes: saved.sizes } : {}),
  };
}
