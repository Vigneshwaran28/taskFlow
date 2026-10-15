"use client";
// Applies a workspace's look and feel (settings.branding.ui) to the page: data-ui-* attributes on <html>, which
// app/globals.css turns into corners, shadows, type, spacing, and motion. Removed again when the component unmounts.
import { useEffect } from "react";
import { resolveUi, uiDataset } from "../utils/uiOptions";

export interface TenantUiProps {
  ui: Partial<Record<string, string>> | null | undefined;
  /** The person picked their own typeface: the workspace's doesn't replace it */
  keepPersonalFont?: boolean;
}

export function TenantUi({ ui, keepPersonalFont = false }: TenantUiProps) {
  const key = JSON.stringify(uiDataset(resolveUi(ui), { keepPersonalFont }));
  useEffect(() => {
    const root = document.documentElement;
    const data = JSON.parse(key) as Record<string, string>;
    for (const [name, value] of Object.entries(data)) root.dataset[name] = value;
    return () => {
      for (const name of Object.keys(data)) delete root.dataset[name];
    };
  }, [key]);
  return null;
}
