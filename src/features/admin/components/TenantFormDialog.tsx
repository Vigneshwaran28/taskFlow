"use client";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { TemporaryPasswordField } from "@/components/shared/TemporaryPasswordField";
import { MODULES, MODULE_KEYS } from "@/app-shell/modules";
import { LoginBrandingFields, LoginTemplateView, WorkspaceLoginLink, loginPreviewWorkspace, workspaceLoginPath } from "@/features/auth";
import { CONFIGURABLE_MODULES, ModuleSettingsEditor, resolveUi, UiCustomizationFields, type ConfigurableModule, type UiSettings } from "@/features/workspace";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import type { FeatureKey, WorkspaceSettings } from "@/types/session";
import { useCreateTenant, useUpdateTenant } from "../hooks/useAdmin";
import type { IndustryKey, ModuleCatalog, SettingsPatch, Tenant } from "../services/adminService";
import { industryMeta, neededBy, outsideIndustry, withRequirements } from "../utils/moduleRules";
import { SLUG_MAX, slugError, slugFromName } from "../utils/tenantSlug";
import {
  cleanBranding,
  cleanCompany,
  DEFAULT_BRANDING,
  DEFAULT_COMPANY,
  TenantBrandingFields,
  TenantCompanyFields,
  validateBranding,
  validateCompany,
  type BrandingErrors,
  type BrandingSettings,
  type CompanyErrors,
  type CompanySettings,
} from "./TenantBrandingFields";
import {
  SUBSCRIPTION_FIELDS,
  subscriptionPayload,
  subscriptionValues,
  TenantSubscriptionFields,
  validateSubscription,
  type SubscriptionErrors,
  type SubscriptionValues,
} from "./TenantSubscriptionFields";
import { TenantModulesField } from "./TenantModulesField";
import { defaultConfig, validateDatabaseConfig } from "./DatabaseConfigFields";
import { TenantDatabaseField, type DatabaseFormValue } from "./TenantDatabaseField";

const moduleLabel = (key: FeatureKey) => MODULES[key]?.label ?? key;
const isConfigurable = (key: string): key is ConfigurableModule => (CONFIGURABLE_MODULES as readonly string[]).includes(key);
const EMAIL = /^\S+@\S+\.\S+$/;

type FieldName = "name" | "slug" | "contactEmail" | "maxUsers" | "features" | "ownerName" | "ownerEmail" | "ownerPassword";
type ClientErrors = Partial<Record<FieldName, string>>;

const TABS = [
  { id: "details", label: "Details", short: "" },
  { id: "subscription", label: "Subscription", short: "Plan" },
  { id: "modules", label: "Modules", short: "" },
  { id: "database", label: "Database", short: "DB" },
  { id: "branding", label: "Branding & sign-in", short: "Branding" },
  { id: "look", label: "Look & feel", short: "Look" },
  { id: "company", label: "Company", short: "" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Which tab shows each field (server field errors included). */
const TAB_OF: Record<string, TabId> = {
  name: "details",
  slug: "details",
  contactEmail: "details",
  maxUsers: "details",
  ownerName: "details",
  ownerEmail: "details",
  ownerPassword: "details",
  owner: "details",
  email: "details",
  features: "modules",
  industry: "modules",
  plan: "subscription",
  subscriptionStartsOn: "subscription",
  subscriptionEndsOn: "subscription",
  graceDays: "subscription",
  database: "database",
};

/** The tab of a field error key (database.host and the like go to the database tab). */
const tabOf = (key: string): TabId | undefined => (key.startsWith("database") ? "database" : TAB_OF[key]);

export interface TenantFormDialogProps {
  /** null creates a new tenant */
  tenant?: Tenant | null;
  /** Every licensable module key, in the server's order */
  features: FeatureKey[];
  /** Module dependencies and industries (null from an older server: no rules applied) */
  catalog?: ModuleCatalog | null;
  defaultSettings: WorkspaceSettings;
  onClose: () => void;
  /** After creating: open the new tenant in the console */
  onOpenTenant?: (tenantId: number) => void;
}

/**
 * Feature component: create a tenant with its owner account, or edit a tenant's plan, branding, sign-in page, company
 * details, and module settings. Four tabs keep it short; the sign-in tab shows a live preview beside the fields.
 * Mount with a `key` to reset.
 */
export function TenantFormDialog({ tenant = null, features: available, catalog = null, defaultSettings, onClose, onOpenTenant }: TenantFormDialogProps) {
  const toast = useToast();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const mutation = tenant ? updateTenant : createTenant;
  const moduleKeys = available.length ? available : MODULE_KEYS;

  const [tab, setTab] = useState<TabId>("details");
  const [industry, setIndustry] = useState<IndustryKey>(tenant?.industry ?? catalog?.defaultIndustry ?? "custom");
  /** What the modules tab changed by itself last (dependencies ticked, a starting set applied) */
  const [moduleNotice, setModuleNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: number; name: string; slug: string; ownerEmail: string } | null>(null);
  const [values, setValues] = useState({
    name: tenant?.name ?? "",
    slug: tenant?.slug ?? "",
    contactEmail: tenant?.contactEmail ?? "",
    maxUsers: tenant?.maxUsers ? String(tenant.maxUsers) : "",
    features: new Set<FeatureKey>(tenant?.features ?? industryMeta(catalog, catalog?.defaultIndustry)?.recommended ?? ["helpdesk", "directory", "tasks"]),
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  // Every module's settings, starting from the tenant's (edit) or the defaults (new).
  const [settings, setSettings] = useState<Partial<WorkspaceSettings>>(() => tenant?.settings ?? defaultSettings ?? {});
  const [branding, setBranding] = useState<BrandingSettings>(() => ({ ...DEFAULT_BRANDING, ...defaultSettings?.branding, ...tenant?.settings?.branding }));
  const [company, setCompany] = useState<CompanySettings>(() => ({ ...DEFAULT_COMPANY, ...defaultSettings?.company, ...tenant?.settings?.company }));
  const [brandingErrors, setBrandingErrors] = useState<BrandingErrors>({});
  const [ui, setUi] = useState<UiSettings>(() => resolveUi(tenant?.settings?.branding?.ui ?? defaultSettings?.branding?.ui));
  const [companyErrors, setCompanyErrors] = useState<CompanyErrors>({});
  const [subscription, setSubscription] = useState<SubscriptionValues>(() => subscriptionValues(tenant?.subscription));
  const [subscriptionErrors, setSubscriptionErrors] = useState<SubscriptionErrors>({});
  const [configuring, setConfiguring] = useState<ConfigurableModule | null>(null);
  const [database, setDatabase] = useState<DatabaseFormValue>(() => ({ mode: "platform", config: defaultConfig("sqlite", tenant?.slug ?? "tenant"), createDatabase: true, changed: false }));
  const [databaseErrors, setDatabaseErrors] = useState<Record<string, string>>({});

  const serverErrors = fieldErrorsOf(mutation.error);
  // The address is checked while typing; everything else on submit (and cleared as the field changes).
  const liveSlugError = tenant ? undefined : slugError(values.slug);
  const errors: Record<string, string | undefined> = { ...serverErrors, ...clientErrors, slug: clientErrors.slug ?? liveSlugError ?? serverErrors.slug };
  const ownerError = (field: "ownerName" | "ownerEmail" | "ownerPassword") =>
    errors[field] ?? (field === "ownerEmail" ? serverErrors.email : undefined) ?? (field === "ownerName" && !serverErrors.ownerEmail && !serverErrors.ownerPassword ? serverErrors.owner : undefined);

  const enabled = moduleKeys.filter(key => values.features.has(key));
  const slug = tenant?.slug ?? (values.slug.trim().toLowerCase() || slugFromName(values.name));

  const tabErrors: Record<TabId, boolean> = {
    details: Object.entries(errors).some(([key, message]) => message && TAB_OF[key] === "details"),
    database: Object.keys(databaseErrors).length > 0 || Object.keys(serverErrors).some(key => key.startsWith("database")),
    modules: Boolean(errors.features || errors.industry),
    branding: Object.keys(brandingErrors).length > 0,
    look: Object.keys(serverErrors).some(key => key.startsWith("branding.ui")),
    company: Object.keys(companyErrors).length > 0,
    subscription: Object.keys(subscriptionErrors).length > 0 || SUBSCRIPTION_FIELDS.some(key => Boolean(serverErrors[key])),
  };

  function set(name: Exclude<FieldName, "features">, value: string) {
    setValues(current => ({ ...current, [name]: value }));
    setClientErrors(current => ({ ...current, [name]: undefined }));
    if (mutation.error) mutation.reset();
  }

  /** Ticking a module ticks what it requires too; a module others need can't be unticked (its checkbox is locked). */
  function toggleFeature(key: FeatureKey) {
    const current = values.features;
    let next: Set<FeatureKey>;
    let notice: string | null = null;
    if (current.has(key)) {
      if (neededBy(catalog, key, current).length) return;
      next = new Set(current);
      next.delete(key);
    } else {
      const result = withRequirements(catalog, [...current, key]);
      next = result.features;
      if (result.added.length) {
        notice = `${moduleLabel(key)} needs ${result.added.map(moduleLabel).join(", ")}, so ${result.added.length === 1 ? "it was" : "they were"} turned on too.`;
      }
    }
    setValues(state => ({ ...state, features: next }));
    setModuleNotice(notice);
    setClientErrors(state => ({ ...state, features: undefined }));
    if (mutation.error) mutation.reset();
  }

  /** New tenants start from the industry's recommended modules; existing tenants keep theirs (nothing is dropped silently). */
  function changeIndustry(next: IndustryKey) {
    setIndustry(next);
    const meta = industryMeta(catalog, next);
    if (!tenant && meta) {
      setValues(state => ({ ...state, features: withRequirements(catalog, meta.recommended).features }));
      setModuleNotice(`Started with the modules ${meta.label} usually needs. Change them below.`);
    } else {
      setModuleNotice(null);
    }
    setClientErrors(state => ({ ...state, features: undefined }));
    if (mutation.error) mutation.reset();
  }

  function removeModules(keys: FeatureKey[]) {
    setValues(state => {
      const next = new Set(state.features);
      keys.forEach(key => next.delete(key));
      return { ...state, features: next };
    });
    if (configuring && keys.includes(configuring)) setConfiguring(null);
    setModuleNotice(`Removed ${keys.map(moduleLabel).join(", ")}. Save to apply.`);
    setClientErrors(state => ({ ...state, features: undefined }));
    if (mutation.error) mutation.reset();
  }

  function updateModule<K extends ConfigurableModule>(key: K, next: WorkspaceSettings[K]) {
    setSettings(current => ({ ...current, [key]: next }));
    if (mutation.error) mutation.reset();
  }

  function handleBrandingChange(next: BrandingSettings) {
    setBranding(next);
    setBrandingErrors({});
    if (mutation.error) mutation.reset();
  }

  function handleSubscriptionChange(next: SubscriptionValues) {
    setSubscription(next);
    setSubscriptionErrors({});
    if (mutation.error) mutation.reset();
  }

  function handleCompanyChange(next: CompanySettings) {
    setCompany(next);
    setCompanyErrors({});
    if (mutation.error) mutation.reset();
  }

  /** After a 422, show the first tab that has a highlighted field. */
  function showErrorsFrom(fieldErrors: Record<string, string | undefined>) {
    const first = TABS.find(item => Object.entries(fieldErrors).some(([key, message]) => message && (tabOf(key) ?? "branding") === item.id));
    if (first) setTab(first.id);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: ClientErrors = {};
    if (!values.name.trim()) next.name = "Company name is required.";
    if (liveSlugError) next.slug = liveSlugError;
    if (values.contactEmail.trim() && !EMAIL.test(values.contactEmail.trim())) next.contactEmail = "Enter a valid email address.";
    if (values.maxUsers && (!Number.isInteger(Number(values.maxUsers)) || Number(values.maxUsers) < 1 || Number(values.maxUsers) > 100_000)) {
      next.maxUsers = "Use a whole number from 1 to 100000, or leave it empty.";
    }
    if (!values.features.size) next.features = "Enable at least one module.";
    else {
      const meta = industryMeta(catalog, industry);
      const outside = outsideIndustry(meta, values.features);
      if (outside.length) {
        next.features = `${outside.map(moduleLabel).join(", ")} ${outside.length === 1 ? "isn't" : "aren't"} part of ${meta?.label}. Remove ${outside.length === 1 ? "it" : "them"} or choose another industry.`;
      }
    }
    if (!tenant) {
      if (!values.ownerName.trim()) next.ownerName = "Owner name is required.";
      if (!EMAIL.test(values.ownerEmail.trim())) next.ownerEmail = values.ownerEmail.trim() ? "Enter a valid email address." : "Owner email is required.";
      if (values.ownerPassword.length < 8) next.ownerPassword = "Use at least 8 characters.";
      else if (values.ownerPassword.length > 128) next.ownerPassword = "Use at most 128 characters.";
    }
    const sendDatabase = tenant ? database.changed : database.mode === "dedicated";
    const nextDatabase = sendDatabase ? validateDatabaseConfig(database.config) : {};
    setDatabaseErrors(nextDatabase);
    const nextBranding = validateBranding(branding);
    const nextCompany = validateCompany(company);
    const nextSubscription = validateSubscription(subscription);
    setSubscriptionErrors(nextSubscription);
    setClientErrors(next);
    setBrandingErrors(nextBranding);
    setCompanyErrors(nextCompany);
    if (Object.keys(next).length) return showErrorsFrom(next);
    if (Object.keys(nextDatabase).length) return setTab("database");
    if (Object.keys(nextBranding).length) return setTab("branding");
    if (Object.keys(nextCompany).length) return setTab("company");
    if (Object.keys(nextSubscription).length) return setTab("subscription");

    const settingsPatch: SettingsPatch = { branding: { ...cleanBranding(branding), ui }, company: cleanCompany(company) };
    for (const key of enabled) {
      if (isConfigurable(key) && settings[key]) Object.assign(settingsPatch, { [key]: settings[key] });
    }
    const plan = {
      name: values.name.trim(),
      ...(catalog ? { industry } : {}),
      features: enabled,
      settings: settingsPatch,
      maxUsers: values.maxUsers ? Number(values.maxUsers) : null,
      contactEmail: values.contactEmail.trim() || null,
      ...subscriptionPayload(subscription),
    };
    const onError = (error: unknown) => showErrorsFrom(fieldErrorsOf(error));
    if (tenant) {
      updateTenant.mutate(
        { id: tenant.id, changes: { ...plan, ...(database.changed ? { database: { config: database.config } } : {}) } },
        {
          onSuccess: saved => {
            toast.success(`${saved.name} updated`, `Changes apply on the users' next page load. Sign-in page: ${workspaceLoginPath(saved.slug)}`);
            onClose();
          },
          onError,
        }
      );
    } else {
      createTenant.mutate(
        {
          ...plan,
          slug: values.slug.trim().toLowerCase() || undefined,
          owner: { name: values.ownerName.trim(), email: values.ownerEmail.trim(), password: values.ownerPassword },
          database: database.mode === "dedicated" ? { mode: "dedicated", config: database.config, createDatabase: database.createDatabase } : { mode: "platform" },
        },
        {
          onSuccess: result => {
            setCreated({ id: result.id, name: result.name, slug: result.slug, ownerEmail: values.ownerEmail.trim() });
            toast.success(`${result.name} created`, `${values.ownerEmail.trim()} can sign in now and add their team.`);
          },
          onError,
        }
      );
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = TABS.findIndex(item => item.id === tab);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(`tenant-form-tab-${next.id}`)?.focus();
  }

  if (created) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={`${created.name} is ready`}
        description="Share the sign-in link with the owner."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
            {onOpenTenant && (
              <Button
                onClick={() => {
                  onOpenTenant(created.id);
                  onClose();
                }}
              >
                Open tenant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              {created.ownerEmail} can sign in with the temporary password and is asked to choose their own. Their workspace address is{" "}
              <span className="font-mono">/{created.slug}</span>.
            </span>
          </p>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 pl-3">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Sign-in</span>
            <WorkspaceLoginLink slug={created.slug} name={created.name} className="min-w-0 flex-1" />
          </div>
        </div>
      </Dialog>
    );
  }

  const configuringMeta = configuring ? MODULES[configuring] : null;
  const configuringValue = configuring && values.features.has(configuring) ? settings[configuring] : undefined;
  const previewWorkspace = loginPreviewWorkspace({ branding, slug, name: values.name, companyName: company.legalName || values.name, features: enabled });

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={tenant ? `Edit ${tenant.name}` : "New tenant"}
      description={tenant ? "Change the plan, branding, sign-in page, and company details." : "Create a customer workspace and the admin account that runs it."}
      headContent={
        <div role="tablist" aria-label="Tenant settings" onKeyDown={handleTabKey} className="-mb-px flex gap-x-1 overflow-x-auto no-scrollbar sm:flex-wrap pt-1">
          {TABS.map(item => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tenant-form-tab-${item.id}`}
                aria-selected={active}
                aria-controls="tenant-form-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2.5 text-sm sm:px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.short ? (
                  <>
                    <span className="sm:hidden">{item.short}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
                {tabErrors[item.id] && (
                  <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="sr-only">(has errors)</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="tenant-form" loading={mutation.isPending}>
            {tenant ? "Save changes" : "Create tenant"}
          </Button>
        </>
      }
    >
      <form id="tenant-form" onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-5">
        <FormAlert message={formErrorOf(mutation.error)} />
        {errors.settings && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Settings: {errors.settings}
          </p>
        )}

        <div id="tenant-form-panel" role="tabpanel" aria-labelledby={`tenant-form-tab-${tab}`} className="min-w-0">
          {tab === "details" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Company name" id="tenant-name" required autoFocus maxLength={120} value={values.name} error={errors.name} onChange={event => set("name", event.target.value)} />
                {tenant ? (
                  <TextField label="Address" id="tenant-slug" value={values.slug} disabled hint={`Set when the tenant was created: ${workspaceLoginPath(tenant.slug)}`} />
                ) : (
                  <TextField
                    label="Address (optional)"
                    id="tenant-slug"
                    maxLength={SLUG_MAX}
                    placeholder={values.name.trim() ? slugFromName(values.name) : "e.g. acme"}
                    hint={`Sign-in page: /${slug}/login. Lowercase letters, numbers, and dashes; made from the name if empty.`}
                    autoCapitalize="none"
                    spellCheck={false}
                    value={values.slug}
                    error={errors.slug}
                    onChange={event => set("slug", event.target.value.toLowerCase())}
                  />
                )}
                <TextField
                  label="Billing / contact email"
                  id="tenant-contact"
                  type="email"
                  maxLength={255}
                  value={values.contactEmail}
                  error={errors.contactEmail}
                  onChange={event => set("contactEmail", event.target.value)}
                />
                <TextField
                  label="User limit"
                  id="tenant-max-users"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100000"
                  step="1"
                  placeholder="No limit"
                  hint="Active users allowed. Leave empty for no limit."
                  value={values.maxUsers}
                  error={errors.maxUsers}
                  onChange={event => set("maxUsers", event.target.value)}
                />
              </div>

              {!tenant && (
                <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
                  <legend className="px-1 text-sm font-medium">Owner account (the tenant&apos;s first admin)</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label="Full name" id="tenant-owner-name" required maxLength={120} value={values.ownerName} error={ownerError("ownerName")} onChange={event => set("ownerName", event.target.value)} />
                    <TextField
                      label="Email"
                      id="tenant-owner-email"
                      required
                      type="email"
                      autoComplete="off"
                      value={values.ownerEmail}
                      error={ownerError("ownerEmail")}
                      onChange={event => set("ownerEmail", event.target.value)}
                    />
                  </div>
                  <TemporaryPasswordField
                    label="Temporary password"
                    id="tenant-owner-password"
                    required
                    maxLength={128}
                    hint="At least 8 characters. Share it with the owner; they choose their own at first sign-in."
                    value={values.ownerPassword}
                    error={ownerError("ownerPassword")}
                    onChange={val => set("ownerPassword", val)}
                  />
                </fieldset>
              )}
            </div>
          )}

          {tab === "modules" && (
            <div className="flex min-w-0 flex-col gap-3">
              <TenantModulesField
                catalog={catalog}
                moduleKeys={moduleKeys}
                industry={industry}
                onIndustryChange={changeIndustry}
                features={values.features}
                onToggle={key => {
                  toggleFeature(key);
                  if (configuring === key) setConfiguring(null);
                }}
                onRemoveOutside={removeModules}
                notice={moduleNotice}
                isNew={!tenant}
                featuresError={errors.features}
                industryError={errors.industry}
                renderExtra={key => {
                  if (!isConfigurable(key) || !settings[key]) return null;
                  const open = configuring === key;
                  return (
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls="tenant-module-settings"
                      onClick={() => setConfiguring(open ? null : key)}
                      className="ml-7 self-start text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {open ? "Hide settings" : "Configure"}
                    </button>
                  );
                }}
              />
              {configuring && configuringMeta && configuringValue && (
                <section id="tenant-module-settings" aria-label={`${configuringMeta.label} settings`} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{configuringMeta.label} settings</h3>
                    <button type="button" onClick={() => setConfiguring(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                      Done
                    </button>
                  </div>
                  <ModuleSettingsEditor key={configuring} module={configuring} value={configuringValue} workspaceName={values.name.trim() || undefined} onChange={next => updateModule(configuring, next)} />
                </section>
              )}
            </div>
          )}

          {tab === "branding" && (
            <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
              <aside aria-label="Live preview" className="flex min-w-0 flex-col gap-2 md:sticky md:top-16 md:order-last md:self-start">
                <p className="text-xs font-medium text-muted-foreground">Live preview</p>
                <LoginTemplateView preview workspace={previewWorkspace} className="shadow-sm" />
                <p className="break-all font-mono text-xs text-muted-foreground" title="Sign-in page">
                  {workspaceLoginPath(slug || "your-address")}
                  {!tenant && <span className="font-sans"> (final after create)</span>}
                </p>
              </aside>
              <div className="flex min-w-0 flex-col gap-5">
                <TenantBrandingFields value={branding} onChange={handleBrandingChange} workspaceName={values.name} errors={brandingErrors} slug={slug} features={enabled} />
                <LoginBrandingFields
                  value={branding}
                  onChange={handleBrandingChange}
                  slug={slug}
                  slugPending={!tenant}
                  workspaceName={values.name}
                  companyName={company.legalName || values.name}
                  features={enabled}
                  errors={brandingErrors}
                  showPreview={false}
                />
              </div>
            </div>
          )}

          {tab === "database" && (
            <TenantDatabaseField
              value={database}
              onChange={next => {
                setDatabase(next);
                setDatabaseErrors({});
                if (mutation.error) mutation.reset();
              }}
              features={enabled}
              tenantId={tenant?.id ?? null}
              slug={slug || "tenant"}
              errors={{ ...Object.fromEntries(Object.entries(serverErrors).filter(([key]) => key.startsWith("database"))), ...databaseErrors }}
            />
          )}

          {tab === "look" && (
            <UiCustomizationFields
              value={ui}
              onChange={next => {
                setUi(next);
                if (mutation.error) mutation.reset();
              }}
              workspaceName={branding.siteTitle || values.name}
            />
          )}

          {tab === "subscription" && (
            <TenantSubscriptionFields
              value={subscription}
              onChange={handleSubscriptionChange}
              errors={{ ...Object.fromEntries(SUBSCRIPTION_FIELDS.map(key => [key, serverErrors[key]])), ...subscriptionErrors }}
            />
          )}

          {tab === "company" && <TenantCompanyFields value={company} onChange={handleCompanyChange} workspaceName={values.name} errors={companyErrors} />}
        </div>
        <p className="text-xs text-muted-foreground">All tabs are saved together.</p>
      </form>
    </Dialog>
  );
}
