// Guided tours: the welcome tour (first sign-in) and one per module (first visit). Steps point at elements marked
// data-tour="…" in the shell and on pages; a step whose element isn't on screen (a phone without the sidebar, a page
// without that control) is shown as a centred card instead, so every tour works everywhere.
// The server knows the same keys (services/moduleSettings.js TOUR_KEYS) for the workspace's on/off switches.
import type { FeatureKey, SessionUser, TourKey } from "@/types/session";

export interface TourStep {
  /** CSS selector of the element to point at (the first visible match); none = a centred card */
  target?: string;
  title: string;
  body: string;
}

export interface TourMeta {
  key: TourKey;
  title: string;
  /** One line for the help centre */
  summary: string;
  /** First path segments (after the workspace) where this tour belongs */
  paths: string[];
  /** The module it explains (null: the welcome and admin tours) */
  feature: FeatureKey | null;
  steps: TourStep[];
  /** How-to tips listed in the help centre */
  tips: string[];
}

const PAGE = { title: '[data-tour="page-title"]', actions: '[data-tour="page-actions"]', tabs: '[data-tour="tabs"]' };

export const TOURS: readonly TourMeta[] = [
  {
    key: "welcome",
    title: "Welcome tour",
    summary: "Find your way around: modules, search, notifications, and your settings.",
    paths: [""],
    feature: null,
    steps: [
      { title: "Welcome!", body: "This short tour shows you around. It takes about a minute; you can leave it any time and replay it from the help menu (?)." },
      { target: '[data-tour="sidebar"]', title: "Your modules", body: "Everything you can use is in this menu. What you see depends on your role, so ask your admin if something you need is missing." },
      { target: '[data-tour="search"]', title: "Search and jump", body: "Find people, tickets, products, and pages, or run a command. Press Ctrl K (⌘ K on a Mac) from anywhere." },
      { target: '[data-tour="notifications"]', title: "Notifications", body: "Assignments, approvals, mentions, and reminders arrive here, live." },
      { target: '[data-tour="customize-home"]', title: "Make home yours", body: "Choose which sections your home page shows, drag them into the order you like, and set each one to full or half width." },
      { target: '[data-tour="help"]', title: "Help is one click away", body: "Open the help menu for a tour of the page you're on, the help centre, and how-to tips." },
      { target: '[data-tour="account"]', title: "You and your settings", body: "Your profile, password, theme, and the other workspaces you belong to." },
    ],
    tips: ["Press N on a task page to add a task.", "Ctrl K (⌘ K) opens search from anywhere.", "Settings → Appearance changes colours, text size, and density for you only."],
  },
  {
    key: "tasks",
    title: "Tasks",
    summary: "Personal tasks, lists, reminders, and the calendar.",
    paths: ["tasks", "calendar", "lists"],
    feature: "tasks",
    steps: [
      { target: PAGE.title, title: "Your tasks", body: "Today, Upcoming, Overdue, and All are views of the same tasks. Completed tasks move to Completed." },
      { target: '[data-tour="quick-add"]', title: "Add in a second", body: "Type a task and press Enter. Open the full form (N) for due dates, reminders, lists, and repeats." },
      { title: "Never miss a deadline", body: "Set a reminder and you get a notification at that time. Repeating tasks come back by themselves when you finish them." },
    ],
    tips: ["Lists group tasks by project or area.", "The calendar shows everything with a due date.", "Repeating tasks need a due date."],
  },
  {
    key: "helpdesk",
    title: "Help desk",
    summary: "Raise tickets, follow them, and (for agents) work the queue.",
    paths: ["tickets"],
    feature: "helpdesk",
    steps: [
      { target: PAGE.actions, title: "Raise a ticket", body: "Describe the problem, pick a category and priority. The right team sees it straight away." },
      { target: PAGE.tabs, title: "Queues", body: "Switch between tickets assigned to you, unassigned ones, and your own requests." },
      { title: "Response targets", body: "Each priority has a response and resolution target. Tickets close to their deadline are flagged so nothing slips." },
    ],
    tips: ["Internal notes on a ticket are visible to staff only.", "Requesters rate the help once a ticket is resolved."],
  },
  {
    key: "directory",
    title: "Teams & people",
    summary: "Find colleagues, see teams and their leads.",
    paths: ["people", "teams"],
    feature: "directory",
    steps: [
      { target: PAGE.title, title: "Who's who", body: "Search by name, email, or job title. Click a person for their teams and contact details." },
      { title: "Teams", body: "Teams group people (and route help desk tickets). Team leads are marked on each team." },
    ],
    tips: ["Birthdays only show when the person shares them."],
  },
  {
    key: "messaging",
    title: "Messages",
    summary: "Direct messages and group chats.",
    paths: ["messages"],
    feature: "messaging",
    steps: [
      { target: PAGE.actions, title: "Start a conversation", body: "Message one colleague, or start a group for a team or project." },
      { title: "Live", body: "Messages arrive instantly; unread conversations are shown in bold with a count." },
    ],
    tips: ["Group admins can rename a group and add or remove people."],
  },
  {
    key: "announcements",
    title: "Announcements",
    summary: "News for everyone or chosen roles.",
    paths: ["announcements"],
    feature: "announcements",
    steps: [{ target: PAGE.title, title: "Company news", body: "Announcements for everyone, or for your roles. Pinned ones stay on top; new ones show on your home page." }],
    tips: ["People who may post choose who sees each announcement."],
  },
  {
    key: "inventory",
    title: "Inventory",
    summary: "Products, stock levels, and every movement.",
    paths: ["inventory"],
    feature: "inventory",
    steps: [
      { target: PAGE.actions, title: "Add products", body: "Give each product a SKU, prices, and a reorder level." },
      { title: "Stock movements", body: "Record stock in, out, and counts on a product. The level updates and the history keeps who did what." },
      { title: "Low stock", body: "When a product drops to its reorder level, the people who manage products are notified." },
    ],
    tips: ["Sales orders take stock automatically when they're confirmed."],
  },
  {
    key: "sales",
    title: "Sales",
    summary: "Customers, the deal pipeline, and orders.",
    paths: ["sales"],
    feature: "sales",
    steps: [
      { target: PAGE.tabs, title: "Pipeline, customers, orders", body: "Track deals from lead to won, keep customer details, and turn won deals into orders." },
      { title: "From deal to invoice", body: "Confirmed orders take stock (with Inventory) and can be invoiced in Billing." },
    ],
    tips: ["Drag deals between stages on the pipeline board."],
  },
  {
    key: "billing",
    title: "Billing",
    summary: "Quotes, invoices, and payments.",
    paths: ["billing"],
    feature: "billing",
    steps: [
      { target: PAGE.actions, title: "Quotes and invoices", body: "Prepare a draft, then issue it. Accepted quotes convert to invoices in one click." },
      { title: "Payments", body: "Record full or part payments; the balance and status update by themselves, and overdue invoices are flagged." },
    ],
    tips: ["Print or save any invoice as PDF from its page."],
  },
  {
    key: "logistics",
    title: "Logistics",
    summary: "Shipments, dispatch, fleet, and tracking.",
    paths: ["logistics"],
    feature: "logistics",
    steps: [
      { target: PAGE.actions, title: "Book a shipment", body: "Each shipment gets a number and a public tracking code for the customer." },
      { title: "Dispatch and deliver", body: "Assign a carrier, vehicle, and driver. Drivers update the status on the road; proof of delivery can be required." },
    ],
    tips: ["Customers follow a shipment at /track with its code: no sign-in needed."],
  },
  {
    key: "attendance",
    title: "Attendance & leave",
    summary: "Check in and out, request leave, holidays.",
    paths: ["attendance"],
    feature: "attendance",
    steps: [
      { target: PAGE.title, title: "Your day", body: "Check in when you start and out when you finish (or automatically, if your workspace turned that on)." },
      { target: PAGE.tabs, title: "Leave and holidays", body: "Request leave, see your balance, and the holiday calendar. Approvers see requests waiting for them." },
    ],
    tips: ["Half days are available when your workspace allows them."],
  },
  {
    key: "expenses",
    title: "Expenses",
    summary: "Claim expenses and follow approvals.",
    paths: ["expenses"],
    feature: "expenses",
    steps: [
      { target: PAGE.actions, title: "Make a claim", body: "Add what you spent, the category, and the date. It goes to the approvers." },
      { title: "Approval and payment", body: "You're notified when a claim is approved or rejected, and when it's paid." },
    ],
    tips: ["Your workspace may set a maximum per claim."],
  },
  {
    key: "clinic",
    title: "Clinic",
    summary: "Appointments, the queue, patients, and visits.",
    paths: ["clinic", "clinic-display"],
    feature: "clinic",
    steps: [
      { target: PAGE.tabs, title: "The clinic day", body: "The appointment book, today's queue, and patients. Reception checks patients in and issues tokens." },
      { title: "Visits", body: "Practitioners record the visit, vitals, and prescriptions for their patients; nurses can record vitals first." },
    ],
    tips: ["Patients can follow their token on their phone with the code on the slip."],
  },
  {
    key: "notes",
    title: "Notes",
    summary: "Sticky notes, private or shared.",
    paths: ["notes"],
    feature: "notes",
    steps: [{ target: PAGE.title, title: "Notes board", body: "Write sticky notes, colour them, and share them with colleagues or everyone. Drag notes to arrange your board." }],
    tips: ["Shared notes can be edited together."],
  },
  {
    key: "admin",
    title: "Running the workspace",
    summary: "People, roles, access rules, settings, and the audit log.",
    paths: ["users", "roles", "audit", "admin"],
    feature: null,
    steps: [
      { target: PAGE.title, title: "Administration", body: "Add people and give them roles; roles decide what each person can see and do." },
      { title: "Access rules", body: "Roles & access → Access rules: give one person extra access for a while, or limit a module to read-only. Check access shows exactly why someone can do something." },
      { title: "Settings and help", body: "Workspace admin → Settings: branding, look and feel, module settings, security, and these help tours (switch them on or off)." },
    ],
    tips: ["Every change to people, roles, and settings is in the audit log.", "Temporary access ends by itself on the date you set."],
  },
];

export const TOUR_BY_KEY = new Map(TOURS.map(tour => [tour.key, tour]));

/** The tour that belongs to a path (without the workspace prefix): "/" → welcome, "/tickets/12" → helpdesk. */
export function tourForPath(pathname: string): TourMeta | null {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return TOURS.find(tour => tour.paths.includes(first)) ?? null;
}

const ADMIN_PERMISSIONS = ["workspace.users.manage", "workspace.roles.manage", "workspace.settings.manage", "workspace.audit.view"];

/** Tours this person can use: the workspace's on, their module licensed and open to them. */
export function availableTours(user: Pick<SessionUser, "tenant" | "permissions"> | null | undefined): TourMeta[] {
  if (!user) return [];
  const help = user.tenant.settings.help;
  if (help && !help.enabled) return [];
  const off = new Set(help?.disabledTours ?? []);
  return TOURS.filter(tour => {
    if (off.has(tour.key)) return false;
    if (tour.key === "admin") return ADMIN_PERMISSIONS.some(permission => user.permissions.includes(permission));
    if (!tour.feature) return true;
    return user.tenant.features.includes(tour.feature);
  });
}
