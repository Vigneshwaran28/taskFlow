"use client";
// Unknown addresses inside a workspace (/acme/nope): a 404 that keeps the app around it, so people stay in their workspace.
import Link from "@/components/navigation/Link";
import { Compass, Home } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { buttonClass } from "@/components/ui/Button";
import { useSiteTitle } from "@/features/auth";

export default function Page() {
  const siteTitle = useSiteTitle();
  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <p aria-hidden="true" className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-7xl font-bold tracking-tight text-transparent">
        404
      </p>
      <div className="rounded-full bg-accent p-3">
        <Compass className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">This page isn&apos;t here</h1>
        <p className="text-sm text-muted-foreground">
          {siteTitle} has no page at this address. It may have moved, or the module isn&apos;t part of your workspace. Use the menu or search (Ctrl K) to find what you need.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonClass("primary", "md")}>
          <Home className="h-4 w-4" aria-hidden="true" />
          Workspace home
        </Link>
        <BackButton />
      </div>
    </div>
  );
}
