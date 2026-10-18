import type { ComponentType } from "react";

export type IconLibraryKey =
  | "lucide"
  | "tabler"
  | "material"
  | "heroicons"
  | "phosphor"
  | "remix";

export type IconStyleKey = "outline" | "filled" | "bold" | "rounded";

export interface IconLibraryMeta {
  key: IconLibraryKey;
  name: string;
  license: string;
  licenseType: "ISC" | "MIT" | "Apache 2.0";
  description: string;
  browseUrl: string;
  licenseUrl: string;
  attributionNote: string;
  defaultStrokeWidth: number;
  hasFillVariant: boolean;
  sampleIconNames: string[];
}

export interface IconItem {
  id: string; // e.g. "lucide:check-square", "tabler:checkbox"
  name: string;
  library: IconLibraryKey;
  tags: string[];
  category:
    | "navigation"
    | "operations"
    | "communication"
    | "medical"
    | "finance"
    | "general"
    | "actions"
    | "objects";
  component: ComponentType<{
    className?: string;
    strokeWidth?: number;
    size?: number | string;
    style?: React.CSSProperties;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

export type NavIconKey =
  | "home"
  | "tasks"
  | "meetings"
  | "messaging"
  | "notes"
  | "announcements"
  | "helpdesk"
  | "teams"
  | "people"
  | "sales"
  | "billing"
  | "inventory"
  | "logistics"
  | "clinic"
  | "attendance"
  | "expenses"
  | "admin"
  | "users"
  | "roles"
  | "audit"
  | "settings";

export const ICON_LIBRARIES: readonly IconLibraryMeta[] = [
  {
    key: "lucide",
    name: "Lucide Icons",
    license: "ISC license",
    licenseType: "ISC",
    description:
      "Clean, minimal outline icons. Great for modern websites, dashboards, apps, and UI design. Free for commercial use; attribution generally not required.",
    browseUrl: "https://lucide.dev/icons",
    licenseUrl: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
    attributionNote: "Free for commercial use; attribution generally not required.",
    defaultStrokeWidth: 2,
    hasFillVariant: false,
    sampleIconNames: ["Home", "Tasks", "Chat", "Sales", "Clinic", "Settings"],
  },
  {
    key: "tabler",
    name: "Tabler Icons",
    license: "MIT license",
    licenseType: "MIT",
    description:
      "Thousands of consistent outline icons, ideal for web interfaces, apps, and commercial design work. Free to use, modify, and distribute under the license terms.",
    browseUrl: "https://tabler.io/icons",
    licenseUrl: "https://github.com/tabler/tabler-icons/blob/main/LICENSE",
    attributionNote: "Free to use, modify, and distribute under the license terms.",
    defaultStrokeWidth: 2,
    hasFillVariant: true,
    sampleIconNames: ["Dashboard", "Checklist", "Messages", "Growth", "Stethoscope", "Adjust"],
  },
  {
    key: "material",
    name: "Google Material Symbols",
    license: "Apache 2.0",
    licenseType: "Apache 2.0",
    description:
      "A huge collection of standard interface icons, available in outlined, rounded, and sharp styles. Free commercial use. License conditions apply when redistributing icon files.",
    browseUrl: "https://fonts.google.com/icons",
    licenseUrl: "https://developers.google.com/fonts/docs/material_symbols",
    attributionNote: "Free commercial use. License conditions apply when redistributing icon files.",
    defaultStrokeWidth: 2,
    hasFillVariant: true,
    sampleIconNames: ["Overview", "Assignment", "Forum", "Trending", "Health", "Tune"],
  },
  {
    key: "heroicons",
    name: "Heroicons",
    license: "MIT license",
    licenseType: "MIT",
    description:
      "Beautiful, simple outline and solid icons, especially suited to clean websites and Tailwind CSS projects.",
    browseUrl: "https://heroicons.com/",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    attributionNote: "MIT license. Crafted by the creators of Tailwind CSS.",
    defaultStrokeWidth: 1.75,
    hasFillVariant: true,
    sampleIconNames: ["Squares", "Clipboard", "Bubble", "Chart", "Heart", "Cog"],
  },
  {
    key: "phosphor",
    name: "Phosphor Icons",
    license: "MIT license",
    licenseType: "MIT",
    description:
      "Flexible icons in thin, light, regular, bold, fill, and duotone styles.",
    browseUrl: "https://phosphoricons.com/",
    licenseUrl: "https://github.com/phosphor-icons/core/blob/main/LICENSE",
    attributionNote: "MIT license. Flexible multi-weight icon family.",
    defaultStrokeWidth: 2,
    hasFillVariant: true,
    sampleIconNames: ["Grid", "Checks", "Teardrop", "Trend", "Pulse", "Sliders"],
  },
  {
    key: "remix",
    name: "Remix Icon",
    license: "Apache 2.0",
    licenseType: "Apache 2.0",
    description:
      "A versatile collection of outline and filled icons for websites, apps, and product interfaces.",
    browseUrl: "https://remixicon.com/",
    licenseUrl: "https://github.com/Remix-Design/RemixIcon/blob/master/License",
    attributionNote: "Apache 2.0 license. Rich product interface iconography.",
    defaultStrokeWidth: 1.75,
    hasFillVariant: true,
    sampleIconNames: ["Dashboard", "Checkbox", "Chat", "LineChart", "Medicine", "Settings"],
  },
] as const;

export const ICON_LIBRARY_MAP = Object.freeze(
  Object.fromEntries(ICON_LIBRARIES.map((lib) => [lib.key, lib])) as Record<
    IconLibraryKey,
    IconLibraryMeta
  >
);
