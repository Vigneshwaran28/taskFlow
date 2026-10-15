// Sign-in page templates for workspace login pages (/<slug>/login) and their settings previews.
export { LoginTemplateView } from "./LoginTemplateView";
export type { LoginTemplateViewProps } from "./LoginTemplateView";
export {
  ACCENT_PRIMARY,
  LOGIN_BACKGROUNDS,
  LOGIN_BACKGROUND_KEYS,
  LOGIN_BACKGROUND_LABELS,
  LOGIN_LIMITS,
  LOGIN_TEMPLATES,
  cleanLoginBranding,
  hasLoginBrandingErrors,
  loginPreviewWorkspace,
  validateLoginBranding,
} from "./loginTemplateMeta";
export type { BrandingSettings, LoginBrandingErrors, LoginTemplateMeta, LoginTemplateWorkspace } from "./loginTemplateMeta";
