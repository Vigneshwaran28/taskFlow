"use client";
// Injects a person's own CSS (Settings → Appearance → My custom CSS) as <style data-user-css> at the end of <head>, after
// the workspace's CSS so it wins. Like TenantCss: set as textContent, re-checked against the server's rules, skipped in
// safe mode (?nocss=1), when the person has it off, or when the workspace doesn't allow personal CSS.
import { useEffect } from "react";
import { bracesBalanced, isCustomCssSafeMode, userCssProblem } from "../utils/customCss";

export interface UserCssProps {
  css: string | null | undefined;
  /** The person has it on and the workspace allows it. */
  enabled: boolean;
}

export function UserCss({ css, enabled }: UserCssProps) {
  useEffect(() => {
    if (!enabled || !css?.trim() || isCustomCssSafeMode() || userCssProblem(css) || !bracesBalanced(css)) return;
    const style = document.createElement("style");
    style.setAttribute("data-user-css", "");
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [css, enabled]);

  return null;
}
