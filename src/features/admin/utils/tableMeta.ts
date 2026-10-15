// Display metadata for the console's tables and the modules they belong to.
import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Bell,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarHeart,
  Car,
  CheckSquare,
  ClipboardList,
  FileText,
  Handshake,
  HeartPulse,
  KeyRound,
  List,
  ListOrdered,
  MapPin,
  Megaphone,
  MessagesSquare,
  Package,
  Palmtree,
  Pill,
  Receipt,
  ReceiptText,
  ScrollText,
  Settings2,
  Stethoscope,
  Ticket,
  Truck,
  UserRound,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { MODULES, type ModuleMeta } from "@/app-shell/modules";
import type { TableModule } from "../services/adminService";

type Icon = ComponentType<{ className?: string }>;

export const TABLE_ICONS: Record<string, Icon> = {
  tenants: Building2,
  users: Users,
  teams: UsersRound,
  tickets: Ticket,
  ticket_comments: MessagesSquare,
  products: Boxes,
  stock_movements: ArrowLeftRight,
  customers: UserRound,
  deals: Handshake,
  orders: Receipt,
  order_items: ReceiptText,
  invoices: FileText,
  invoice_items: ListOrdered,
  invoice_payments: Banknote,
  carriers: Truck,
  vehicles: Car,
  shipments: Package,
  shipment_events: MapPin,
  clinic_providers: Stethoscope,
  patients: HeartPulse,
  appointments: CalendarClock,
  clinic_visits: ClipboardList,
  prescriptions: Pill,
  attendance_records: CalendarCheck,
  leave_requests: Palmtree,
  holidays: CalendarHeart,
  roles: KeyRound,
  tenant_audit: ScrollText,
  expenses: Wallet,
  announcements: Megaphone,
  lists: List,
  tasks: CheckSquare,
  notifications: Bell,
};

/** Label and icon of a table's module ("workspace" covers people, roles, and the audit log). */
export function moduleMeta(module: TableModule): { label: string; icon: Icon } {
  if (module === "workspace") return { label: "Workspace", icon: Settings2 };
  if (module === "provider") return { label: "Provider", icon: Building2 };
  const meta = MODULES[module] as ModuleMeta | undefined;
  return { label: meta?.label ?? module, icon: meta?.icon ?? Settings2 };
}
