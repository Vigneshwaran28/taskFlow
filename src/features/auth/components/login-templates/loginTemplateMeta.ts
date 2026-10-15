// Catalogue of sign-in page templates and backgrounds, plus the limits and helpers for editing them.
// Keys and limits mirror the server (server/src/services/moduleSettings.js branding.login*).
import { ACCENTS, ACCENT_META, type Accent } from "@/hooks/useTheme";
import type { FeatureKey, LoginBackground, LoginTemplate, PublicWorkspace, WorkspaceSettings } from "@/types/session";

export interface LoginTemplateMeta {
  key: LoginTemplate;
  name: string;
  description: string;
}

export const LOGIN_TEMPLATES: readonly LoginTemplateMeta[] = Object.freeze([
  { key: "split", name: "Split", description: "Brand panel with your headline and highlights beside the form." },
  { key: "centered", name: "Centered", description: "A single card floating on a full-page gradient." },
  { key: "banner", name: "Banner", description: "A wide hero band across the top, the form below it." },
  { key: "minimal", name: "Minimal", description: "Plain page, small logo, just the form." },
  { key: "corporate", name: "Corporate", description: "Side column with company name and support, plus a footer." },
]);

/** Complete Tailwind classes for each background preset (listed in full so Tailwind generates them). */
export const LOGIN_BACKGROUNDS: Readonly<Record<LoginBackground, string>> = Object.freeze({
  indigo: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800",
  ocean: "bg-gradient-to-br from-sky-700 via-cyan-800 to-blue-900",
  sunset: "bg-gradient-to-br from-orange-600 via-rose-700 to-purple-900",
  forest: "bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900",
  midnight: "bg-gradient-to-br from-slate-800 via-slate-900 to-gray-950",
  rose: "bg-gradient-to-br from-rose-600 via-pink-700 to-fuchsia-900",
  plain: "bg-gradient-to-br from-muted via-background to-accent",
});

export const LOGIN_BACKGROUND_LABELS: Readonly<Record<LoginBackground, string>> = Object.freeze({
  indigo: "Indigo",
  ocean: "Ocean",
  sunset: "Sunset",
  forest: "Forest",
  midnight: "Midnight",
  rose: "Rose",
  plain: "Plain",
});

export const LOGIN_BACKGROUND_KEYS = Object.freeze(Object.keys(LOGIN_BACKGROUNDS) as LoginBackground[]);

/** Primary colour per accent (light theme values from globals.css), for previews that can't change <html>. */
export const ACCENT_PRIMARY = Object.freeze(Object.fromEntries(ACCENTS.map(name => [name, ACCENT_META[name].hex])) as Record<Accent, string>);

export const LOGIN_LIMITS = Object.freeze({ headline: 120, message: 300, highlights: 5, highlight: 80, supportContact: 160 });

/** What a sign-in template needs: the public workspace response, or a draft built from settings. */
export type LoginTemplateWorkspace = Pick<PublicWorkspace, "slug" | "siteTitle" | "tagline" | "accent" | "login" | "companyName" | "features" | "logoIcon" | "logoUrl">;

export type BrandingSettings = WorkspaceSettings["branding"];

/** A preview workspace from branding settings being edited (provider console or workspace settings). */
export function loginPreviewWorkspace({
  branding,
  slug,
  name,
  companyName,
  features,
}: {
  branding: BrandingSettings;
  slug: string;
  name: string;
  companyName?: string;
  features: readonly FeatureKey[];
}): LoginTemplateWorkspace {
  const siteTitle = branding.siteTitle.trim() || name.trim() || "Your workspace";
  return {
    slug,
    siteTitle,
    tagline: branding.tagline.trim(),
    accent: branding.accent,
    companyName: companyName?.trim() || name.trim() || siteTitle,
    features: [...features],
    login: {
      template: branding.loginTemplate ?? "split",
      background: branding.loginBackground ?? "indigo",
      headline: branding.loginHeadline ?? "",
      message: branding.loginMessage ?? "",
      highlights: (branding.loginHighlights ?? []).map(item => item.trim()).filter(Boolean),
      supportContact: branding.supportContact ?? "",
    },
  };
}

export type LoginBrandingErrors = Partial<Record<"loginHeadline" | "loginMessage" | "loginHighlights" | "supportContact", string>> & {
  /** Per-line errors for highlights, by index */
  highlightItems?: Record<number, string>;
};

/** Client-side checks matching the server's limits. Empty highlight lines are ignored (they're dropped on save). */
export function validateLoginBranding(value: Partial<BrandingSettings>): LoginBrandingErrors {
  const errors: LoginBrandingErrors = {};
  if ((value.loginHeadline ?? "").trim().length > LOGIN_LIMITS.headline) errors.loginHeadline = `Keep the headline under ${LOGIN_LIMITS.headline} characters.`;
  if ((value.loginMessage ?? "").trim().length > LOGIN_LIMITS.message) errors.loginMessage = `Keep the message under ${LOGIN_LIMITS.message} characters.`;
  if ((value.supportContact ?? "").trim().length > LOGIN_LIMITS.supportContact) errors.supportContact = `Keep the support contact under ${LOGIN_LIMITS.supportContact} characters.`;
  const highlights = value.loginHighlights ?? [];
  if (highlights.filter(item => item.trim()).length > LOGIN_LIMITS.highlights) errors.loginHighlights = `Use at most ${LOGIN_LIMITS.highlights} highlights.`;
  highlights.forEach((item, index) => {
    if (item.trim().length > LOGIN_LIMITS.highlight) {
      errors.highlightItems = { ...errors.highlightItems, [index]: `Keep each highlight under ${LOGIN_LIMITS.highlight} characters.` };
    }
  });
  return errors;
}

export const hasLoginBrandingErrors = (errors: LoginBrandingErrors) =>
  Boolean(errors.loginHeadline || errors.loginMessage || errors.loginHighlights || errors.supportContact || Object.keys(errors.highlightItems ?? {}).length);

/** Trimmed values for the API; empty highlight lines are dropped. */
export function cleanLoginBranding<T extends Partial<BrandingSettings>>(value: T): T {
  return {
    ...value,
    loginHeadline: (value.loginHeadline ?? "").trim(),
    loginMessage: (value.loginMessage ?? "").trim(),
    loginHighlights: (value.loginHighlights ?? []).map(item => item.trim()).filter(Boolean),
    supportContact: (value.supportContact ?? "").trim(),
  };
}
