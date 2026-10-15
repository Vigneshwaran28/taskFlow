// The workspace this browser last signed in to (localStorage "tf-workspace"), so sign-out and expired
// sessions return people to their own workspace's sign-in page (/<slug>/login). Mirrored in the "tf_ws" cookie
// so the proxy (src/proxy.ts) can send old un-prefixed links into the right workspace.
import { useSyncExternalStore } from "react";
import { isWorkspaceSlug } from "@/lib/tenantPath";

export { isWorkspaceSlug };

export const REMEMBERED_WORKSPACE_KEY = "tf-workspace";

/** The sign-in page of one workspace. */
export const workspaceLoginPath = (slug: string) => `/${encodeURIComponent(slug)}/login`;

/** The full, shareable sign-in URL of a workspace (origin of this browser). */
export function workspaceLoginUrl(slug: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${workspaceLoginPath(slug)}`;
}

/**
 * Turns what someone typed ("acme", "Acme ", "https://x/w/acme/login") into a slug, or null when it can't be one.
 */
export function parseWorkspaceAddress(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  // "https://host/acme/login", "/w/acme/login" (older links), or just "acme"
  const fromPath = /\/w\/([^/?#]+)/.exec(text)?.[1] ?? /^(?:https?:\/\/[^/]+)?\/([^/?#]+)\/login/.exec(text)?.[1];
  const candidate = (fromPath ?? text).replace(/\s+/g, "-");
  return isWorkspaceSlug(candidate) ? candidate : null;
}

export function getRememberedWorkspace(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(REMEMBERED_WORKSPACE_KEY);
    return value && isWorkspaceSlug(value) ? value : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export function rememberWorkspace(slug: string | null | undefined) {
  try {
    if (slug && isWorkspaceSlug(slug)) {
      window.localStorage.setItem(REMEMBERED_WORKSPACE_KEY, slug);
      document.cookie = `tf_ws=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
    }
  } catch {
    // storage unavailable: people use the generic sign-in page instead
  }
  notify();
}

export function forgetWorkspace(slug?: string) {
  try {
    if (!slug || window.localStorage.getItem(REMEMBERED_WORKSPACE_KEY) === slug) {
      window.localStorage.removeItem(REMEMBERED_WORKSPACE_KEY);
      document.cookie = "tf_ws=; path=/; max-age=0; samesite=lax";
    }
  } catch {
    // storage unavailable: nothing to forget
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The remembered workspace slug (null on the server and before hydration). */
export function useRememberedWorkspace() {
  return useSyncExternalStore(subscribe, getRememberedWorkspace, () => null);
}

/** Only same-site paths are followed after sign-in (no open redirects). */
export const safeRedirect = (value: string | null | undefined) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/");
