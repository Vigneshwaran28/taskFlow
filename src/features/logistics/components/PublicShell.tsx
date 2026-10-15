// Chrome for the public tracking pages: no app shell, just a light header and centred content.
import Link from "@/components/navigation/Link";
import type { ReactNode } from "react";
import { Truck } from "lucide-react";

export function PublicShell({ company, children }: { company?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-4 w-4" aria-hidden="true" />
          </span>
          <Link href="/track" className="truncate font-semibold hover:underline">
            {company ?? "Shipment tracking"}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
