"use client";
// Tenant dialog sections for the workspace-wide settings the provider sets up: branding (title, colour, default style,
// logo, background picture, custom CSS, and whether people may add their own CSS) and company details.
import { useId } from "react";
import { Check, Lock } from "lucide-react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { cleanLoginBranding, hasLoginBrandingErrors, validateLoginBranding, type LoginBrandingErrors } from "@/features/auth";
import { BrandAssetsFields, CustomCssFields, customCssErrors, validateBrandAssets, type BrandAssetsErrors } from "@/features/workspace";
import { LogoGlyph } from "@/components/shared/logoIcons";
import { STYLE_META, StylePreview } from "@/components/shared/StylePreview";
import { ACCENTS, ACCENT_META, isSafeImageUrl, STYLES, type Accent } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import type { FeatureKey, WorkspaceSettings } from "@/types/session";

export type BrandingSettings = WorkspaceSettings["branding"];
export type CompanySettings = WorkspaceSettings["company"];

/** New tenants start with the split sign-in page on the indigo background. */
export const DEFAULT_BRANDING: BrandingSettings = {
  siteTitle: "",
  tagline: "",
  accent: "indigo",
  lockAccent: false,
  loginTemplate: "split",
  loginBackground: "indigo",
  loginHeadline: "",
  loginMessage: "",
  loginHighlights: [],
  supportContact: "",
  logoIcon: "check",
  logoUrl: "",
  backgroundImage: "",
  backgroundDim: 40,
  style: "classic",
  lockStyle: false,
  customCssEnabled: false,
  customCss: { login: "", app: "" },
  allowUserCss: true,
};
export const DEFAULT_COMPANY: CompanySettings = { legalName: "", address: "", taxId: "", email: "", phone: "", website: "", currency: "INR" };

export const SITE_TITLE_MAX = 60;
export const TAGLINE_MAX = 120;

/** Swatch class per accent (useTheme.tsx ACCENT_META). */
const SWATCHES = Object.fromEntries(ACCENTS.map(name => [name, ACCENT_META[name].swatch])) as Record<Accent, string>;

const ACCENT_LABELS = Object.fromEntries(ACCENTS.map(name => [name, ACCENT_META[name].label])) as Record<Accent, string>;

export type BrandingErrors = Partial<Record<"siteTitle" | "tagline" | "customCssLogin" | "customCssApp", string>> & LoginBrandingErrors & BrandAssetsErrors;
export type CompanyErrors = Partial<Record<"email" | "currency", string>>;

/**
 * Title and tagline, the sign-in page fields, image links, and custom CSS (same rules as the server). Stored CSS that
 * newer rules refuse shows under its own block instead of failing the whole save.
 */
export function validateBranding(value: BrandingSettings): BrandingErrors {
  const login = validateLoginBranding(value);
  const errors: BrandingErrors = { ...(hasLoginBrandingErrors(login) ? login : {}), ...validateBrandAssets(value) };
  const css = customCssErrors(value);
  if (css.login) errors.customCssLogin = css.login;
  if (css.app) errors.customCssApp = css.app;
  if (value.siteTitle.trim().length > SITE_TITLE_MAX) errors.siteTitle = `Keep the title under ${SITE_TITLE_MAX} characters.`;
  if (value.tagline.trim().length > TAGLINE_MAX) errors.tagline = `Keep the tagline under ${TAGLINE_MAX} characters.`;
  return errors;
}

export function validateCompany(value: CompanySettings): CompanyErrors {
  const errors: CompanyErrors = {};
  if (value.email.trim() && !/^\S+@\S+\.\S+$/.test(value.email.trim())) errors.email = "Enter a valid email.";
  if (!/^[A-Za-z]{3}$/.test(value.currency.trim())) errors.currency = "Use a 3-letter currency code like INR or USD.";
  return errors;
}

/** Trimmed values for the API (currency upper-cased). */
export const cleanBranding = (value: BrandingSettings): BrandingSettings =>
  cleanLoginBranding({ ...value, siteTitle: value.siteTitle.trim(), tagline: value.tagline.trim(), logoUrl: value.logoUrl?.trim() ?? "", backgroundImage: value.backgroundImage?.trim() ?? "" });
export const cleanCompany = (value: CompanySettings): CompanySettings => ({
  legalName: value.legalName.trim(),
  address: value.address.trim(),
  taxId: value.taxId.trim(),
  email: value.email.trim(),
  phone: value.phone.trim(),
  website: value.website.trim(),
  currency: value.currency.trim().toUpperCase(),
});

/** A small sidebar-style preview of how the title, tagline, and colour will look. */
function TitlePreview({ title, tagline, accent, icon, imageUrl }: { title: string; tagline: string; accent: Accent; icon?: string; imageUrl?: string }) {
  const image = isSafeImageUrl(imageUrl) ? imageUrl : null;
  return (
    <div aria-live="polite" className="flex min-w-0 flex-col gap-2 self-start rounded-lg border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- previewing the tenant's own image link
          <img src={image} alt="" className="h-3 w-3 shrink-0 rounded-sm object-contain" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true" className={cn("flex h-3 w-3 shrink-0 items-center justify-center rounded-sm text-white", SWATCHES[accent])}>
            <LogoGlyph name={icon} className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        <span className="truncate">{title}</span>
        <span className="sr-only">(browser tab)</span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", SWATCHES[accent])}>
          <LogoGlyph name={icon} className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold tracking-tight">{title}</span>
          {tagline && <span className="block truncate text-xs text-muted-foreground">{tagline}</span>}
        </span>
      </div>
    </div>
  );
}

export interface TenantBrandingFieldsProps {
  value: BrandingSettings;
  onChange: (value: BrandingSettings) => void;
  /** The tenant's name, shown when no title is set */
  workspaceName: string;
  errors: BrandingErrors;
  /** The tenant's address and modules, for the custom CSS hints and sign-in preview (optional) */
  slug?: string;
  features?: readonly FeatureKey[];
}

/**
 * "Branding" section: website title, tagline, brand colour, default style, logo (icon or image), background picture, and
 * custom CSS (the workspace's own and whether people may add theirs).
 */
export function TenantBrandingFields({ value, onChange, workspaceName, errors, slug, features }: TenantBrandingFieldsProps) {
  const id = useId();
  const set = <K extends keyof BrandingSettings>(key: K, next: BrandingSettings[K]) => onChange({ ...value, [key]: next });
  const fallback = workspaceName.trim() || "Workspace name";

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">Branding</legend>
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <TextField
            label="Website title"
            id={`${id}-title`}
            maxLength={SITE_TITLE_MAX}
            placeholder={fallback}
            hint={`Shown in the browser tab and sidebar instead of the workspace name. ${value.siteTitle.length}/${SITE_TITLE_MAX}`}
            value={value.siteTitle}
            error={errors.siteTitle ?? (value.siteTitle.trim().length > SITE_TITLE_MAX ? `Keep the title under ${SITE_TITLE_MAX} characters.` : undefined)}
            onChange={event => set("siteTitle", event.target.value)}
          />
          <TextField
            label="Tagline"
            id={`${id}-tagline`}
            maxLength={TAGLINE_MAX}
            hint={`${value.tagline.length}/${TAGLINE_MAX}`}
            value={value.tagline}
            error={errors.tagline}
            onChange={event => set("tagline", event.target.value)}
          />
        </div>
        <TitlePreview title={value.siteTitle.trim() || fallback} tagline={value.tagline.trim()} accent={value.accent} icon={value.logoIcon} imageUrl={value.logoUrl?.trim()} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Brand colour</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map(accent => {
            const selected = value.accent === accent;
            return (
              <label
                key={accent}
                title={ACCENT_LABELS[accent]}
                className={cn(
                  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  SWATCHES[accent],
                  selected && "ring-2 ring-foreground"
                )}
              >
                <input type="radio" name={`${id}-accent`} value={accent} checked={selected} onChange={() => set("accent", accent)} className="sr-only" />
                <span className="sr-only">{ACCENT_LABELS[accent]}</span>
                {selected && <Check className="h-4 w-4 text-white" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={value.lockAccent} onChange={event => set("lockAccent", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Lock colour for everyone
          </span>
          <span className="block text-xs text-muted-foreground">People can&apos;t pick their own accent colour.</span>
        </span>
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Default style</legend>
        <p className="mb-2 text-xs text-muted-foreground">The look everyone gets unless they pick their own in Settings → Appearance.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLES.map(name => {
            const selected = (value.style ?? "classic") === name;
            return (
              <label
                key={name}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg border p-1.5 text-xs font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  selected ? "border-primary bg-accent/60 text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <input type="radio" name={`${id}-style`} value={name} checked={selected} onChange={() => set("style", name)} className="sr-only" />
                <StylePreview style={name} className="h-14" />
                <span className="truncate">{STYLE_META[name].label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={Boolean(value.lockStyle)} onChange={event => set("lockStyle", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Lock style for everyone
          </span>
          <span className="block text-xs text-muted-foreground">People can&apos;t pick their own style.</span>
        </span>
      </label>

      <BrandAssetsFields value={value} onChange={changes => onChange({ ...value, ...changes })} accent={value.accent} title={value.siteTitle.trim() || fallback} errors={errors} />

      <CustomCssFields
        value={value}
        onChange={onChange}
        slug={slug}
        workspaceName={value.siteTitle.trim() || fallback}
        features={features}
        errors={{ login: errors.customCssLogin, app: errors.customCssApp }}
      />
    </fieldset>
  );
}

export interface TenantCompanyFieldsProps {
  value: CompanySettings;
  onChange: (value: CompanySettings) => void;
  workspaceName: string;
  errors: CompanyErrors;
}

/** "Company details" section: printed on invoices and prescriptions; currency applies to every amount. */
export function TenantCompanyFields({ value, onChange, workspaceName, errors }: TenantCompanyFieldsProps) {
  const id = useId();
  const set = <K extends keyof CompanySettings>(key: K, next: CompanySettings[K]) => onChange({ ...value, [key]: next });

  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">Company details</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Legal name"
          id={`${id}-legal`}
          maxLength={160}
          placeholder={workspaceName.trim() || "Workspace name"}
          hint="Printed on invoices. Empty uses the company name."
          value={value.legalName}
          onChange={event => set("legalName", event.target.value)}
        />
        <TextField label="Tax ID" id={`${id}-tax`} maxLength={40} placeholder="e.g. GSTIN or VAT number" value={value.taxId} onChange={event => set("taxId", event.target.value)} />
        <TextAreaField label="Address" id={`${id}-address`} className="sm:col-span-2" rows={2} maxLength={500} value={value.address} onChange={event => set("address", event.target.value)} />
        <TextField label="Email" id={`${id}-email`} type="email" maxLength={255} value={value.email} error={errors.email} onChange={event => set("email", event.target.value)} />
        <TextField label="Phone" id={`${id}-phone`} type="tel" maxLength={40} value={value.phone} onChange={event => set("phone", event.target.value)} />
        <TextField label="Website" id={`${id}-website`} type="url" maxLength={200} placeholder="https://" value={value.website} onChange={event => set("website", event.target.value)} />
        <TextField
          label="Currency"
          id={`${id}-currency`}
          maxLength={3}
          autoComplete="off"
          hint="3-letter code, e.g. INR, USD, EUR. Used for every amount."
          className="[&_input]:uppercase"
          value={value.currency}
          error={errors.currency}
          onChange={event => set("currency", event.target.value.toUpperCase())}
        />
      </div>
    </fieldset>
  );
}
