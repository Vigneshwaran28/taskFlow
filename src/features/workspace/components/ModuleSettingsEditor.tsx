"use client";
import { useId, useState, type ComponentType, type ReactNode } from "react";
import { Building2, Cake, GraduationCap, Palette } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { STYLE_META, StylePreview } from "@/components/shared/StylePreview";
import { BrandAssetsFields, validateBrandAssets } from "./BrandAssetsFields";
import { STYLES, type Accent, ACCENTS, ACCENT_META } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { LoginBrandingFields } from "@/features/auth";
import { CustomCssFields } from "./CustomCssFields";
import { UiCustomizationFields } from "./UiCustomizationFields";
import { HelpSettingsEditor } from "@/features/help";
import { resolveUi } from "../utils/uiOptions";
import type { AppointmentType, CelebrationMode, FeatureKey, LeaveType, PaymentMethod, Priority, SettingsKey, WorkspaceSettings } from "@/types/session";

const TICKET_CATEGORIES: Record<string, string> = {
  it_support: "IT support",
  access: "Access & accounts",
  hardware: "Hardware",
  software: "Software & licenses",
  hr: "HR & people",
  facilities: "Facilities & office",
  finance: "Finance & purchasing",
  other: "Other",
};
const LEAVE_TYPES: Record<LeaveType, string> = { annual: "Annual", sick: "Sick", casual: "Casual", unpaid: "Unpaid", other: "Other" };
const PAYMENT_METHODS: Record<PaymentMethod, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank transfer", upi: "UPI", cheque: "Cheque", other: "Other" };
const APPOINTMENT_TYPES: Record<AppointmentType, string> = {
  consultation: "Consultation",
  follow_up: "Follow-up",
  procedure: "Procedure",
  teleconsult: "Teleconsultation",
  vaccination: "Vaccination",
  lab_test: "Lab test",
  checkup: "Check-up",
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRIORITIES: readonly Priority[] = ["urgent", "high", "medium", "low"];
const SLA_FIELDS = ["response", "resolution"] as const;
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "ZAR"];
/** Swatch class per accent (useTheme.tsx ACCENT_META). */
const SWATCHES = Object.fromEntries(ACCENTS.map(name => [name, ACCENT_META[name].swatch])) as Record<Accent, string>;

/** Licensed modules that have settings. Tasks and directory have none; sales' only setting (currency) is in Company details. */
/** Who may post announcements or create groups are permissions (Roles & access), not settings. */
export const CONFIGURABLE_MODULES = Object.freeze(["helpdesk", "attendance", "inventory", "billing", "logistics", "clinic", "messaging", "expenses"] as const);
export type ConfigurableModule = (typeof CONFIGURABLE_MODULES)[number];

export interface WorkspaceSettingMeta {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

/** Workspace-wide settings: always available, whatever modules are licensed. */
export const WORKSPACE_SETTINGS = Object.freeze({
  branding: { label: "Branding", description: "Website title, tagline, brand colour, and the sign-in page.", icon: Palette },
  celebrations: { label: "Birthdays & anniversaries", description: "Greetings on birthdays and work anniversaries.", icon: Cake },
  company: { label: "Company details", description: "Legal name, address, tax ID, and currency. Printed on invoices and prescriptions.", icon: Building2 },
  help: { label: "Help & onboarding", description: "Guided tours for people new to the workspace, and the help centre.", icon: GraduationCap },
} satisfies Record<string, WorkspaceSettingMeta>);
export type WorkspaceSettingKey = keyof typeof WORKSPACE_SETTINGS;

/** Every settings key the panel can edit. */
export type EditableSettingsKey = ConfigurableModule | WorkspaceSettingKey;

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const textAreaClass =
  "w-full resize-y rounded-lg border border-input bg-card px-2.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  options: Record<T, string>;
  selected: readonly T[];
  onChange: (next: T[]) => void;
  hint?: string;
}

/** Checkbox group over a fixed set of keys. */
function ChoiceGroup<T extends string>({ legend, options, selected, onChange, hint }: ChoiceGroupProps<T>) {
  const toggle = (key: T) => onChange(selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(options) as T[]).map(key => {
          const checked = selected.includes(key);
          return (
            <label
              key={key}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(key)} className="sr-only" />
              {options[key]}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

/** Free-form list edited as comma-separated text; keeps the raw text while typing. */
function ListInput({ id, value, onChange, placeholder }: { id: string; value: readonly string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      id={id}
      value={text}
      placeholder={placeholder}
      onChange={event => {
        setText(event.target.value);
        onChange(
          event.target.value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)
        );
      }}
      className={inputClass}
    />
  );
}

type NumberInputProps = { id: string; min?: number; max?: number; step?: number; placeholder?: string } & (
  | { allowEmpty: true; value: number | null; onChange: (value: number | null) => void }
  | { allowEmpty?: false; value: number; onChange: (value: number) => void }
);

/** Number input that stores a number (or null when cleared, if allowed). */
function NumberInput(props: NumberInputProps) {
  const { id, min = 0, max, step = 1, placeholder, value } = props;
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={event => {
        if (event.target.value === "") {
          if (props.allowEmpty) props.onChange(null);
          else props.onChange(0);
          return;
        }
        const number = Number(event.target.value);
        if (!Number.isNaN(number)) props.onChange(number);
      }}
      className={cn(inputClass, "tabular-nums")}
    />
  );
}

/** Text input bound to one string setting. */
function TextInput({ id, value, onChange, maxLength, placeholder, type = "text", autoComplete }: { id: string; value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string; type?: string; autoComplete?: string }) {
  return <input id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} onChange={event => onChange(event.target.value)} className={inputClass} />;
}

function CurrencyInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <>
      <input id={id} list={`${id}-list`} maxLength={3} value={value} onChange={event => onChange(event.target.value.toUpperCase())} className={cn(inputClass, "uppercase")} />
      <datalist id={`${id}-list`}>
        {CURRENCIES.map(code => (
          <option key={code} value={code} />
        ))}
      </datalist>
    </>
  );
}

interface EditorProps<K extends SettingsKey> {
  value: WorkspaceSettings[K];
  onChange: (value: WorkspaceSettings[K]) => void;
  /** The workspace's name: the default for titles left empty */
  workspaceName: string;
  /** The workspace's address, modules, and company name (branding: the sign-in page section) */
  workspace?: WorkspaceContext;
  /** Server field errors for this module, by field ("logoUrl", "customCss.app", …) */
  errors?: ModuleFieldErrors;
}

/** Field errors for one module's settings, keyed by the path inside it ("logoUrl", "customCss.login"). */
export type ModuleFieldErrors = Partial<Record<string, string>>;

export interface WorkspaceContext {
  slug: string;
  features: readonly FeatureKey[];
  companyName?: string;
}

/** `set("field", next)` for an editor's settings object. */
const setterFor =
  <T extends object>(value: T, onChange: (value: T) => void) =>
  <F extends keyof T>(key: F, next: T[F]) =>
    onChange({ ...value, [key]: next });

function HelpdeskEditor({ value, onChange }: EditorProps<"helpdesk">) {
  const id = useId();
  const set = setterFor(value, onChange);
  const setSla = (priority: Priority, field: (typeof SLA_FIELDS)[number], hours: number) => set("sla", { ...value.sla, [priority]: { ...value.sla[priority], [field]: hours } });
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Service targets (hours)</legend>
        <div className="relative overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Priority
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  First reply within
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Resolve within
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PRIORITIES.map(priority => (
                <tr key={priority}>
                  <th scope="row" className="px-3 py-2 text-left font-medium capitalize">
                    {priority}
                  </th>
                  {SLA_FIELDS.map(field => (
                    <td key={field} className="px-3 py-1.5">
                      <label htmlFor={`${id}-${priority}-${field}`} className="sr-only">
                        {priority} {field} hours
                      </label>
                      <NumberInput id={`${id}-${priority}-${field}`} min={0.25} step={0.25} value={value.sla[priority][field]} onChange={hours => setSla(priority, field, hours)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
      <ChoiceGroup legend="Categories people can pick" options={TICKET_CATEGORIES} selected={value.categories} onChange={next => set("categories", next)} />
    </div>
  );
}

function AttendanceEditor({ value, onChange }: EditorProps<"attendance">) {
  const id = useId();
  const set = setterFor(value, onChange);
  const toggleDay = (day: number) =>
    set("workingDays", value.workingDays.includes(day) ? value.workingDays.filter(item => item !== day) : [...value.workingDays, day].sort((a, b) => a - b));
  return (
    <div className="flex flex-col gap-4">
      <Toggle
        label="Take attendance automatically"
        description="The first time someone opens the app on a working day, they're checked in. Skipped on full-day leave."
        checked={value.autoCheckIn}
        onChange={next => set("autoCheckIn", next)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Workday starts" htmlFor={`${id}-start`}>
          <input id={`${id}-start`} type="time" value={value.workdayStart} onChange={event => event.target.value && set("workdayStart", event.target.value)} className={inputClass} />
        </Field>
        <Field label="Late after (minutes)" htmlFor={`${id}-late`} hint="Grace period after the start time.">
          <NumberInput id={`${id}-late`} value={value.lateAfterMinutes} onChange={next => set("lateAfterMinutes", Math.round(next))} />
        </Field>
        <Field label="Annual leave per year" htmlFor={`${id}-allowance`} hint="Days of annual leave.">
          <NumberInput id={`${id}-allowance`} value={value.annualAllowance} onChange={next => set("annualAllowance", Math.round(next))} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Working days</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((label, day) => {
            const checked = value.workingDays.includes(day);
            return (
              <label
                key={label}
                className={cn(
                  "flex h-9 w-12 cursor-pointer items-center justify-center rounded-lg border text-xs font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  checked ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleDay(day)} className="sr-only" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {value.workingDays.includes(6) && (
        <ChoiceGroup
          legend="Saturdays off"
          options={{ 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" } as Record<string, string>}
          selected={(value.saturdaysOff ?? []).map(String)}
          onChange={next => set("saturdaysOff", next.map(Number).sort((a, b) => a - b))}
          hint="Saturday is a working day; pick the Saturdays of each month that are off (for example 2nd and 4th)."
        />
      )}
      <Field label="Optional holidays per person, per year" htmlFor={`${id}-quota`} hint="People pick these from the optional holidays you publish." className="sm:w-72">
        <NumberInput id={`${id}-quota`} value={value.optionalHolidayQuota ?? 2} onChange={next => set("optionalHolidayQuota", Math.round(next))} />
      </Field>
      <Toggle label="Allow half-day leave" description="First or second half of a single day; counts as 0.5 days." checked={value.halfDayLeave} onChange={next => set("halfDayLeave", next)} />
      <ChoiceGroup legend="Leave types" options={LEAVE_TYPES} selected={value.leaveTypes} onChange={next => set("leaveTypes", next)} />
    </div>
  );
}

function InventoryEditor({ value, onChange }: EditorProps<"inventory">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Units" htmlFor={`${id}-units`} hint="Comma-separated, e.g. pcs, box, kg.">
        <ListInput id={`${id}-units`} value={value.units} onChange={next => set("units", next)} />
      </Field>
      <Toggle label="Low-stock alerts" description="Notify admins when a product drops to its reorder level." checked={value.lowStockAlerts} onChange={next => set("lowStockAlerts", next)} />
    </div>
  );
}

function BillingEditor({ value, onChange }: EditorProps<"billing">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Invoice number prefix" htmlFor={`${id}-invoice-prefix`} hint="e.g. INV- gives INV-0001.">
          <TextInput id={`${id}-invoice-prefix`} maxLength={10} value={value.invoicePrefix} onChange={next => set("invoicePrefix", next)} />
        </Field>
        <Field label="Quote number prefix" htmlFor={`${id}-quote-prefix`} hint="e.g. QT- gives QT-0001.">
          <TextInput id={`${id}-quote-prefix`} maxLength={10} value={value.quotePrefix} onChange={next => set("quotePrefix", next)} />
        </Field>
        <Field label="Tax label" htmlFor={`${id}-tax-label`} hint="Shown on documents, e.g. GST or VAT.">
          <TextInput id={`${id}-tax-label`} maxLength={20} value={value.taxLabel} onChange={next => set("taxLabel", next)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Default tax rate (%)" htmlFor={`${id}-tax-rate`} hint="Prefilled on new lines.">
          <NumberInput id={`${id}-tax-rate`} max={100} step={0.01} value={value.defaultTaxRate} onChange={next => set("defaultTaxRate", next)} />
        </Field>
        <Field label="Payment terms (days)" htmlFor={`${id}-terms-days`} hint="Due date = issue date + these days.">
          <NumberInput id={`${id}-terms-days`} max={365} value={value.paymentTermsDays} onChange={next => set("paymentTermsDays", Math.round(next))} />
        </Field>
        <Field label="Quotes valid for (days)" htmlFor={`${id}-validity`}>
          <NumberInput id={`${id}-validity`} min={1} max={365} value={value.quoteValidityDays} onChange={next => set("quoteValidityDays", Math.round(next))} />
        </Field>
      </div>
      <ChoiceGroup legend="Payment methods" options={PAYMENT_METHODS} selected={value.paymentMethods} onChange={next => set("paymentMethods", next)} hint="The ways customers can pay, offered when recording a payment." />
      <Field label="Default notes" htmlFor={`${id}-notes`} hint="Prefilled on new invoices and quotes.">
        <textarea id={`${id}-notes`} rows={2} maxLength={1000} value={value.defaultNotes} onChange={event => set("defaultNotes", event.target.value)} className={textAreaClass} />
      </Field>
      <Field label="Default terms & conditions" htmlFor={`${id}-terms`} hint="Printed at the bottom of documents.">
        <textarea id={`${id}-terms`} rows={3} maxLength={2000} value={value.defaultTerms} onChange={event => set("defaultTerms", event.target.value)} className={textAreaClass} />
      </Field>
    </div>
  );
}

function LogisticsEditor({ value, onChange }: EditorProps<"logistics">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Shipment number prefix" htmlFor={`${id}-prefix`} hint="e.g. SHP- gives SHP-0001." className="sm:w-60">
        <TextInput id={`${id}-prefix`} maxLength={10} value={value.shipmentPrefix} onChange={next => set("shipmentPrefix", next)} />
      </Field>
      <Toggle
        label="Public tracking"
        description="Customers can follow a shipment with its tracking code. No personal details are shown."
        checked={value.publicTracking}
        onChange={next => set("publicTracking", next)}
      />
      <Toggle
        label="Require proof of delivery"
        description="Marking a shipment delivered needs the name of the person who received it."
        checked={value.requireProofOfDelivery}
        onChange={next => set("requireProofOfDelivery", next)}
      />
    </div>
  );
}

function ClinicEditor({ value, onChange }: EditorProps<"clinic">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Patient number (MRN) prefix" htmlFor={`${id}-mrn`} hint="e.g. MRN- gives MRN-0001.">
          <TextInput id={`${id}-mrn`} maxLength={10} value={value.mrnPrefix} onChange={next => set("mrnPrefix", next)} />
        </Field>
        <Field label="Default slot (minutes)" htmlFor={`${id}-slot`} hint="Length of a new appointment.">
          <NumberInput id={`${id}-slot`} min={5} max={240} step={5} value={value.defaultSlotMinutes} onChange={next => set("defaultSlotMinutes", Math.round(next))} />
        </Field>
        <Field label="Booking window (days)" htmlFor={`${id}-window`} hint="How far ahead appointments can be booked.">
          <NumberInput id={`${id}-window`} min={1} max={730} value={value.bookingWindowDays} onChange={next => set("bookingWindowDays", Math.round(next))} />
        </Field>
      </div>
      <ChoiceGroup legend="Appointment types" options={APPOINTMENT_TYPES} selected={value.appointmentTypes} onChange={next => set("appointmentTypes", next)} />
      <Toggle
        label="Allow overbooking"
        description="A practitioner can have overlapping appointments."
        checked={value.allowOverbooking}
        onChange={next => set("allowOverbooking", next)}
      />
    </div>
  );
}

function MessagingEditor({ value, onChange }: EditorProps<"messaging">) {
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <Toggle
        label="Allow group chats"
        description="Who may start groups is the “Create group chats” permission in Roles & access."
        checked={value.allowGroups}
        onChange={next => set("allowGroups", next)}
      />
    </div>
  );
}

function ExpensesEditor({ value, onChange }: EditorProps<"expenses">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Categories" htmlFor={`${id}-categories`} hint="Comma-separated, e.g. Travel, Meals, Software.">
        <ListInput id={`${id}-categories`} value={value.categories} onChange={next => set("categories", next)} />
      </Field>
      <Field label="Limit per claim" htmlFor={`${id}-max`} hint="Leave empty for no limit." className="sm:w-48">
        <NumberInput id={`${id}-max`} min={1} step={0.01} allowEmpty placeholder="No limit" value={value.maxAmount} onChange={next => set("maxAmount", next)} />
      </Field>
    </div>
  );
}

const CELEBRATION_MODES: readonly { value: CelebrationMode; label: string }[] = [
  { value: "everyone", label: "Greet the person and tell colleagues" },
  { value: "self", label: "Greet only the person" },
  { value: "off", label: "Off" },
];

function CelebrationsEditor({ value, onChange }: EditorProps<"celebrations">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Birthdays" htmlFor={`${id}-birthdays`} hint="People can hide their birthday from colleagues in their profile.">
        <select id={`${id}-birthdays`} value={value.birthdays} onChange={event => set("birthdays", event.target.value as CelebrationMode)} className={inputClass}>
          {CELEBRATION_MODES.map(mode => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Work anniversaries" htmlFor={`${id}-anniversaries`} hint="Uses each person's joining date.">
        <select id={`${id}-anniversaries`} value={value.anniversaries} onChange={event => set("anniversaries", event.target.value as CelebrationMode)} className={inputClass}>
          {CELEBRATION_MODES.map(mode => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function BrandingEditor({ value, onChange, workspaceName, workspace, errors = {} }: EditorProps<"branding">) {
  const id = useId();
  const set = setterFor(value, onChange);
  // The server's errors for a field stay until that field changes (the panel clears them on edit).
  const assetErrors = { ...validateBrandAssets(value), ...(errors.logoUrl ? { logoUrl: errors.logoUrl } : {}), ...(errors.backgroundImage ? { backgroundImage: errors.backgroundImage } : {}) };
  const loginErrors = { loginHeadline: errors.loginHeadline, loginMessage: errors.loginMessage, loginHighlights: errors.loginHighlights, supportContact: errors.supportContact };
  const title = value.siteTitle.trim() || workspaceName;
  // Mirrors the sidebar: the tagline, or the workspace name when the title differs from it.
  const subtitle = value.tagline.trim() || (title !== workspaceName ? workspaceName : "");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website title" htmlFor={`${id}-title`} error={errors.siteTitle} hint="Shown in the browser tab and sidebar. Empty = the workspace name.">
          <TextInput id={`${id}-title`} maxLength={60} placeholder={workspaceName} value={value.siteTitle} onChange={next => set("siteTitle", next)} />
        </Field>
        <Field label="Tagline" htmlFor={`${id}-tagline`} error={errors.tagline} hint="Shown under the title in the sidebar.">
          <TextInput id={`${id}-tagline`} maxLength={120} value={value.tagline} onChange={next => set("tagline", next)} />
        </Field>
      </div>
      <figure className="flex flex-col gap-1.5">
        <figcaption className="text-xs font-medium text-muted-foreground">Sidebar preview</figcaption>
        <div className="w-64 max-w-full rounded-lg border bg-card px-4 py-3" aria-live="polite">
          <Logo title={title} icon={value.logoIcon} imageUrl={value.logoUrl} />
          {subtitle && <p className="mt-1.5 truncate pl-0.5 text-xs font-medium text-muted-foreground">{subtitle}</p>}
        </div>
      </figure>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Brand colour</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SWATCHES) as Accent[]).map(name => (
            <label key={name} className="cursor-pointer" title={name}>
              <input type="radio" name={`${id}-accent`} checked={value.accent === name} onChange={() => set("accent", name)} className="peer sr-only" />
              <span
                className={cn(
                  "block h-8 w-8 rounded-full ring-offset-2 ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                  SWATCHES[name],
                  value.accent === name && "ring-2 ring-foreground"
                )}
              />
              <span className="sr-only">{name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Toggle
        label="Use the brand colour for everyone"
        description="People can't pick their own accent colour while this is on."
        checked={value.lockAccent}
        onChange={next => set("lockAccent", next)}
      />
      <BrandAssetsFields value={value} onChange={changes => onChange({ ...value, ...changes })} accent={value.accent} title={title} errors={assetErrors} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Default style</legend>
        <p className="mb-2 text-xs text-muted-foreground">The look everyone gets unless they pick their own in Settings → Appearance.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLES.map(name => (
            <label
              key={name}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-1.5 text-xs font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring",
                (value.style ?? "classic") === name ? "border-primary bg-accent/60 text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <input type="radio" name={`${id}-style`} checked={(value.style ?? "classic") === name} onChange={() => set("style", name)} className="sr-only" />
              <StylePreview style={name} className="h-16" />
              {STYLE_META[name].label}
            </label>
          ))}
        </div>
      </fieldset>
      <Toggle
        label="Use the default style for everyone"
        description="People can't pick their own style while this is on."
        checked={Boolean(value.lockStyle)}
        onChange={next => set("lockStyle", next)}
      />
      {workspace && (
        <LoginBrandingFields
          value={value}
          onChange={onChange}
          slug={workspace.slug}
          workspaceName={workspaceName}
          companyName={workspace.companyName}
          features={workspace.features}
          errors={loginErrors}
        />
      )}
      {workspace && (
        <CustomCssFields
          value={value}
          onChange={onChange}
          slug={workspace.slug}
          workspaceName={workspaceName}
          companyName={workspace.companyName}
          features={workspace.features}
          errors={{ login: errors["customCss.login"], app: errors["customCss.app"] }}
        />
      )}
      <section aria-labelledby={`${id}-look`} className="flex min-w-0 flex-col gap-3 border-t pt-5">
        <div>
          <h3 id={`${id}-look`} className="text-sm font-semibold">
            Look and feel
          </h3>
          <p className="text-xs text-muted-foreground">Corners, shadows, cards, buttons, type, spacing, and animation for everyone in the workspace.</p>
        </div>
        <UiCustomizationFields value={resolveUi(value.ui)} onChange={ui => onChange({ ...value, ui })} workspaceName={title} />
      </section>
    </div>
  );
}

function CompanyEditor({ value, onChange, workspaceName }: EditorProps<"company">) {
  const id = useId();
  const set = setterFor(value, onChange);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">These details print on invoices and prescriptions.</p>
      <Field label="Legal name" htmlFor={`${id}-legal`} hint="Empty = the workspace name.">
        <TextInput id={`${id}-legal`} maxLength={160} placeholder={workspaceName} autoComplete="organization" value={value.legalName} onChange={next => set("legalName", next)} />
      </Field>
      <Field label="Address" htmlFor={`${id}-address`}>
        <textarea id={`${id}-address`} rows={3} maxLength={500} autoComplete="street-address" value={value.address} onChange={event => set("address", event.target.value)} className={textAreaClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tax ID" htmlFor={`${id}-tax`} hint="e.g. GSTIN or VAT number.">
          <TextInput id={`${id}-tax`} maxLength={40} value={value.taxId} onChange={next => set("taxId", next)} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <TextInput id={`${id}-email`} type="email" maxLength={255} autoComplete="email" value={value.email} onChange={next => set("email", next)} />
        </Field>
        <Field label="Phone" htmlFor={`${id}-phone`}>
          <TextInput id={`${id}-phone`} type="tel" maxLength={40} autoComplete="tel" value={value.phone} onChange={next => set("phone", next)} />
        </Field>
        <Field label="Website" htmlFor={`${id}-website`}>
          <TextInput id={`${id}-website`} type="url" maxLength={200} placeholder="https://" autoComplete="url" value={value.website} onChange={next => set("website", next)} />
        </Field>
      </div>
      <Field label="Currency" htmlFor={`${id}-currency`} hint="3-letter code. All amounts in the workspace use it." className="sm:w-48">
        <CurrencyInput id={`${id}-currency`} value={value.currency} onChange={next => set("currency", next)} />
      </Field>
    </div>
  );
}

const EDITORS: { [K in SettingsKey]?: ComponentType<EditorProps<K>> } = {
  helpdesk: HelpdeskEditor,
  attendance: AttendanceEditor,
  inventory: InventoryEditor,
  billing: BillingEditor,
  logistics: LogisticsEditor,
  clinic: ClinicEditor,
  messaging: MessagingEditor,
  expenses: ExpensesEditor,
  celebrations: CelebrationsEditor,
  branding: BrandingEditor,
  company: CompanyEditor,
  help: ({ value, onChange, workspace }) => <HelpSettingsEditor value={value} onChange={onChange} features={workspace?.features} />,
};

export interface ModuleSettingsEditorProps<K extends SettingsKey> {
  module: K;
  /** The module's complete settings object */
  value: WorkspaceSettings[K];
  onChange: (value: WorkspaceSettings[K]) => void;
  /** Default shown for empty titles (branding, company); falls back to "TaskFlow" */
  workspaceName?: string;
  /** Branding: shows the sign-in page section for this workspace */
  workspace?: WorkspaceContext;
  /** Server field errors for this module ("logoUrl", "customCss.app", …), shown next to the fields */
  errors?: ModuleFieldErrors;
}

/** Presentational: the settings form for one module. */
export function ModuleSettingsEditor<K extends SettingsKey>({ module, value, onChange, workspaceName = "TaskFlow", workspace, errors }: ModuleSettingsEditorProps<K>) {
  const Editor = EDITORS[module] as ComponentType<EditorProps<K>> | undefined;
  if (!Editor) return <p className="text-sm text-muted-foreground">This module has no settings.</p>;
  return <Editor value={value} onChange={onChange} workspaceName={workspaceName} workspace={workspace} errors={errors} />;
}
