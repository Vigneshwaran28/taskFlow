"use client";
// The browser tab's title and icon for a workspace. Next.js resets <title> from the root metadata ("TaskFlow") on
// navigation, so the title is re-applied whenever something else changes it while a page owns it.
import { createElement, useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { logoIcon } from "@/components/shared/logoIcons";

const DEFAULT_ICON = "/favicon.svg";
const SAFE_IMAGE = /^https?:\/\/[^\s"'()<>\\]+$/i;

/** An SVG data URL: the logo icon in white on a rounded square of the brand colour. */
function iconDataUrl(icon: string | null | undefined, color: string) {
  const inner = renderToStaticMarkup(createElement(logoIcon(icon), { color: "#ffffff", strokeWidth: 2.5, size: 20 }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><g transform="translate(6 6)">${inner}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[data-tf-icon]");
  if (!link) {
    // Next renders its own icon link from metadata; ours goes last so the browser uses it.
    link = document.createElement("link");
    link.rel = "icon";
    link.dataset.tfIcon = "";
    document.head.append(link);
  }
  if (link.href !== href) link.href = href;
}

/** Keeps the tab title as `title` while mounted (re-applied after Next.js updates <title>). */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return undefined;
    document.title = title;
    const observer = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}

/** The tab icon: the logo image link, or the logo icon on `color`; back to TaskFlow's icon when unmounted. */
export function useDocumentIcon({ icon, imageUrl, color }: { icon?: string | null; imageUrl?: string | null; color: string }) {
  useEffect(() => {
    setFavicon(imageUrl && SAFE_IMAGE.test(imageUrl) ? imageUrl : iconDataUrl(icon, color));
    return () => setFavicon(DEFAULT_ICON);
  }, [icon, imageUrl, color]);
}
