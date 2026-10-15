// A workspace's look and feel (settings.branding.ui): corners, shadows, cards, type, spacing, buttons, and motion for
// every UI element, on top of the style preset. The server (services/moduleSettings.js UI_OPTIONS) checks the same
// choices; app/globals.css turns <html data-ui-*> into CSS.

export const UI_OPTIONS = {
  radius: ["none", "small", "default", "large", "pill"],
  shadow: ["none", "soft", "default", "strong"],
  surface: ["default", "flat", "bordered", "elevated"],
  font: ["default", "system", "inter", "jakarta", "plex", "serif", "mono"],
  textSize: ["default", "sm", "lg", "xl"],
  density: ["default", "compact", "spacious"],
  buttonShape: ["default", "rounded", "pill", "square"],
  animation: ["none", "subtle", "standard", "lively"],
  speed: ["slow", "normal", "fast"],
  pageTransition: ["none", "fade", "slide", "zoom"],
  hover: ["none", "lift", "glow", "scale"],
} as const;

export type UiKey = keyof typeof UI_OPTIONS;
export type UiSettings = { [K in UiKey]: (typeof UI_OPTIONS)[K][number] };

export const DEFAULT_UI: UiSettings = Object.freeze({
  radius: "default",
  shadow: "default",
  surface: "default",
  font: "default",
  textSize: "default",
  density: "default",
  buttonShape: "default",
  animation: "standard",
  speed: "normal",
  pageTransition: "none",
  hover: "none",
});

/** Labels for the editor, in the order shown. */
export const UI_FIELDS: readonly { key: UiKey; label: string; hint: string; group: "shape" | "type" | "motion"; labels: Record<string, string> }[] = [
  { key: "radius", group: "shape", label: "Corners", hint: "How round cards, fields, and buttons are.", labels: { none: "Sharp", small: "Small", default: "Style's", large: "Large", pill: "Round" } },
  { key: "shadow", group: "shape", label: "Shadows", hint: "Depth under cards, menus, and dialogs.", labels: { none: "None", soft: "Soft", default: "Style's", strong: "Strong" } },
  { key: "surface", group: "shape", label: "Cards", hint: "How panels stand out from the page.", labels: { default: "Style's", flat: "Flat", bordered: "Outlined", elevated: "Raised" } },
  { key: "buttonShape", group: "shape", label: "Buttons", hint: "The shape of every button.", labels: { default: "Style's", rounded: "Rounded", pill: "Pill", square: "Square" } },
  { key: "font", group: "type", label: "Typeface", hint: "People who picked their own keep it.", labels: { default: "Style's", system: "System", inter: "Inter", jakarta: "Jakarta", plex: "Plex", serif: "Serif", mono: "Mono" } },
  { key: "textSize", group: "type", label: "Text size", hint: "People who picked their own keep it.", labels: { default: "Normal", sm: "Small", lg: "Large", xl: "Larger" } },
  { key: "density", group: "type", label: "Spacing", hint: "Room around and between elements.", labels: { default: "Normal", compact: "Compact", spacious: "Spacious" } },
  { key: "animation", group: "motion", label: "Animation", hint: "How much moves. People who reduce motion see none.", labels: { none: "None", subtle: "Subtle", standard: "Standard", lively: "Lively" } },
  { key: "speed", group: "motion", label: "Speed", hint: "How long transitions take.", labels: { slow: "Slow", normal: "Normal", fast: "Fast" } },
  { key: "pageTransition", group: "motion", label: "Page entrance", hint: "How each page appears.", labels: { none: "None", fade: "Fade", slide: "Slide up", zoom: "Zoom" } },
  { key: "hover", group: "motion", label: "Hover effect", hint: "Buttons and clickable cards under the pointer.", labels: { none: "None", lift: "Lift", glow: "Glow", scale: "Grow" } },
];

/** The workspace's settings with the defaults for anything missing or unknown. */
export function resolveUi(value: Partial<Record<string, string>> | null | undefined): UiSettings {
  const result = { ...DEFAULT_UI } as Record<UiKey, string>;
  for (const key of Object.keys(UI_OPTIONS) as UiKey[]) {
    const chosen = value?.[key];
    if (chosen && (UI_OPTIONS[key] as readonly string[]).includes(chosen)) result[key] = chosen;
  }
  return result as UiSettings;
}

/** data-ui-* attributes (as an element's dataset keys) for a set of choices; "default" values are left out. */
export function uiDataset(ui: UiSettings, { keepPersonalFont = false }: { keepPersonalFont?: boolean } = {}): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(ui) as [UiKey, string][]) {
    if (key === "font" && keepPersonalFont) continue;
    if (value !== "default") data[`ui${key[0].toUpperCase()}${key.slice(1)}`] = value;
  }
  return data;
}

/** The same, as React data-* props (for a preview element). */
export function uiDataProps(ui: UiSettings): Record<string, string> {
  return Object.fromEntries(Object.entries(uiDataset(ui)).map(([key, value]) => [`data-${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`, value]));
}
