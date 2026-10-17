"use client";
// Appearance: theme mode, accent colour, style preset, typeface, sidebar look, text size, density, reduced motion, and the
// background picture. Applied instantly from this browser's copy; the signed-in account's saved preferences and the
// workspace's brand colour, default style, and picture are pushed in by ThemeSync (app layer) once the session loads.
// The background picture belongs to the signed-in app only: ThemeSync marks the app active while it's mounted.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "@/lib/navigation";

const STORAGE_KEY = "tf-appearance";
const LEGACY_KEY = "tf-theme";
/** The last workspace brand seen (style, colour, picture, address), so the boot script can paint it before the session loads. */
const BRAND_KEY = "tf-brand-style";
export const THEMES = ["light", "dark", "system"] as const;
export const ACCENTS = ["indigo", "blue", "teal", "emerald", "amber", "rose", "violet", "slate", "cyan", "fuchsia", "lime", "orange"] as const;
/** Style presets (server/src/services/moduleSettings.js STYLES); each is a block of CSS variables in globals.css. */
export const STYLES = ["classic", "business", "glass", "midnight", "minimal", "soft", "contrast", "neon", "ocean", "sunset", "forest"] as const;
/** "auto" = the style preset's own choice */
export const FONTS = ["auto", "system", "inter", "jakarta", "plex"] as const;
export const SIDEBARS = ["auto", "light", "tinted", "dark"] as const;
export const SIDEBAR_POSITIONS = ["left", "right"] as const;
export const SIDEBAR_MODES = ["full", "compact"] as const;
export const SIDEBAR_ALIGNS = ["left", "center"] as const;

export type ThemeMode = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export type StylePreset = (typeof STYLES)[number];
export type FontChoice = (typeof FONTS)[number];
export type SidebarChoice = (typeof SIDEBARS)[number];
export type SidebarPosition = (typeof SIDEBAR_POSITIONS)[number];
export type SidebarMode = (typeof SIDEBAR_MODES)[number];
export type SidebarAlign = (typeof SIDEBAR_ALIGNS)[number];

/** What each preset uses when the person leaves typeface and sidebar on "auto". */
export const STYLE_DEFAULTS: Readonly<Record<StylePreset, { font: Exclude<FontChoice, "auto">; sidebar: Exclude<SidebarChoice, "auto"> }>> = Object.freeze({
  classic: { font: "system", sidebar: "light" },
  business: { font: "inter", sidebar: "dark" },
  glass: { font: "jakarta", sidebar: "light" },
  midnight: { font: "plex", sidebar: "dark" },
  minimal: { font: "inter", sidebar: "light" },
  soft: { font: "jakarta", sidebar: "tinted" },
  contrast: { font: "system", sidebar: "light" },
  neon: { font: "jakarta", sidebar: "dark" },
  ocean: { font: "inter", sidebar: "tinted" },
  sunset: { font: "jakarta", sidebar: "tinted" },
  forest: { font: "plex", sidebar: "tinted" },
});

/** Each accent's swatch (complete class names for Tailwind), its colour for drawn things (favicons), and its name. */
export const ACCENT_META: Readonly<Record<(typeof ACCENTS)[number], { swatch: string; hex: string; label: string }>> = Object.freeze({
  indigo: { swatch: "bg-indigo-600", hex: "#4f46e5", label: "Indigo" },
  blue: { swatch: "bg-blue-600", hex: "#2563eb", label: "Blue" },
  teal: { swatch: "bg-teal-700", hex: "#0f766e", label: "Teal" },
  emerald: { swatch: "bg-emerald-700", hex: "#047857", label: "Emerald" },
  amber: { swatch: "bg-amber-700", hex: "#b45309", label: "Amber" },
  rose: { swatch: "bg-rose-600", hex: "#e11d48", label: "Rose" },
  violet: { swatch: "bg-violet-600", hex: "#7c3aed", label: "Violet" },
  slate: { swatch: "bg-slate-700", hex: "#334155", label: "Slate" },
  cyan: { swatch: "bg-cyan-700", hex: "#0e7490", label: "Cyan" },
  fuchsia: { swatch: "bg-fuchsia-600", hex: "#c026d3", label: "Fuchsia" },
  lime: { swatch: "bg-lime-700", hex: "#4d7c0f", label: "Lime" },
  orange: { swatch: "bg-orange-600", hex: "#ea580c", label: "Orange" },
});

export interface AppearancePreferences {
  theme: ThemeMode;
  /** null = use the workspace colour */
  accent: Accent | null;
  /** null = use the workspace's default style */
  style: StylePreset | null;
  font: FontChoice;
  sidebar: SidebarChoice;
  sidebarPosition: SidebarPosition;
  sidebarMode: SidebarMode;
  sidebarAlign: SidebarAlign;
  fontScale: "sm" | "md" | "lg";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  /** Background picture link: null = the workspace's, "none" = no picture */
  backgroundImage: string | null;
  /** 0-90: how much the page colour dims the picture; null = the workspace's */
  backgroundDim: number | null;
}

export interface Brand {
  accent: Accent;
  lockAccent: boolean;
  /** The workspace's default style (classic when unset) */
  style?: StylePreset;
  lockStyle?: boolean;
  /** The workspace's background picture link ("" = none) and dimming */
  backgroundImage?: string;
  backgroundDim?: number;
  /** The workspace's address: the boot script paints the picture only on its app pages */
  slug?: string;
}

const DEFAULT_BRAND: Brand = Object.freeze({ accent: "indigo", lockAccent: false });

export const DEFAULT_PREFERENCES: AppearancePreferences = Object.freeze({
  theme: "system",
  accent: null,
  style: null,
  font: "auto",
  sidebar: "auto",
  sidebarPosition: "left",
  sidebarMode: "full",
  sidebarAlign: "left",
  fontScale: "md",
  density: "comfortable",
  reduceMotion: false,
  backgroundImage: null,
  backgroundDim: null,
});

/** Only links the server also accepts (they go inside CSS url("…")): http(s), no quotes, brackets, spaces, or backslashes. */
const SAFE_IMAGE_URL = /^https?:\/\/[^\s"'()<>\\]+$/i;
export const isSafeImageUrl = (value: string | null | undefined): value is string => Boolean(value && value.length <= 1000 && SAFE_IMAGE_URL.test(value));

/** The background picture in use and its dimming: the person's choice, else the workspace's. */
export function resolveBackground(preferences: Pick<AppearancePreferences, "backgroundImage" | "backgroundDim">, brand: Pick<Brand, "backgroundImage" | "backgroundDim">) {
  const image = preferences.backgroundImage === "none" ? null : (preferences.backgroundImage ?? brand.backgroundImage ?? null);
  return { image: isSafeImageUrl(image) ? image : null, dim: preferences.backgroundDim ?? brand.backgroundDim ?? 40 };
}

/** The style in use: the workspace's when it's locked or the person has no choice of their own. */
export function resolveStyle(preferences: Pick<AppearancePreferences, "style">, brand: Pick<Brand, "style" | "lockStyle">): StylePreset {
  const style = brand.lockStyle ? brand.style : (preferences.style ?? brand.style);
  return style && (STYLES as readonly string[]).includes(style) ? style : "classic";
}

/** Second path segments under a workspace address that aren't the signed-in app (no background picture there). */
const NON_APP_PAGES = ["login", "clinic-display", "patient"];

/**
 * Inline script for <head>: applies the saved appearance before first paint (no flash of the wrong theme, style, colour,
 * motion setting, or background picture). The picture is painted only on the remembered workspace's app pages.
 */
export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${STORAGE_KEY}")||"null")||{theme:localStorage.getItem("${LEGACY_KEY}")||"system"};var b=JSON.parse(localStorage.getItem("${BRAND_KEY}")||"null")||{};var r=document.documentElement;var d=p.theme==="dark"||(p.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);r.classList.toggle("dark",d);var a=b.lockAccent?b.accent:(p.accent||b.accent);if(a)r.dataset.accent=a;if(p.fontScale)r.dataset.font=p.fontScale;if(p.density)r.dataset.density=p.density;r.dataset.motion=p.reduceMotion?"reduce":"normal";if(p.sidebarPosition)r.dataset.sidebarPosition=p.sidebarPosition;if(p.sidebarMode)r.dataset.sidebarMode=p.sidebarMode;if(p.sidebarAlign)r.dataset.sidebarAlign=p.sidebarAlign;var D=${JSON.stringify(STYLE_DEFAULTS)};var s=b.lock?b.style:(p.style||b.style);if(!D[s])s="classic";r.dataset.style=s;r.dataset.typeface=p.font&&p.font!=="auto"?p.font:D[s].font;r.dataset.sidebar=p.sidebar&&p.sidebar!=="auto"?p.sidebar:D[s].sidebar;var g=location.pathname.split("/");if(b.slug&&decodeURIComponent(g[1]||"").toLowerCase()===b.slug&&${JSON.stringify(NON_APP_PAGES)}.indexOf(g[2]||"")<0){var i=p.backgroundImage==="none"?null:(p.backgroundImage||b.bg);if(i&&i.length<=1000&&new RegExp(${JSON.stringify(SAFE_IMAGE_URL.source)},"i").test(i)){var m=p.backgroundDim!=null?p.backgroundDim:(b.dim!=null?b.dim:40);r.style.setProperty("--user-bg-image",'url("'+i+'")');r.style.setProperty("--user-bg-dim",Math.min(90,Math.max(0,m))+"%");r.dataset.bg="image";}}}catch(e){}`;

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  preferences: AppearancePreferences;
  setPreference: <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => void;
  applyServerPreferences: (saved: Partial<AppearancePreferences> | null | undefined) => void;
  /** The accent in use: the person's choice, or the workspace's when they have none or it's locked. */
  accent: Accent;
  /** The style preset in use (same rule as the accent). */
  style: StylePreset;
  brand: Brand;
  setBrand: (brand: Brand) => void;
  /** ThemeSync marks the signed-in app active while it's mounted: the background picture shows only then. */
  setAppActive: (active: boolean) => void;
  /** Personal CSS being edited in Settings → Appearance, applied instead of the saved CSS; null = not previewing */
  cssPreview: string | null;
  setCssPreview: (css: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): AppearancePreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored) return { ...DEFAULT_PREFERENCES, ...stored };
    const legacy = localStorage.getItem(LEGACY_KEY) as ThemeMode | null;
    return { ...DEFAULT_PREFERENCES, ...(legacy ? { theme: legacy } : {}) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: preferences still apply for this session
  }
}

/** The boot script's rule: this page is an app page of the workspace remembered in BRAND_KEY. */
function isRememberedAppPage() {
  try {
    const slug = (JSON.parse(localStorage.getItem(BRAND_KEY) || "null") as { slug?: string | null } | null)?.slug;
    const [, first = "", second = ""] = window.location.pathname.split("/");
    return Boolean(slug) && decodeURIComponent(first).toLowerCase() === slug && !NON_APP_PAGES.includes(second);
  } catch {
    return false;
  }
}

function apply(preferences: AppearancePreferences, accent: Accent, style: StylePreset, background: { image: string | null; dim: number }) {
  const root = document.documentElement;
  const dark = preferences.theme === "dark" || (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const defaults = STYLE_DEFAULTS[style];
  root.classList.toggle("dark", dark);
  root.dataset.accent = accent;
  root.dataset.style = style;
  root.dataset.typeface = preferences.font && preferences.font !== "auto" ? preferences.font : defaults.font;
  root.dataset.sidebar = preferences.sidebar && preferences.sidebar !== "auto" ? preferences.sidebar : defaults.sidebar;
  root.dataset.sidebarPosition = preferences.sidebarPosition || "left";
  root.dataset.sidebarMode = preferences.sidebarMode || "full";
  root.dataset.sidebarAlign = preferences.sidebarAlign || "left";
  root.dataset.font = preferences.fontScale;
  root.dataset.density = preferences.density;
  root.dataset.motion = preferences.reduceMotion ? "reduce" : "normal";
  // Background picture: globals.css paints it behind the app, dimmed by the page colour.
  if (background.image) {
    root.style.setProperty("--user-bg-image", `url("${background.image}")`);
    root.style.setProperty("--user-bg-dim", `${Math.min(90, Math.max(0, background.dim))}%`);
    root.dataset.bg = "image";
  } else {
    root.style.removeProperty("--user-bg-image");
    delete root.dataset.bg;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render uses the defaults; the browser's saved copy is read after mount (the boot script already painted it).
  const [preferences, setPreferences] = useState<AppearancePreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [brand, setBrandState] = useState<Brand>(DEFAULT_BRAND);
  // null until ThemeSync says: keep what the boot script painted (it only paints on the app's pages).
  const [appActive, setAppActiveState] = useState<boolean | null>(null);
  const pathname = usePathname();
  const [cssPreview, setCssPreview] = useState<string | null>(null);
  const accent: Accent = brand.lockAccent ? brand.accent : (preferences.accent ?? brand.accent ?? "indigo");
  const style = resolveStyle(preferences, brand);
  const resolved = resolveBackground(preferences, brand);
  // Outside the signed-in app (sign-in pages, the console, public pages) there is no background picture.
  const backgroundImage = appActive === false ? null : resolved.image;
  const backgroundDim = resolved.dim;

  // Reading localStorage is a sync with an external system, so it happens in an effect after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
    setPreferences(readStored());
    setLoaded(true);
  }, []);

  // Apply to <html>, and follow OS changes while in "system" mode (external system → effect is correct).
  useEffect(() => {
    if (!loaded) return undefined;
    // Before ThemeSync mounts, follow the boot script's rule (and drop the picture if the page moved off the app).
    const background = { image: appActive === null && !isRememberedAppPage() ? null : backgroundImage, dim: backgroundDim };
    apply(preferences, accent, style, background);
    if (preferences.theme !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(preferences, accent, style, background);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preferences, accent, style, loaded, backgroundImage, backgroundDim, appActive, pathname]);

  /** Change one preference locally (callers also save it to the account). */
  const setPreference = useCallback(<K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => {
    setPreferences(current => {
      const next = { ...current, [key]: value };
      store(STORAGE_KEY, next);
      return next;
    });
  }, []);

  /** Adopt the account's saved preferences (from the server). */
  const applyServerPreferences = useCallback((saved: Partial<AppearancePreferences> | null | undefined) => {
    if (!saved || !Object.keys(saved).length) return;
    setPreferences(current => {
      const next = { ...current, ...saved };
      store(STORAGE_KEY, next);
      return next;
    });
  }, []);

  /** The workspace's brand; remembered for the boot script (only when it's known). */
  const setBrand = useCallback((next: Brand) => {
    setBrandState(next);
    if (next.style) {
      store(BRAND_KEY, {
        style: next.style,
        lock: Boolean(next.lockStyle),
        accent: next.accent,
        lockAccent: next.lockAccent,
        bg: next.backgroundImage ?? "",
        dim: next.backgroundDim ?? 40,
        slug: next.slug ?? null,
      });
    }
  }, []);

  /**
   * Entering the app shows its picture; leaving it (sign-out, another workspace's sign-in page) drops the
   * workspace's brand from this page (the boot script keeps its remembered copy for the next visit).
   */
  const setAppActive = useCallback((active: boolean) => {
    setAppActiveState(active);
    if (!active) {
      setBrandState(DEFAULT_BRAND);
      setCssPreview(null);
    }
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => setPreference("theme", theme), [setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: preferences.theme, setTheme, preferences, setPreference, applyServerPreferences, accent, style, brand, setBrand, setAppActive, cssPreview, setCssPreview }),
    [preferences, setTheme, setPreference, applyServerPreferences, accent, style, brand, setBrand, setAppActive, cssPreview]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
