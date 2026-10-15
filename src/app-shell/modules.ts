// The modules a workspace (tenant) can be licensed for. Keys match the server's FEATURES list.
// `access`: holding any of these permissions opens the module (mirrors the server's gates in app.js).
import type { ComponentType } from "react";
import { Boxes, CalendarCheck, CheckSquare, Contact, FileText, LifeBuoy, Megaphone, MessagesSquare, ReceiptText, StickyNote, Stethoscope, TrendingUp, Truck } from "lucide-react";
import type { FeatureKey, SessionUser } from "@/types/session";

export interface ModuleMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  /** Where the module opens */
  path: string;
  access: readonly string[];
}

export const MODULES: Readonly<Record<FeatureKey, ModuleMeta>> = Object.freeze({
  tasks: { label: "Tasks", icon: CheckSquare, description: "Personal tasks, lists, reminders, and calendar.", path: "/tasks/today", access: ["tasks.use"] },
  helpdesk: { label: "Help desk", icon: LifeBuoy, description: "Tickets with assignment, response targets, and ratings.", path: "/tickets", access: ["helpdesk.use", "helpdesk.work"] },
  directory: { label: "Teams & people", icon: Contact, description: "Departments, team leads, and the staff directory.", path: "/people", access: ["directory.view", "directory.teams.manage"] },
  notes: { label: "Notes", icon: StickyNote, description: "Sticky notes you can keep private or edit together with colleagues.", path: "/notes", access: ["notes.use", "notes.manage"] },
  messaging: { label: "Messages", icon: MessagesSquare, description: "Direct messages and group chats between colleagues.", path: "/messages", access: ["messaging.use", "messaging.groups.create"] },
  announcements: {
    label: "Announcements",
    icon: Megaphone,
    description: "Company notices with pinning and read receipts.",
    path: "/announcements",
    // Everyone reads the announcements addressed to them; these permissions post and manage.
    access: [],
  },
  inventory: {
    label: "Inventory",
    icon: Boxes,
    description: "Products, stock in and out, and low-stock alerts.",
    path: "/inventory",
    access: ["inventory.view", "inventory.products.edit", "inventory.stock.move", "inventory.products.delete"],
  },
  sales: { label: "Sales", icon: TrendingUp, description: "Customers, deal pipeline, and sales orders.", path: "/sales", access: ["sales.view", "sales.edit", "sales.orders.confirm", "sales.delete"] },
  billing: {
    label: "Billing",
    icon: FileText,
    description: "Quotes, tax invoices, payments, and receivables.",
    path: "/billing",
    access: ["billing.view", "billing.edit", "billing.issue", "billing.payments.record", "billing.delete"],
  },
  logistics: {
    label: "Logistics",
    icon: Truck,
    description: "Shipments, dispatch, drivers, fleet, and live tracking.",
    path: "/logistics",
    access: ["logistics.view", "logistics.edit", "logistics.dispatch", "logistics.deliver", "logistics.fleet.manage"],
  },
  attendance: {
    label: "Attendance",
    icon: CalendarCheck,
    description: "Automatic check-in, leave with half days, holidays, and balances.",
    path: "/attendance",
    access: ["attendance.self", "attendance.team.view", "attendance.leave.approve", "attendance.holidays.manage"],
  },
  expenses: { label: "Expenses", icon: ReceiptText, description: "Expense claims with approval and payment.", path: "/expenses", access: ["expenses.submit", "expenses.approve", "expenses.pay"] },
  clinic: {
    label: "Clinic",
    icon: Stethoscope,
    description: "Doctor schedules, appointments, patients, visits, and prescriptions.",
    path: "/clinic",
    access: ["clinic.schedule.view", "clinic.appointments.manage", "clinic.patients.manage", "clinic.practitioner", "clinic.records.view", "clinic.providers.manage", "clinic.vitals.record"],
  },
});

export const MODULE_KEYS = Object.freeze(Object.keys(MODULES) as FeatureKey[]);

/** Labels for permission groups in the role editor ("workspace" isn't a licensable module). */
export const PERMISSION_GROUPS: Readonly<Record<string, { label: string }>> = Object.freeze({ workspace: { label: "Workspace administration" }, ...MODULES });

/** Whether a session can open a module: licensed for the workspace and holding one of its permissions. */
export function canOpenModule(user: Pick<SessionUser, "tenant" | "permissions"> | null | undefined, key: FeatureKey) {
  const meta = MODULES[key];
  if (!meta || !user?.tenant?.features.includes(key)) return false;
  return !meta.access.length || meta.access.some(permission => user.permissions?.includes(permission));
}
