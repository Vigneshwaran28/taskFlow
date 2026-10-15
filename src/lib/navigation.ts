"use client";
// URL state helpers on top of next/navigation. Pages keep filters and tabs in the query string so views are
// shareable and survive a refresh.
import { useParams, usePathname as useRawPathname, useRouter as useNextRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { stripTenant, withTenant } from "./tenantPath";

/** The workspace address in the current URL (/acme/...), or null outside workspace pages. */
export function useTenantSlug(): string | null {
  const params = useParams<{ tenant?: string | string[] }>();
  const value = params?.tenant;
  return typeof value === "string" ? value : null;
}

/** Turns app paths ("/billing") into this workspace's URLs ("/acme/billing"). */
export function useTenantHref() {
  const slug = useTenantSlug();
  return useCallback((href: string) => withTenant(slug, href), [slug]);
}

/** next/navigation's router, with app paths prefixed by the current workspace. */
export function useRouter() {
  const router = useNextRouter();
  const toHref = useTenantHref();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(toHref(href), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(toHref(href), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(toHref(href), options),
    }),
    [router, toHref]
  );
}

/** The current path without the workspace prefix ("/acme/billing/12" -> "/billing/12"), for comparisons. */
export function usePathname() {
  const pathname = useRawPathname();
  const slug = useTenantSlug();
  return stripTenant(slug, pathname);
}

type ParamsInit = URLSearchParams | Record<string, string | number | null | undefined>;
type ParamsUpdate = ParamsInit | ((current: URLSearchParams) => ParamsInit);

function toSearch(init: ParamsInit) {
  if (init instanceof URLSearchParams) return new URLSearchParams(init);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(init)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  return search;
}

/**
 * [params, setParams] like react-router's useSearchParams. setParams replaces the query string
 * (pass a function to derive it from the current one). History entries are replaced, not pushed, by default.
 */
export function useSearchParamsState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setParams = useCallback(
    (update: ParamsUpdate, { push = false }: { push?: boolean } = {}) => {
      const current = new URLSearchParams(params.toString());
      const next = toSearch(typeof update === "function" ? update(current) : update);
      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      if (push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [params, pathname, router]
  );

  return [params, setParams] as const;
}

/** Sets or clears one query parameter, keeping the others. */
export function useSearchParam(name: string) {
  const [params, setParams] = useSearchParamsState();
  const value = params.get(name);
  const setValue = useCallback(
    (next: string | number | null | undefined) =>
      setParams(current => {
        if (next === null || next === undefined || next === "") current.delete(name);
        else current.set(name, String(next));
        return current;
      }),
    [name, setParams]
  );
  return [value, setValue] as const;
}

/** True when `href` is the current page (or, unless `exact`, a parent of it). */
export function useIsActive(href: string, exact = false) {
  const pathname = usePathname();
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
