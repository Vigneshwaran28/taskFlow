"use client";
// next/link with workspace-scoped URLs: inside a workspace (/acme/...), app paths like "/billing" become
// "/acme/billing". Public paths (/login, /track, /q, ...) and external URLs pass through unchanged.
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useTenantHref } from "@/lib/navigation";

type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ href, ...props }: LinkProps) {
  const toHref = useTenantHref();
  const resolved = typeof href === "string" ? toHref(href) : href.pathname ? { ...href, pathname: toHref(href.pathname) } : href;
  return <NextLink href={resolved} {...props} />;
}
