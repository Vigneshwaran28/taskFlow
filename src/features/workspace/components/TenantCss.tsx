"use client";
// Injects a workspace's custom CSS as <style data-tenant-css="login|app"> in <head>. The text is set as
// textContent (never parsed as HTML), is re-checked against the same rules the server enforces on save, and is
// skipped entirely in safe mode (?nocss=1) or when the workspace has custom CSS switched off.
import { useEffect } from "react";
import { customCssProblem, isCustomCssSafeMode } from "../utils/customCss";

export interface TenantCssProps {
  /** Which block this is: the sign-in page or the signed-in app. */
  scope: "login" | "app";
  /** The CSS to apply, or nothing (disabled / not loaded yet). */
  css: string | null | undefined;
  /** False when the workspace has custom CSS switched off. */
  enabled: boolean;
}

export function TenantCss({ scope, css, enabled }: TenantCssProps) {
  useEffect(() => {
    if (!enabled || !css?.trim() || isCustomCssSafeMode() || customCssProblem(css)) return;
    const style = document.createElement("style");
    style.setAttribute("data-tenant-css", scope);
    style.textContent = css;
    // Before any personal CSS (UserCss), so a person's own rules keep winning whichever was added last.
    document.head.insertBefore(style, document.head.querySelector("style[data-user-css]"));
    return () => style.remove();
  }, [scope, css, enabled]);

  return null;
}
