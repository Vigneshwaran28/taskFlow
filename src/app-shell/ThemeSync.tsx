"use client";
import { useEffect } from "react";
import { useCurrentUser, useSiteTitle } from "@/features/auth";
import { TenantCss, TenantUi, UserCss } from "@/features/workspace";
import { ACCENT_META, useTheme, type Accent, type AppearancePreferences, type StylePreset } from "@/hooks/useTheme";
import { useDocumentIcon, useDocumentTitle } from "@/lib/documentBranding";
import { usePathname } from "@/lib/navigation";

/** Tab titles per app section ("Sales · Acme"); the home page shows the workspace title alone. */
const SECTION_TITLES: Record<string, string> = {
  tasks: "Tasks",
  calendar: "Calendar",
  lists: "Lists",
  tickets: "Help desk",
  teams: "Teams",
  people: "People",
  messages: "Messages",
  announcements: "Announcements",
  notes: "Notes",
  inventory: "Inventory",
  sales: "Sales",
  billing: "Billing",
  logistics: "Logistics",
  attendance: "Attendance",
  expenses: "Expenses",
  clinic: "Clinic",
  users: "Manage users",
  roles: "Roles & access",
  audit: "Audit log",
  settings: "Settings",
  admin: "Workspace admin",
};

/**
 * Renders nothing visible: once the session loads, applies the account's saved appearance, the workspace's brand
 * colour, default style, and background picture, the workspace's title and logo in the browser tab, and the custom CSS
 * (the workspace's, then the person's own, which wins). Pushing server state into the browser is a sync with an
 * external system. Mounted only inside the signed-in app: leaving it drops the workspace's picture and brand.
 */
export function ThemeSync() {
  const { data: user } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const pathname = usePathname();
  const { applyServerPreferences, setBrand, setAppActive, accent, cssPreview } = useTheme();
  // Only the appearance keys: the home layout, profile picture, and personal CSS are saved alongside them but aren't theme settings.
  const saved = JSON.stringify({ ...user?.preferences, homeLayout: undefined, avatarUrl: undefined, customCss: undefined, customCssEnabled: undefined });
  const branding = user?.tenant?.settings?.branding;
  const brandKey = JSON.stringify({
    accent: branding?.accent ?? "indigo",
    lockAccent: Boolean(branding?.lockAccent),
    style: branding?.style ?? "classic",
    lockStyle: Boolean(branding?.lockStyle),
    backgroundImage: branding?.backgroundImage ?? "",
    backgroundDim: branding?.backgroundDim ?? 40,
    backgroundTextColor: branding?.backgroundTextColor ?? "",
    slug: user?.tenant?.slug,
  });

  useEffect(() => {
    setAppActive(true);
    return () => setAppActive(false);
  }, [setAppActive]);

  useEffect(() => {
    applyServerPreferences(JSON.parse(saved) as Partial<AppearancePreferences>);
  }, [saved, applyServerPreferences]);

  useEffect(() => {
    const brand = JSON.parse(brandKey) as { accent: Accent; lockAccent: boolean; style: StylePreset; lockStyle: boolean; backgroundImage: string; backgroundDim: number; backgroundTextColor?: string; slug?: string };
    setBrand(brand);
  }, [brandKey, setBrand]);

  const section = SECTION_TITLES[pathname.split("/")[1] ?? ""];
  useDocumentTitle(section ? `${section} · ${siteTitle}` : siteTitle);
  useDocumentIcon({ icon: branding?.logoIcon, imageUrl: branding?.logoUrl, color: ACCENT_META[accent].hex });

  // The workspace's custom CSS for the signed-in app (off unless enabled; ?nocss=1 skips it), then the person's own:
  // what they're editing in Settings → Appearance while they edit it, else what they saved (if the workspace allows it).
  const allowUserCss = branding?.allowUserCss !== false;
  const prefs = user?.preferences;
  return (
    <>
      <TenantUi ui={branding?.ui} keepPersonalFont={Boolean(prefs?.font && prefs.font !== "auto")} />
      <TenantCss scope="app" css={branding?.customCss?.app} enabled={Boolean(branding?.customCssEnabled)} />
      <UserCss css={cssPreview ?? prefs?.customCss} enabled={allowUserCss && (cssPreview !== null || Boolean(prefs?.customCssEnabled))} />
    </>
  );
}
