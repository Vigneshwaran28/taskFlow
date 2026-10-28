// Shapes of the session (GET /api/auth/me) and workspace settings, mirroring the Express server
// (server/src/routes/auth.js toUser and server/src/services/moduleSettings.js DEFAULT_SETTINGS).
import type { Accent, AppearancePreferences, StylePreset } from "@/hooks/useTheme";
import type { MaintenanceInfo } from "@/lib/maintenance";

/** Home page sections a person can hide or reorder (server/src/routes/auth.js HOME_SECTIONS). */
export const HOME_SECTION_KEYS = ["attendance", "celebrations", "announcements", "tasks", "helpdesk", "expenses", "sales", "billing", "inventory", "logistics", "clinic", "notes", "modules"] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];
export interface HomeLayout {
  hidden: HomeSectionKey[];
  /** Preferred order; sections not listed keep their default place after these */
  order: HomeSectionKey[];
  /** Width on large screens: a full row, or half (two side by side); missing = the section's default */
  sizes?: Partial<Record<HomeSectionKey, HomeSectionSize>>;
}
export type HomeSectionSize = "full" | "half";

/** Guided tours (features/help): welcome, a module key, or admin. */
export type TourKey = "welcome" | "tasks" | "helpdesk" | "directory" | "messaging" | "announcements" | "inventory" | "sales" | "billing" | "logistics" | "attendance" | "expenses" | "clinic" | "notes" | "admin";
/**
 * Saved on the account (PATCH /api/auth/me/preferences): appearance, the home layout (null = default), the profile
 * picture link, and personal CSS (server: routes/auth.js preferencesSchema).
 */
export type AccountPreferences = Partial<AppearancePreferences> & {
  homeLayout?: HomeLayout | null;
  /** Tours finished or skipped; off: tours never start by themselves */
  tours?: { seen?: TourKey[]; off?: boolean };
  /** Profile picture link ("" = none); also set from the profile form */
  avatarUrl?: string;
  /** Personal CSS, applied after the workspace's (same rules, at most 10,000 characters) */
  customCss?: string;
  customCssEnabled?: boolean;
};

/** Module keys a workspace can be licensed for (server/src/services/tenants.js FEATURES). */
export type FeatureKey =
  | "tasks"
  | "helpdesk"
  | "directory"
  | "messaging"
  | "announcements"
  | "inventory"
  | "sales"
  | "billing"
  | "logistics"
  | "attendance"
  | "expenses"
  | "clinic"
  | "notes";

export type Priority = "urgent" | "high" | "medium" | "low";
export type LeaveType = "annual" | "sick" | "casual" | "unpaid" | "other";
export type AppointmentType = "consultation" | "follow_up" | "procedure" | "teleconsult" | "vaccination" | "lab_test" | "checkup";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "upi" | "cheque" | "other";
export type CelebrationMode = "everyone" | "self" | "off";
/** Layouts for a workspace's own sign-in page (server: moduleSettings LOGIN_TEMPLATES). */
export type LoginTemplate = "split" | "centered" | "banner" | "minimal" | "corporate";
export type LoginBackground = "indigo" | "ocean" | "sunset" | "forest" | "midnight" | "rose" | "plain";

/** GET /api/public/workspaces/:slug — what a workspace's sign-in page shows. */
export interface PublicWorkspace {
  slug: string;
  name: string;
  active: boolean;
  siteTitle: string;
  tagline: string;
  accent: Accent;
  /** Logo icon key (components/shared/logoIcons.ts) and optional image link */
  logoIcon?: string;
  logoUrl?: string | null;
  login: {
    template: LoginTemplate;
    background: LoginBackground;
    headline: string;
    message: string;
    highlights: string[];
    supportContact: string;
    /** The workspace's sign-in page CSS (sanitized server-side); present only while custom CSS is on. */
    customCss?: string;
  };
  /** The workspace's look and feel (corners, shadows, type, motion) */
  ui?: Partial<Record<string, string>>;
  companyName: string;
  features: FeatureKey[];
  /** The workspace's maintenance window now, and one coming soon */
  maintenance?: MaintenanceInfo;
}

export interface WorkspaceSettings {
  helpdesk: { sla: Record<Priority, { response: number; resolution: number }>; categories: string[] };
  attendance: {
    autoCheckIn: boolean;
    workdayStart: string;
    lateAfterMinutes: number;
    workingDays: number[];
    halfDayLeave: boolean;
    leaveTypes: LeaveType[];
    annualAllowance: number;
    saturdaysOff: number[];
    optionalHolidayQuota: number;
  };
  inventory: { units: string[]; lowStockAlerts: boolean };
  sales: { currency: string };
  billing: {
    invoicePrefix: string;
    quotePrefix: string;
    taxLabel: string;
    defaultTaxRate: number;
    paymentTermsDays: number;
    quoteValidityDays: number;
    paymentMethods: PaymentMethod[];
    defaultNotes: string;
    defaultTerms: string;
  };
  logistics: { shipmentPrefix: string; publicTracking: boolean; requireProofOfDelivery: boolean };
  clinic: { mrnPrefix: string; appointmentTypes: AppointmentType[]; defaultSlotMinutes: number; allowOverbooking: boolean; bookingWindowDays: number };
  messaging: { allowGroups: boolean };
  expenses: { categories: string[]; maxAmount: number | null };
  celebrations: { birthdays: CelebrationMode; anniversaries: CelebrationMode };
  branding: {
    siteTitle: string;
    tagline: string;
    accent: Accent;
    lockAccent: boolean;
    /** Default style preset for everyone (people can pick their own unless lockStyle); the server always sends both */
    style?: StylePreset;
    lockStyle?: boolean;
    loginTemplate: LoginTemplate;
    loginBackground: LoginBackground;
    loginHeadline: string;
    loginMessage: string;
    loginHighlights: string[];
    supportContact: string;
    /** Tenant CSS for the sign-in page and the signed-in app (server: services/moduleSettings.js customCssProblem). */
    customCssEnabled?: boolean;
    customCss?: { login: string; app: string };
    /** false: people can't add their own CSS (the server refuses it and the app ignores it); default true */
    allowUserCss?: boolean;
    /** Logo: an icon key (components/shared/logoIcons.ts) on the brand colour, or an image link ("" = none) */
    logoIcon?: string;
    logoUrl?: string;
    /** The app's background picture link ("" = none) and how much the page colour dims it (0-90) */
    backgroundImage?: string;
    backgroundDim?: number;
    backgroundTextColor?: string | null;
    /** Look and feel of every UI element (features/workspace/utils/uiOptions.ts); missing values are the defaults */
    ui?: Partial<Record<string, string>>;
  };
  company: { legalName: string; address: string; taxId: string; email: string; phone: string; website: string; currency: string };
  /** Help for new people: guided tours and the help centre (features/help). */
  help: { enabled: boolean; autoStart: boolean; helpCenter: boolean; disabledTours: TourKey[]; welcomeMessage: string };
  /** The workspace's restrictions (server: services/securityPolicy.js enforces them). */
  security: {
    passwordMinLength: number;
    passwordRequireMixed: boolean;
    /** How long a sign-in lasts (one of SESSION_HOUR_CHOICES) */
    sessionHours: number;
    /** Accounts must use one of these email domains (empty = any) */
    allowedEmailDomains: string[];
    /** Licensed modules the workspace switched off for everyone */
    disabledModules: FeatureKey[];
  };
}

/** GET /api/auth/sessions — a workspace this browser is signed in to. */
export interface WorkspaceSession {
  slug: string;
  siteTitle: string;
  accent: Accent;
  user: { name: string; email: string };
  /** The most recent sign-in on this browser */
  latest: boolean;
  /** The workspace is in a maintenance window */
  maintenance?: boolean;
  /** Owner or user manager in that workspace */
  isAdmin?: boolean;
}

export type SettingsKey = keyof WorkspaceSettings;

export interface RoleRef {
  id: number;
  /** Built-in roles have a key (owner, admin, agent, member); custom roles have null */
  key: string | null;
  name: string;
}

export interface SessionTenant {
  id: number;
  name: string;
  slug: string;
  features: FeatureKey[];
  settings: WorkspaceSettings;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
  roles: RoleRef[];
  /** Effective permission keys, e.g. "helpdesk.work" */
  permissions: string[];
  isOwner: boolean;
  /** Signed in with a temporary password */
  mustChangePassword: boolean;
  dateOfBirth: string | null;
  age: number | null;
  joinedOn: string | null;
  showBirthday: boolean;
  /** Profile picture link (null = initials) */
  avatarUrl: string | null;
  preferences: AccountPreferences;
  createdAt: string;
  tenant: SessionTenant;
  /** active reaches only owners and admins a window lets in; upcoming: a window starting soon */
  maintenance?: MaintenanceInfo;
}

/** Paginated list responses used across modules. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A person as embedded in other records. */
export interface PersonRef {
  id: number;
  name: string;
  jobTitle?: string | null;
  /** Profile picture link, where the API includes it (people, tickets, messages); null = initials */
  avatarUrl?: string | null;
}
