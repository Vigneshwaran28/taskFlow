"use client";
import { createElement, type ComponentType, type CSSProperties } from "react";
import { useTheme } from "@/hooks/useTheme";
import { resolveNavIcon, ICON_BY_ID } from "./registry";
import type { IconLibraryKey, NavIconKey } from "./types";

export interface DynamicIconProps {
  /** If provided, resolves icon for this navigation / module item based on user's active library & custom overrides */
  navKey?: NavIconKey | string;
  /** Explicit icon id from catalog, e.g. "tabler:bolt" or "material:work" */
  iconId?: string;
  /** Direct icon library override if desired */
  library?: IconLibraryKey;
  /** Optional fallback component if not found */
  fallback?: ComponentType<{ className?: string; strokeWidth?: number; size?: number | string }>;
  className?: string;
  strokeWidth?: number;
  size?: number | string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Universal dynamic icon component.
 * Adapts to the user's active Icon Library (Lucide, Tabler, Google Material, Heroicons, Phosphor, Remix)
 * and user's custom icon overrides with fluid rendering.
 */
export function DynamicIcon({
  navKey,
  iconId,
  library,
  fallback,
  className,
  strokeWidth,
  size,
  style,
  "aria-hidden": ariaHidden = true,
}: DynamicIconProps) {
  const { preferences } = useTheme();

  const activeLibrary = library || preferences.iconLibrary || "lucide";
  const customIcons = preferences.customIcons || {};
  const effectiveStrokeWidth = strokeWidth ?? preferences.iconStrokeWidth ?? 2;

  let IconComponent: ComponentType<{
    className?: string;
    strokeWidth?: number;
    size?: number | string;
    style?: CSSProperties;
    "aria-hidden"?: boolean | "true" | "false";
  }>;

  if (iconId && ICON_BY_ID[iconId]) {
    IconComponent = ICON_BY_ID[iconId].component;
  } else if (navKey) {
    IconComponent = resolveNavIcon(navKey, activeLibrary, customIcons, fallback);
  } else if (fallback) {
    IconComponent = fallback;
  } else {
    IconComponent = resolveNavIcon("home", activeLibrary, customIcons);
  }

  return createElement(IconComponent, {
    className,
    strokeWidth: effectiveStrokeWidth,
    size,
    style,
    "aria-hidden": ariaHidden,
  });
}
